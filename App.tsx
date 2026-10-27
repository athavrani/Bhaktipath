import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
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
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { findActiveTimestampedLyric, parseTimestampedLyrics } from './src/domain/lrc';

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
  const [tab, setTab] = useState<'home' | 'library' | 'practice' | 'history' | 'settings'>('home');
  const finishHandled = useRef(false);

  const target = Math.max(1, Math.min(1080, Number.parseInt(targetText, 10) || 1));
  const timestampedLyrics = useMemo(() => parseTimestampedLyrics(lyricsText), [lyricsText]);
  const activeLyric = useMemo(
    () => findActiveTimestampedLyric(timestampedLyrics, status.currentTime),
    [timestampedLyrics, status.currentTime],
  );

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

        {tab === 'home' ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>YOUR DAILY PRACTICE</Text>
            <Text style={styles.heroTitle}>Pause. Listen. Chant.</Text>
            <Text style={styles.heroBody}>A calm space for your daily sadhana. Your recordings and session history stay on this device.</Text>
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
            <Text style={styles.helper}>Your current audio selection and lyrics are available in Practice. A persistent multi-recording library is planned for a later implementation phase.</Text>
            {audio ? (
              <View style={styles.audioInfo}>
                <Text style={styles.audioIcon}>♫</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.audioName} numberOfLines={2}>{audio.name}</Text>
                  <Text style={styles.muted}>{timestampedLyrics.length} timestamped lyric lines in the current draft</Text>
                </View>
              </View>
            ) : <Text style={styles.emptyHistory}>No recording selected yet.</Text>}
            <TouchableOpacity style={styles.primaryLightButton} onPress={() => setTab('practice')}>
              <Text style={styles.primaryLightButtonText}>{audio ? 'Open Practice' : 'Choose a recording'} →</Text>
            </TouchableOpacity>
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
              <Text style={styles.sectionTitle}>3. Follow the lyrics</Text>
              <Text style={styles.helper}>Paste LRC-style timestamps for synchronized highlighting. Example: [00:12.50] your lyric line. Timestamps must match your recording.</Text>
              <TextInput value={lyricsText} onChangeText={setLyricsText} multiline textAlignVertical="top" style={styles.lyricsInput} placeholder="[00:00.00] First line\n[00:05.00] Second line" />
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
      <View style={styles.bottomNav}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8EC' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0E3D6', paddingTop: 7, paddingBottom: 5, paddingHorizontal: 3 },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, borderRadius: 10, gap: 2 },
  bottomNavActive: { backgroundColor: '#FFF0E0' },
  bottomNavGlyph: { color: '#9A8375', fontSize: 19, lineHeight: 22 },
  bottomNavGlyphActive: { color: '#A94F21' },
  bottomNavLabel: { color: '#9A8375', fontSize: 9, fontWeight: '600' },
  bottomNavLabelActive: { color: '#7D371A', fontWeight: '800' },
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
  lyricsInput: { minHeight: 104, maxHeight: 190, borderWidth: 1, borderColor: '#E8D7C7', borderRadius: 11, padding: 12, color: '#4D3024', backgroundColor: '#FFFCF7', fontSize: 12, lineHeight: 18 },
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