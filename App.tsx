import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { findActiveTimestampedLyric, parseTimestampedLyrics } from './src/domain/lrc';
import {
  hasLyricDocumentErrors,
  lyricDocumentFromLrc,
  lyricDocumentToLrc,
  validateLyricDocument,
  type LyricDocument,
  type LyricLanguage,
} from './src/domain/lyricDocuments';
import { deleteLyricDocument, loadLyricDocuments, saveLyricDocument } from './src/storage/LyricDocumentStore';
import { listVerifiedWhisperModels } from './src/services/WhisperModelCatalog';
import { WhisperOnDeviceService, TranscriptionCancelledError, type TranscriptionProgress, type TranscriptionLanguage } from './src/services/WhisperOnDeviceService';
import { WhisperRnRuntime } from './src/services/WhisperRnRuntime';
import type { LyricSource } from './src/domain/lyricDocuments';
import { transcriptionDraftToLrc } from './src/domain/transcriptionLrc';
import { ExpoModelDownloadPort, ExpoModelFilePort } from './src/services/ExpoModelAdapters';
import { WhisperModelManager, type ModelInstallProgress } from './src/services/WhisperModelManager';

type AudioSelection = { uri: string; name: string; size?: number | null };
type SessionRecord = { id: string; prayerName: string; repetitions: number; target: number; completedAt: string };

