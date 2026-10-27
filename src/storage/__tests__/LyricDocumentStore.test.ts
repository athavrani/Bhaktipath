jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: jest.fn(async (key: string) => values.has(key) ? values.get(key)! : null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { values.delete(key); }),
    clear: jest.fn(async () => { values.clear(); }),
  };
  return { __esModule: true, default: storage };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLyricDocument } from '../../domain/lyricDocuments';
import { deleteLyricDocument, loadLyricDocuments, saveLyricDocument } from '../LyricDocumentStore';

describe('LyricDocumentStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  const makeDocument = (id: string) => createLyricDocument({
    id,
    title: 'Test prayer',
    language: 'hi',
    audio: { name: 'prayer.mp3' },
    lines: [{ id: `${id}-line-1`, order: 0, startMs: 0, endMs: null, text: 'राम' }],
    now: '2026-10-27T10:00:00.000Z',
  });

  it('loads an empty list when there are no saved documents', async () => {
    await expect(loadLyricDocuments()).resolves.toEqual([]);
  });

  it('saves documents locally and loads the versioned envelope', async () => {
    const document = makeDocument('one');
    await saveLyricDocument(document);
    const loaded = await loadLyricDocuments();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('one');
    expect(loaded[0].updatedAt).not.toBe(document.updatedAt);
  });

  it('updates an existing document instead of creating duplicates', async () => {
    await saveLyricDocument(makeDocument('one'));
    await saveLyricDocument({ ...makeDocument('one'), title: 'Updated prayer' });
    const loaded = await loadLyricDocuments();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Updated prayer');
  });

  it('deletes only the selected document', async () => {
    await saveLyricDocument(makeDocument('one'));
    await saveLyricDocument(makeDocument('two'));
    await deleteLyricDocument('one');
    expect((await loadLyricDocuments()).map((document) => document.id)).toEqual(['two']);
  });

  it('does not silently discard unsupported storage data', async () => {
    await AsyncStorage.setItem('@bhaktipath/lyric-documents-v1', JSON.stringify({ schemaVersion: 99, documents: [] }));
    await expect(loadLyricDocuments()).rejects.toThrow('unsupported or invalid storage format');
  });
});
