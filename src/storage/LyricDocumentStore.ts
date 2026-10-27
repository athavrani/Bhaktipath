import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LyricDocument } from '../domain/lyricDocuments';

const STORAGE_KEY = '@bhaktipath/lyric-documents-v1';
const STORAGE_VERSION = 1;

interface LyricDocumentEnvelope {
  schemaVersion: typeof STORAGE_VERSION;
  documents: LyricDocument[];
}

/** Local-only storage. No network or cloud upload is performed by this service. */
export async function loadLyricDocuments(): Promise<LyricDocument[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!isEnvelope(parsed)) {
    throw new Error('Saved lyrics have an unsupported or invalid storage format.');
  }
  return parsed.documents;
}

/** Inserts or replaces a document by ID and updates its modification timestamp. */
export async function saveLyricDocument(document: LyricDocument): Promise<LyricDocument[]> {
  const current = await loadLyricDocuments();
  const saved: LyricDocument = {
    ...document,
    updatedAt: new Date().toISOString(),
  };
  const index = current.findIndex((item) => item.id === saved.id);
  const updated = [...current];
  if (index >= 0) updated[index] = saved;
  else updated.unshift(saved);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: STORAGE_VERSION,
    documents: updated,
  } satisfies LyricDocumentEnvelope));
  return updated;
}

export async function deleteLyricDocument(id: string): Promise<LyricDocument[]> {
  const updated = (await loadLyricDocuments()).filter((document) => document.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: STORAGE_VERSION,
    documents: updated,
  } satisfies LyricDocumentEnvelope));
  return updated;
}

function isEnvelope(value: unknown): value is LyricDocumentEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LyricDocumentEnvelope>;
  return candidate.schemaVersion === STORAGE_VERSION && Array.isArray(candidate.documents);
}