const HISTORY_KEY = '@bhaktipath/session-history-v1';
const DEFAULT_LYRICS = '[00:00.00] Paste timestamped lyrics here\n[00:05.00] Example: each line starts with [mm:ss.xx]';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function App() {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [audio, setAudio] = useState<AudioSelection | null>(null);
  const [prayerName, setPrayerName] = useState('My Sadhana');
  const [targetText, setTargetText] = useState('5');
  const [lyricsText, setLyricsText] = useState(DEFAULT_LYRICS);
  const [completed, setCompleted] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [lyricDocuments, setLyricDocuments] = useState<LyricDocument[]>([]);
  const [lyricLanguage, setLyricLanguage] = useState<LyricLanguage>('hi');
  const [currentLyricDocumentId, setCurrentLyricDocumentId] = useState<string | null>(null);
  const [lyricIssues, setLyricIssues] = useState<ReturnType<typeof validateLyricDocument>>([]);
  const verifiedWhisperModels = useMemo(() => listVerifiedWhisperModels(), []);
  const modelManager = useMemo(
    () => new WhisperModelManager(new ExpoModelFilePort(), new ExpoModelDownloadPort()),
    [],
  );
  const whisperArtifact = verifiedWhisperModels[0];
  const whisperModelPath = whisperArtifact && FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}models/${whisperArtifact.id}.bin`
    : null;
  const transcriptionService = useMemo(() => new WhisperOnDeviceService(
    new WhisperRnRuntime(),
    async () => {
      if (!whisperArtifact || !whisperModelPath) return null;
      const files = new ExpoModelFilePort();
      try {
        if (!(await files.exists(whisperModelPath))) return null;
        const [size, digest] = await Promise.all([files.size(whisperModelPath), files.sha256(whisperModelPath)]);
        if (size !== whisperArtifact.expectedBytes || digest !== whisperArtifact.sha256.toLowerCase()) {
          await files.delete(whisperModelPath);
          return null;
        }
        return whisperModelPath;
      } catch {
        return null;
      }
    },
  ), [whisperArtifact, whisperModelPath]);
  const [modelInstallProgress, setModelInstallProgress] = useState<ModelInstallProgress | null>(null);
  const [modelInstallBusy, setModelInstallBusy] = useState(false);
  const [modelInstalled, setModelInstalled] = useState(false);
  const [modelInstallError, setModelInstallError] = useState<string | null>(null);
  const [transcriptionBusy, setTranscriptionBusy] = useState(false);
  const [transcriptionRequestId, setTranscriptionRequestId] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress | null>(null);
  const [transcriptionNotice, setTranscriptionNotice] = useState<string | null>(null);
  const [lyricsSource, setLyricsSource] = useState<LyricSource>('manual');
  const [tab, setTab] = useState<'home' | 'library' | 'practice' | 'history' | 'settings'>('home');
  const [playerScreen, setPlayerScreen] = useState(false);
  const lyricsScrollRef = useRef<React.ElementRef<typeof ScrollView> | null>(null);
  const lyricLineOffsets = useRef<Record<number, number>>({});
  const finishHandled = useRef(false);

  const target = Math.max(1, Math.min(1080, Number.parseInt(targetText, 10) || 1));
  const timestampedLyrics = useMemo(() => parseTimestampedLyrics(lyricsText), [lyricsText]);
  const activeLyric = useMemo(
    () => findActiveTimestampedLyric(timestampedLyrics, status.currentTime),
    [timestampedLyrics, status.currentTime],
  );
  const activeLyricIndex = useMemo(() => {
    let activeIndex = -1;
    for (let index = 0; index < timestampedLyrics.length; index += 1) {
      if (timestampedLyrics[index].time > status.currentTime) break;
      activeIndex = index;
    }
    return activeIndex;
  }, [timestampedLyrics, status.currentTime]);

  useEffect(() => {
    if (!playerScreen || activeLyricIndex < 0) return;
    const offset = lyricLineOffsets.current[activeLyricIndex];
    if (offset !== undefined) {
      lyricsScrollRef.current?.scrollTo({ y: Math.max(0, offset - 72), animated: true });
    }
  }, [playerScreen, activeLyricIndex]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => Alert.alert('Audio setup', 'Audio mode could not be configured on this device.'));
    void AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw) as SessionRecord[]);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const checkInstalledModel = async () => {
      if (!whisperArtifact || !whisperModelPath) return;
      try {
        const files = new ExpoModelFilePort();
        if (!(await files.exists(whisperModelPath))) return;
        const [size, digest] = await Promise.all([
          files.size(whisperModelPath),
          files.sha256(whisperModelPath),
        ]);
        if (active && size === whisperArtifact.expectedBytes && digest === whisperArtifact.sha256.toLowerCase()) {
          setModelInstalled(true);
          setModelInstallProgress({ phase: 'ready', fraction: 1 });
        } else if (active) {
          await files.delete(whisperModelPath);
        }
      } catch {
        if (active) setModelInstallError('Could not verify the local model. Retry installation to repair it.');
      }
    };
    void checkInstalledModel();
    return () => { active = false; };
  }, [whisperArtifact, whisperModelPath]);

  useEffect(() => {
    void loadLyricDocuments().then(setLyricDocuments).catch(() =>
      Alert.alert('Lyrics library unavailable', 'Saved lyrics could not be loaded from this device.'),
    );
  }, []);

  useEffect(() => {
    if (!status.didJustFinish) {
      finishHandled.current = false;
      return;
    }
    if (finishHandled.current || !sessionStarted) return;
    finishHandled.current = true;
    const nextCompleted = Math.min(target, completed + 1);
    setCompleted(nextCompleted);

    if (nextCompleted >= target) {
      setSessionStarted(false);
      player.setActiveForLockScreen(false);
      const record: SessionRecord = {
        id: `${Date.now()}`,
        prayerName: prayerName.trim() || 'Untitled Sadhana',
        repetitions: nextCompleted,
        target,
        completedAt: new Date().toISOString(),
      };
      setHistory((current) => {
        const updated = [record, ...current].slice(0, 200);
        void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(() =>
          Alert.alert('History not saved', 'The session finished, but local history could not be saved.'),
        );
        return updated;
      });
      Alert.alert('Sadhana complete', `Completed ${nextCompleted} of ${target} repetitions.`);
      return;
    }

    player.seekTo(0);
    player.play();
  }, [status.didJustFinish, sessionStarted, completed, target, player, prayerName]);

  const installWhisperModel = async () => {
    if (!whisperArtifact || !whisperModelPath || modelInstallBusy) return;
    setModelInstallBusy(true);
    setModelInstallError(null);
    setModelInstallProgress({ phase: 'checking' });
    try {
      await modelManager.ensureInstalled(whisperArtifact, whisperModelPath, setModelInstallProgress);
      setModelInstalled(true);
      Alert.alert('Model ready', 'The multilingual Whisper model is installed and its file size and SHA-256 were verified. Transcription runtime integration is a separate next step.');
    } catch (error) {
      setModelInstalled(false);
      setModelInstallError(error instanceof Error ? error.message : 'Model installation failed. Please retry.');
    } finally {
      setModelInstallBusy(false);
    }
  };

  const cancelWhisperModelDownload = async () => {
    try {
      await modelManager.cancelDownload();
    } catch {
      setModelInstallError('Cancellation could not complete cleanly. Retry or reinstall the model.');
    }
  };

  const deleteWhisperModel = async () => {
    if (!whisperModelPath || modelInstallBusy) return;
    Alert.alert('Remove downloaded model?', 'This removes the on-device Whisper model. It does not delete your recordings or saved lyrics.', [
      { text: 'Keep model', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void modelManager.deleteInstalledModel(whisperModelPath).then(() => {
            setModelInstalled(false);
            setModelInstallProgress(null);
            setModelInstallError(null);
          }).catch(() => setModelInstallError('Could not remove the model file.'));
        },
      },
    ]);
  };

  const generateLyricsOnDevice = async () => {
    if (!audio) {
      Alert.alert('Choose a recording', 'Select a local audio recording before generating lyrics.');
      return;
    }
    if (!modelInstalled || !whisperArtifact || !whisperModelPath) {
      Alert.alert('Model required', 'Download and verify the Whisper model before generating lyrics.');
      return;
    }
    if (lyricLanguage === 'sa') {
      Alert.alert('Sanskrit not yet validated', 'Automatic Sanskrit transcription is disabled until a separate accuracy benchmark is completed. You can still paste or edit Sanskrit LRC lyrics below.');
      return;
    }
    if (lyricLanguage === 'other') {
      Alert.alert('Choose a supported language', 'Automatic transcription currently supports Gujarati, Hindi, and English.');
      return;
    }
    const languageMap: Record<Exclude<LyricLanguage, 'sa' | 'other'>, TranscriptionLanguage> = {
      gu: 'gu-IN', hi: 'hi-IN', en: 'en-US',
    };
    const requestId = `transcription-${Date.now()}`;
    setTranscriptionRequestId(requestId);
    setTranscriptionBusy(true);
    setTranscriptionProgress({ requestId, phase: 'preparing', message: 'Preparing on-device model.' });
    setTranscriptionNotice(null);
    try {
      const draft = await transcriptionService.transcribe({
        requestId,
        audioUri: audio.uri,
        language: languageMap[lyricLanguage],
        mode: 'on-device',
      }, setTranscriptionProgress);
      const lrc = transcriptionDraftToLrc(draft);
      if (!lrc.trim()) throw new Error('The transcription returned no usable timed segments. Try another recording or use the manual LRC editor.');
      setLyricsText(lrc);
      setCurrentLyricDocumentId(null);
      setLyricsSource('generated-local');
      setLyricIssues([]);
      setTranscriptionNotice(draft.warnings.join(' '));
      Alert.alert('Draft generated', 'The on-device transcript is now in the editor. Review and correct all words and timestamps before saving. Nothing has been saved yet.');
    } catch (error) {
      if (error instanceof TranscriptionCancelledError) {
        setTranscriptionNotice('Transcription cancelled. No draft was saved.');
      } else {
        setTranscriptionNotice(error instanceof Error ? error.message : 'On-device transcription failed.');
      }
    } finally {
      setTranscriptionBusy(false);
      setTranscriptionRequestId(null);
      setTranscriptionProgress(null);
    }
  };

  const cancelLyricsTranscription = async () => {
    if (!transcriptionRequestId) return;
    try {
      await transcriptionService.cancel(transcriptionRequestId);
    } catch {
      setTranscriptionNotice('Cancellation was requested, but the native runtime did not stop cleanly.');
    }
  };

  const saveLyrics = async (markReviewed: boolean) => {
    if (!audio) {
      Alert.alert('Choose a recording', 'Select the recording associated with these lyrics before saving.');
      return;
    }
    const now = new Date().toISOString();
    const existing = lyricDocuments.find((document) => document.id === currentLyricDocumentId);
    if (existing && existing.audio.name !== audio.name) {
      Alert.alert('Recording mismatch', `These lyrics belong to “${existing.audio.name}”. Select that recording before saving changes.`);
      return;
    }
    let document = lyricDocumentFromLrc({
      id: currentLyricDocumentId ?? `lyrics-${Date.now()}`,
      title: prayerName.trim(),
      language: lyricLanguage,
      audio: { name: audio.name, uri: audio.uri },
      source: lyricsSource,
      now,
    }, lyricsText);
    if (existing) {
      document = { ...document, createdAt: existing.createdAt, source: existing.source };
    }
    const issues = validateLyricDocument(document, status.duration > 0 ? status.duration * 1000 : null);
    setLyricIssues(issues);
    if (markReviewed && hasLyricDocumentErrors(issues)) {
      Alert.alert('Review needed', issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message).join('\n'));
      return;
    }
    if (markReviewed) {
      document = { ...document, reviewStatus: 'reviewed', reviewedAt: now };
    } else {
      document = { ...document, reviewStatus: 'draft', reviewedAt: undefined };
    }
    try {
      const updated = await saveLyricDocument(document);
      setLyricDocuments(updated);
      setCurrentLyricDocumentId(document.id);
      Alert.alert(
        markReviewed ? 'Lyrics reviewed and saved' : 'Draft saved',
        issues.some((issue) => issue.severity === 'warning')
          ? 'Saved locally. Please review the warnings shown below.'
          : 'Saved on this device and available offline.',
      );
    } catch {
      Alert.alert('Could not save lyrics', 'Local storage failed. Please try again.');
    }
  };

  const loadSavedLyrics = (document: LyricDocument) => {
    setCurrentLyricDocumentId(document.id);
    setLyricsSource(document.source);
    setPrayerName(document.title);
    setLyricLanguage(document.language);
    setLyricsText(lyricDocumentToLrc(document));
    setLyricIssues(validateLyricDocument(document));
    setTab('practice');
    if (!audio || audio.name !== document.audio.name) {
      Alert.alert('Recording association', `These lyrics are associated with “${document.audio.name}”. Select that recording in Practice to synchronize playback.`);
    }
  };

  const confirmDeleteLyrics = (document: LyricDocument) => {
    Alert.alert('Delete saved lyrics?', `Delete “${document.title}” from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteLyricDocument(document.id).then(setLyricDocuments).catch(() =>
            Alert.alert('Delete failed', 'The saved lyrics could not be deleted.'),
          );
          if (currentLyricDocumentId === document.id) setCurrentLyricDocumentId(null);
        },
      },
    ]);
  };

  const chooseAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const selected = result.assets[0];
      const nextAudio = { uri: selected.uri, name: selected.name, size: selected.size };
      player.pause();
      player.replace({ uri: nextAudio.uri, name: nextAudio.name });
      setAudio(nextAudio);
      setCompleted(0);
      setSessionStarted(false);
      finishHandled.current = false;
    } catch {
      Alert.alert('Could not open audio', 'Please choose a supported audio file from your phone.');
    }
  };

  const startOrPause = () => {
    if (!audio) {
      Alert.alert('Choose a recording', 'Select a local audio file before starting your Sadhana.');
      return;
    }
    if (status.playing) {
      player.pause();
      return;
    }
    if (!sessionStarted) {
      setCompleted(0);
      setSessionStarted(true);
      void player.seekTo(0);
    }
    finishHandled.current = false;
    player.setActiveForLockScreen(true, {
      title: prayerName.trim() || audio.name,
      artist: 'BhaktiPath',
      albumTitle: 'Sadhana',
    });
    player.play();
  };

  const stopSession = () => {
    player.pause();
    player.seekTo(0);
    player.setActiveForLockScreen(false);
    setSessionStarted(false);
    setCompleted(0);
    finishHandled.current = false;
  };

  const progress = target > 0 ? Math.min(1, completed / target) : 0;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>ॐ</Text></View>
          <View>
            <Text style={styles.brand}>BhaktiPath</Text>
            <Text style={styles.tagline}>A calmer path, one repetition at a time</Text>
          </View>
        </View>

        {playerScreen ? (
          <>
            <TouchableOpacity style={styles.backButton} onPress={() => setPlayerScreen(false)}>
              <Text style={styles.backButtonText}>‹  Back to Practice</Text>
            </TouchableOpacity>
            <View style={styles.card}>
              <Text style={styles.playerScreenEyebrow}>CHANTING PLAYER</Text>
              <Text style={styles.playerScreenTitle}>{prayerName.trim() || audio?.name || 'Your Sadhana'}</Text>
              <Text style={styles.helper}>{audio ? audio.name : 'Choose a recording in Practice to begin.'}</Text>
              <View style={styles.liveLyricStage}>
                <Text style={styles.lyricCaption}>{status.playing ? 'NOW CHANTING' : 'CURRENT LYRIC'}</Text>
                <Text style={styles.liveLyricText}>{activeLyric || (timestampedLyrics.length ? 'The first lyric will appear at its timestamp.' : 'Add timestamped lyrics in Practice to follow along.')}</Text>
                <Text style={styles.liveLyricMeta}>{activeLyricIndex >= 0 ? `Line ${activeLyricIndex + 1} of ${timestampedLyrics.length}` : 'Waiting for lyric timestamp'}</Text>
              </View>
              <Text style={styles.sectionTitle}>Up next</Text>
              {timestampedLyrics.slice(Math.max(0, activeLyricIndex + 1), Math.max(0, activeLyricIndex + 1) + 2).length > 0 ? (
                timestampedLyrics.slice(Math.max(0, activeLyricIndex + 1), Math.max(0, activeLyricIndex + 1) + 2).map((line, index) => (
                  <View key={`${line.time}-${index}`} style={styles.upcomingLyricRow}>
                    <Text style={styles.upcomingTime}>{formatTime(line.time)}</Text>
                    <Text style={styles.upcomingLyricText}>{line.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.helper}>No upcoming lyric lines are available.</Text>
              )}
              <Text style={styles.sectionTitle}>Full lyrics</Text>
              {timestampedLyrics.length > 0 ? (
                <ScrollView
                  ref={lyricsScrollRef}
                  style={styles.fullLyricsScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  {timestampedLyrics.map((line, index) => (
                    <View
                      key={`${line.time}-${index}`}
                      onLayout={(event) => {
                        lyricLineOffsets.current[index] = event.nativeEvent.layout.y;
                        if (index === activeLyricIndex) {
                          lyricsScrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 72), animated: false });
                        }
                      }}
                      style={[styles.fullLyricRow, index === activeLyricIndex && styles.fullLyricRowActive]}
                    >
                      <Text style={[styles.fullLyricTime, index === activeLyricIndex && styles.fullLyricTimeActive]}>{formatTime(line.time)}</Text>
                      <Text style={[styles.fullLyricText, index === activeLyricIndex && styles.fullLyricTextActive]}>{line.text}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.helper}>No valid LRC timestamps yet. Add lyrics in Practice.</Text>
              )}
            </View>
            <View style={styles.playerCard}>
              <View style={styles.playerTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerEyebrow}>SADHANA PROGRESS</Text>
                  <Text style={styles.playerTitle}>{completed} <Text style={styles.playerSub}>of {target} repetitions</Text></Text>
                </View>
                <View style={styles.omCircle}><Text style={styles.omCircleText}>ॐ</Text></View>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
              <View style={styles.timeRow}><Text style={styles.timeText}>{formatTime(status.currentTime)}</Text><Text style={styles.timeText}>{formatTime(status.duration)}</Text></View>
              <View style={styles.controls}>
                <TouchableOpacity style={styles.playButton} onPress={startOrPause}>
                  <Text style={styles.playButtonText}>{status.playing ? 'Ⅱ  Pause' : completed > 0 && sessionStarted ? '▶  Resume' : '▶  Start Sadhana'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopButton} onPress={stopSession}>
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : tab === 'home' ? (
          <View style={styles.card}>
            <Text style={styles.dashboardEyebrow}>YOUR DAILY PRACTICE</Text>
            <Text style={styles.dashboardTitle}>Pause. Listen. Chant.</Text>
            <Text style={styles.dashboardBody}>A calm space for your daily sadhana. Your recordings and session history stay on this device.</Text>
            <View style={styles.dashboardMetric}>
              <Text style={styles.dashboardMetricValue}>{completed}/{target}</Text>
              <Text style={styles.helper}>Repetitions completed in the current practice</Text>
            </View>
            <View style={styles.dashboardMetric}>
              <Text style={styles.dashboardMetricValue}>{history.length}</Text>
              <Text style={styles.helper}>Completed sessions saved on this device</Text>
            </View>
            <TouchableOpacity style={styles.primaryLightButton} onPress={() => setTab('practice')}>
              <Text style={styles.primaryLightButtonText}>Continue to Practice →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setTab('history')}>
              <Text style={styles.secondaryButtonText}>View practice history</Text>
            </TouchableOpacity>
          </View>
        ) : tab === 'library' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My Library</Text>
            <Text style={styles.helper}>Saved lyric documents are stored locally. Audio picker URIs may be temporary, so reselect the associated recording if playback cannot find it after restart.</Text>
            <TouchableOpacity style={styles.primaryLightButton} onPress={() => { setCurrentLyricDocumentId(null); setLyricsText(''); setLyricIssues([]); setTab('practice'); }}>
              <Text style={styles.primaryLightButtonText}>＋ Create lyric document</Text>
            </TouchableOpacity>
            {lyricDocuments.length === 0 ? (
              <Text style={styles.emptyHistory}>No saved lyric documents yet. Create one in Practice.</Text>
            ) : lyricDocuments.map((document) => (
              <View key={document.id} style={styles.savedLyricCard}>
                <Text style={styles.historyName}>{document.title || 'Untitled lyrics'}</Text>
                <Text style={styles.muted}>{document.audio.name} · {document.lines.length} lines · {document.language.toUpperCase()}</Text>
                <Text style={styles.muted}>{document.reviewStatus === 'reviewed' ? 'Reviewed' : 'Draft'} · Updated {new Date(document.updatedAt).toLocaleDateString()}</Text>
                <View style={styles.controls}>
                  <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => loadSavedLyrics(document)}>
                    <Text style={styles.secondaryButtonText}>Open / Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteLyricsButton} onPress={() => confirmDeleteLyrics(document)}>
                    <Text style={styles.deleteLyricsButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : tab === 'settings' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <Text style={styles.helper}>BhaktiPath is designed to work offline. Audio selection, lyrics drafts, and session history are currently kept locally; cloud transcription is not enabled.</Text>
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>Storage</Text>
              <Text style={styles.settingsValue}>On device</Text>
            </View>
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>Cloud uploads</Text>
              <Text style={styles.settingsValue}>Disabled</Text>
            </View>
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>Background audio</Text>
              <Text style={styles.settingsValue}>Configured; device testing required</Text>
            </View>
            <Text style={styles.helper}>Theme, language, and storage-management controls will be added in a later phase.</Text>
          </View>
        ) : tab === 'practice' ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>YOUR DAILY PRACTICE</Text>
              <Text style={styles.heroTitle}>Pause. Listen. Chant.</Text>
              <Text style={styles.heroBody}>Choose a recording, set your intention, and follow along at your own pace.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>1. Choose your prayer</Text>
              <Text style={styles.label}>Prayer / session name</Text>
              <TextInput value={prayerName} onChangeText={setPrayerName} style={styles.input} placeholder="e.g. Hanuman Chalisa" />
              <TouchableOpacity style={styles.secondaryButton} onPress={() => void chooseAudio()}>
                <Text style={styles.secondaryButtonText}>{audio ? 'Change audio recording' : '＋ Select audio from phone'}</Text>
              </TouchableOpacity>
              {audio ? (
                <View style={styles.audioInfo}>
                  <Text style={styles.audioIcon}>♫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.audioName} numberOfLines={2}>{audio.name}</Text>
                    <Text style={styles.muted}>{status.isLoaded ? `Duration ${formatTime(status.duration)}` : 'Recording selected'}</Text>
                  </View>
                  <Text style={styles.ready}>READY</Text>
                </View>
              ) : <Text style={styles.helper}>Audio stays on your device. No account or upload is required.</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>2. Set your intention</Text>
              <Text style={styles.label}>Number of repetitions</Text>
              <View style={styles.countRow}>
                {[5, 11, 21, 51, 108].map((count) => (
                  <TouchableOpacity key={count} style={[styles.countChip, target === count && styles.countChipActive]} onPress={() => setTargetText(String(count))}>
                    <Text style={[styles.countChipText, target === count && styles.countChipTextActive]}>{count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={targetText} onChangeText={(value) => setTargetText(value.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" style={styles.input} accessibilityLabel="Custom repetition count" />
              <Text style={styles.helper}>Choose 1–1080 repetitions. One repetition is counted after the entire recording finishes naturally.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Generate lyrics on this device</Text>
              <Text style={styles.helper}>Automatic transcription runs on this device only. BhaktiPath never uploads your recording or silently falls back to cloud processing.</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Whisper model</Text>
                <Text style={styles.settingsValue}>{!whisperArtifact ? 'Not ready' : modelInstalled ? 'Installed · verified' : 'Not installed'}</Text>
              </View>
              {!whisperArtifact ? (
                <Text style={styles.lyricIssueWarning}>No model artifact is available for download because source, license, and SHA-256 verification is required. Continue with the offline LRC editor below.</Text>
              ) : (
                <>
                  <Text style={styles.helper}>{whisperArtifact.displayName} · about 74 MiB. Download only on request. Audio is not uploaded. A network connection is needed for the initial download.</Text>
                  {modelInstallProgress?.phase === 'downloading' ? (
                    <View style={styles.modelProgressTrack}>
                      <View style={[styles.modelProgressFill, { width: `${Math.round((modelInstallProgress.fraction ?? 0) * 100)}%` }]} />
                    </View>
                  ) : null}
                  {modelInstallProgress?.phase === 'downloading' ? (
                    <Text style={styles.muted}>Downloading {Math.round((modelInstallProgress.fraction ?? 0) * 100)}% · {Math.round((modelInstallProgress.receivedBytes ?? 0) / 1024 / 1024)} MiB received</Text>
                  ) : modelInstallProgress?.phase === 'verifying' ? (
                    <Text style={styles.muted}>Verifying exact file size and SHA-256…</Text>
                  ) : null}
                  {modelInstallError ? <Text style={styles.lyricIssueError}>{modelInstallError}</Text> : null}
                  {modelInstalled ? (
                    <View style={styles.controls}>
                      <View style={[styles.secondaryButton, { flex: 1 }]}><Text style={styles.secondaryButtonText}>Model installed and verified</Text></View>
                      <TouchableOpacity style={styles.deleteLyricsButton} onPress={deleteWhisperModel}><Text style={styles.deleteLyricsButtonText}>Remove</Text></TouchableOpacity>
                    </View>
                  ) : modelInstallBusy ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => void cancelWhisperModelDownload()}><Text style={styles.secondaryButtonText}>Cancel download</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.primaryLightButton} onPress={() => void installWhisperModel()} disabled={!whisperModelPath}>
                      <Text style={styles.primaryLightButtonText}>Download model · ~74 MiB</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.muted}>Installation verifies expected byte size and SHA-256. Incomplete or invalid downloads are deleted.</Text>
                  {modelInstalled ? (
                    <>
                      <TouchableOpacity style={[styles.primaryLightButton, (!audio || transcriptionBusy) && styles.disabledAction]} onPress={() => void generateLyricsOnDevice()} disabled={!audio || transcriptionBusy}>
                        <Text style={styles.primaryLightButtonText}>{transcriptionBusy ? 'Transcribing on this device…' : 'Generate draft on this device'}</Text>
                      </TouchableOpacity>
                      {transcriptionBusy ? (
                        <>
                          <Text style={styles.muted}>{transcriptionProgress?.message ?? (transcriptionProgress?.phase === 'transcribing' ? 'Transcribing locally…' : 'Preparing local transcription…')}{transcriptionProgress?.fraction != null ? ` ${Math.round(transcriptionProgress.fraction * 100)}%` : ''}</Text>
                          <TouchableOpacity style={styles.secondaryButton} onPress={() => void cancelLyricsTranscription()}><Text style={styles.secondaryButtonText}>Cancel transcription</Text></TouchableOpacity>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {transcriptionNotice ? <Text style={styles.lyricIssueWarning}>{transcriptionNotice}</Text> : null}
                </>
              )}
              <Text style={styles.muted}>Language selection and timestamp editing are available below. Generated text must be reviewed before saving.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>3. Follow the lyrics</Text>
              <Text style={styles.helper}>Paste or edit LRC-style timestamps. Example: [00:12.50] your lyric line. Generated lyrics appear here as an editable draft and are never saved automatically.</Text>
              <Text style={styles.label}>Lyrics language</Text>
              <View style={styles.countRow}>
                {([
                  ['gu', 'Gujarati'],
                  ['hi', 'Hindi'],
                  ['sa', 'Sanskrit'],
                  ['en', 'English'],
                  ['other', 'Other'],
                ] as const).map(([value, label]) => (
                  <TouchableOpacity key={value} style={[styles.countChip, lyricLanguage === value && styles.countChipActive]} onPress={() => setLyricLanguage(value)}>
                    <Text style={[styles.countChipText, lyricLanguage === value && styles.countChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helper}>Automatic generation is available for Gujarati, Hindi, and English. Sanskrit remains manual until a separate accuracy benchmark is completed.</Text>
              <TextInput value={lyricsText} onChangeText={(value) => { setLyricsText(value); setLyricIssues([]); }} multiline textAlignVertical="top" style={styles.lyricsInput} placeholder="[00:00.00] First line\n[00:05.00] Second line" />
              <View style={styles.controls}>
                <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => void saveLyrics(false)}>
                  <Text style={styles.secondaryButtonText}>Save Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryLightButton, { flex: 1 }]} onPress={() => void saveLyrics(true)}>
                  <Text style={styles.primaryLightButtonText}>Review & Save</Text>
                </TouchableOpacity>
              </View>
              {currentLyricDocumentId ? <Text style={styles.muted}>Editing saved document · ID: {currentLyricDocumentId}</Text> : <Text style={styles.muted}>New lyric document · not saved yet</Text>}
              {lyricIssues.map((issue, index) => (
                <Text key={`${issue.code}-${issue.index ?? 'doc'}-${index}`} style={issue.severity === 'error' ? styles.lyricIssueError : styles.lyricIssueWarning}>
                  {issue.severity === 'error' ? 'Error: ' : 'Review: '}{issue.message}
                </Text>
              ))}
              <View style={styles.lyricPanel}>
                <Text style={styles.lyricCaption}>NOW CHANTING</Text>
                <Text style={styles.activeLyric}>{activeLyric || 'Your synchronized lyric will appear here'}</Text>
                <Text style={styles.muted}>{timestampedLyrics.length ? `${timestampedLyrics.length} timestamped lines detected` : 'No valid timestamps detected yet'}</Text>
              </View>
            </View>

            <View style={styles.playerCard}>
              <View style={styles.playerTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerEyebrow}>SADHANA PROGRESS</Text>
                  <Text style={styles.playerTitle}>{completed} <Text style={styles.playerSub}>of {target} repetitions</Text></Text>
                </View>
                <View style={styles.omCircle}><Text style={styles.omCircleText}>ॐ</Text></View>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
              <View style={styles.timeRow}><Text style={styles.timeText}>{formatTime(status.currentTime)}</Text><Text style={styles.timeText}>{formatTime(status.duration)}</Text></View>
              <View style={styles.controls}>
                <TouchableOpacity style={styles.playButton} onPress={startOrPause}>
                  <Text style={styles.playButtonText}>{status.playing ? 'Ⅱ  Pause' : completed > 0 && sessionStarted ? '▶  Resume' : '▶  Start Sadhana'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopButton} onPress={stopSession}>
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperLight}>Background playback and lock-screen controls are enabled in the native build configuration.</Text>
              <TouchableOpacity style={styles.openPlayerButton} onPress={() => setPlayerScreen(true)}>
                <Text style={styles.openPlayerButtonText}>Open Chanting Player with live lyrics →</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your practice history</Text>
            <Text style={styles.helper}>Sessions are stored locally on this device.</Text>
            {history.length === 0 ? <Text style={styles.emptyHistory}>Your completed sessions will appear here.</Text> : history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{item.prayerName}</Text>
                  <Text style={styles.muted}>{new Date(item.completedAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.historyCount}>{item.repetitions}/{item.target}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.footer}>BhaktiPath · Offline-first · Made for mindful practice</Text>
      </ScrollView>
      {!playerScreen && <View style={styles.bottomNav}>
        {([
          ['home', '⌂', 'Home'],
          ['library', '♫', 'Library'],
          ['practice', 'ॐ', 'Practice'],
          ['history', '◷', 'History'],
          ['settings', '⚙', 'Settings'],
        ] as const).map(([key, glyph, label]) => (
          <TouchableOpacity
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === key }}
            accessibilityLabel={label}
            style={[styles.bottomNavItem, tab === key && styles.bottomNavActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.bottomNavGlyph, tab === key && styles.bottomNavGlyphActive]}>{glyph}</Text>
            <Text style={[styles.bottomNavLabel, tab === key && styles.bottomNavLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8EC' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 2 },
  backButtonText: { color: '#8D411F', fontSize: 14, fontWeight: '800' },
  playerScreenEyebrow: { color: '#B06B3E', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  playerScreenTitle: { color: '#54291A', fontSize: 23, fontWeight: '800' },
  liveLyricStage: { backgroundColor: '#FFF1DE', borderRadius: 16, padding: 20, minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 10 },
  liveLyricText: { color: '#71331B', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 32 },
  liveLyricMeta: { color: '#A4775B', fontSize: 10, fontWeight: '600' },
  upcomingLyricRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1E5DA' },
  upcomingTime: { width: 44, color: '#A4775B', fontSize: 11, fontVariant: ['tabular-nums'] },
  upcomingLyricText: { flex: 1, color: '#7B5A48', fontSize: 14, lineHeight: 21 },
  fullLyricsScroll: { maxHeight: 270, borderWidth: 1, borderColor: '#F0E3D6', borderRadius: 12, padding: 6 },
  fullLyricRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  fullLyricRowActive: { backgroundColor: '#FCE5CC' },
  fullLyricTime: { width: 42, color: '#A4775B', fontSize: 10, paddingTop: 2 },
  fullLyricTimeActive: { color: '#8D411F', fontWeight: '800' },
  fullLyricText: { flex: 1, color: '#7B5A48', fontSize: 13, lineHeight: 20 },
  fullLyricTextActive: { color: '#71331B', fontWeight: '800' },
  openPlayerButton: { borderWidth: 1, borderColor: '#E4A36B', borderRadius: 11, padding: 12, alignItems: 'center' },
  openPlayerButtonText: { color: '#F5D8C3', fontWeight: '800', fontSize: 12 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0E3D6', paddingTop: 7, paddingBottom: 5, paddingHorizontal: 3 },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, borderRadius: 10, gap: 2 },
  bottomNavActive: { backgroundColor: '#FFF0E0' },
  bottomNavGlyph: { color: '#9A8375', fontSize: 19, lineHeight: 22 },
  bottomNavGlyphActive: { color: '#A94F21' },
  bottomNavLabel: { color: '#9A8375', fontSize: 9, fontWeight: '600' },
  bottomNavLabelActive: { color: '#7D371A', fontWeight: '800' },
  dashboardEyebrow: { color: '#B06B3E', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  dashboardTitle: { color: '#54291A', fontSize: 25, fontWeight: '800' },
  dashboardBody: { color: '#7B5A48', lineHeight: 21, fontSize: 13 },
  dashboardMetric: { backgroundColor: '#FFF4E4', borderRadius: 12, padding: 13, gap: 3 },
  dashboardMetricValue: { color: '#7D371A', fontSize: 24, fontWeight: '800' },
  primaryLightButton: { backgroundColor: '#A94F21', borderRadius: 11, padding: 14, alignItems: 'center' },
  primaryLightButtonText: { color: '#FFFFFF', fontWeight: '800' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1E5DA' },
  settingsLabel: { color: '#54291A', fontSize: 13, fontWeight: '700', flex: 1 },
  settingsValue: { color: '#8A6A58', fontSize: 11, flex: 1, textAlign: 'right' },
  container: { padding: 18, paddingBottom: 36, gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  brandMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#A94F21', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#FFF8EC', fontSize: 27, fontWeight: '700' },
  brand: { color: '#572817', fontSize: 23, fontWeight: '800', letterSpacing: 0.2 },
  tagline: { color: '#916F5D', fontSize: 11, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#F2E5D5', borderRadius: 13, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFFFFF', elevation: 1 },
  tabText: { color: '#8A6A58', fontWeight: '600' },
  activeTabText: { color: '#7D371A' },
  hero: { backgroundColor: '#7D371A', borderRadius: 22, padding: 22, gap: 8 },
  eyebrow: { color: '#EEC9A6', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#FFF7E8', fontSize: 28, fontWeight: '800' },
  heroBody: { color: '#F6DDC8', lineHeight: 21, fontSize: 13 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, borderWidth: 1, borderColor: '#F0E3D6', gap: 11 },
  sectionTitle: { color: '#54291A', fontSize: 17, fontWeight: '800' },
  label: { color: '#7B5A48', fontSize: 12, fontWeight: '700', marginBottom: -5 },
  input: { borderWidth: 1, borderColor: '#E8D7C7', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, color: '#3E2B23', backgroundColor: '#FFFCF7', fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: '#C77A4B', borderRadius: 11, padding: 13, alignItems: 'center' },
  secondaryButtonText: { color: '#8D411F', fontWeight: '800' },
  disabledAction: { opacity: 0.5 },
  audioInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, backgroundColor: '#F8F1E8', borderRadius: 12 },
  audioIcon: { fontSize: 24, color: '#A94F21' },
  audioName: { color: '#4D3024', fontWeight: '700', fontSize: 12 },
  muted: { color: '#9A8375', fontSize: 11, marginTop: 3 },
  ready: { color: '#46744E', fontSize: 9, fontWeight: '800' },
  helper: { color: '#9A8375', fontSize: 11, lineHeight: 16 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  countChip: { minWidth: 45, borderWidth: 1, borderColor: '#E8D7C7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center' },
  countChipActive: { backgroundColor: '#A94F21', borderColor: '#A94F21' },
  countChipText: { color: '#855F4C', fontWeight: '700' },
  countChipTextActive: { color: '#FFFFFF' },
  modelProgressTrack: { height: 6, borderRadius: 5, backgroundColor: '#EAD9C9', overflow: 'hidden' },
  modelProgressFill: { height: 6, borderRadius: 5, backgroundColor: '#A94F21' },
  lyricsInput: { minHeight: 104, maxHeight: 190, borderWidth: 1, borderColor: '#E8D7C7', borderRadius: 11, padding: 12, color: '#4D3024', backgroundColor: '#FFFCF7', fontSize: 12, lineHeight: 18 },
  savedLyricCard: { borderWidth: 1, borderColor: '#F0E3D6', borderRadius: 12, padding: 12, gap: 6 },
  deleteLyricsButton: { borderWidth: 1, borderColor: '#D8B4A6', borderRadius: 11, paddingHorizontal: 14, justifyContent: 'center' },
  deleteLyricsButtonText: { color: '#A33E2D', fontWeight: '700' },
  lyricIssueError: { color: '#B42318', fontSize: 11, lineHeight: 16 },
  lyricIssueWarning: { color: '#8A5B12', fontSize: 11, lineHeight: 16 },
  lyricPanel: { backgroundColor: '#FFF4E4', borderRadius: 13, padding: 15, alignItems: 'center', gap: 7 },
  lyricCaption: { color: '#B06B3E', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  activeLyric: { color: '#71331B', fontSize: 19, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  playerCard: { backgroundColor: '#3E271E', borderRadius: 20, padding: 19, gap: 12 },
  playerTopRow: { flexDirection: 'row', alignItems: 'center' },
  playerEyebrow: { color: '#D9AD8B', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  playerTitle: { color: '#FFF4E8', fontSize: 26, fontWeight: '800', marginTop: 5 },
  playerSub: { color: '#D6B8A4', fontSize: 13, fontWeight: '500' },
  omCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#69432F', alignItems: 'center', justifyContent: 'center' },
  omCircleText: { color: '#F6D6B5', fontSize: 25 },
  progressTrack: { height: 6, borderRadius: 5, backgroundColor: '#694B3B', overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#E4A36B', borderRadius: 5 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: '#C9A995', fontSize: 10, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', gap: 9 },
  playButton: { flex: 1, backgroundColor: '#E4A36B', borderRadius: 12, padding: 14, alignItems: 'center' },
  playButtonText: { color: '#48271A', fontWeight: '900' },
  stopButton: { borderWidth: 1, borderColor: '#8B6A56', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  stopButtonText: { color: '#F5D8C3', fontWeight: '700' },
  helperLight: { color: '#C7A895', fontSize: 10, lineHeight: 15 },
  emptyHistory: { paddingVertical: 28, textAlign: 'center', color: '#9A8375', fontSize: 13 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1E5DA' },
  historyName: { color: '#54291A', fontSize: 14, fontWeight: '700' },
  historyCount: { color: '#A94F21', fontSize: 14, fontWeight: '800' },
  footer: { textAlign: 'center', color: '#B49A89', fontSize: 9, letterSpacing: 1, marginTop: 4 },
});