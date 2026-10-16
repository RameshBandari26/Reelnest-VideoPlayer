import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
// Newer expo-media-library versions moved the classic asset-listing API to /legacy;
// importing it from the main entry point throws at runtime.
import * as MediaLibrary from 'expo-media-library/legacy';
import { useVideoPlayer, VideoView } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Queue, filterItems, formatTime, shouldResume, sortItems, titleFromFile } from '@lumo/core';

const RESUME_KEY = 'lumo.resume';
const RATES = [0.75, 1, 1.25, 1.5, 2];

export default function App() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [sortBy, setSortBy] = useState('mtime');
  const [status, setStatus] = useState('loading'); // loading | denied | ready | error
  const [error, setError] = useState('');
  const [resume, setResume] = useState({});
  const [, bump] = useState(0);
  const queue = useRef(new Queue()).current;

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RESUME_KEY);
        if (saved) setResume(JSON.parse(saved));
        const perm = await MediaLibrary.requestPermissionsAsync(false, ['audio', 'video']);
        if (!perm.granted) return setStatus('denied');
        const assets = [];
        let after;
        for (let page = 0; page < 10; page += 1) { // up to 10,000 files
          const res = await MediaLibrary.getAssetsAsync({
            first: 1000,
            after,
            mediaType: [MediaLibrary.MediaType.video, MediaLibrary.MediaType.audio],
            sortBy: MediaLibrary.SortBy.modificationTime,
          });
          assets.push(...res.assets);
          if (!res.hasNextPage) break;
          after = res.endCursor;
        }
        setItems(assets.map((a) => ({
          path: a.id, uri: a.uri, name: a.filename, kind: a.mediaType === 'video' ? 'video' : 'audio',
          duration: a.duration, mtime: a.modificationTime, size: 0,
        })));
        setStatus('ready');
      } catch (e) {
        setError(String(e?.message ?? e));
        setStatus('error');
      }
    })();
  }, []);

  const saveProgress = useCallback((item, pos, dur) => {
    setResume((r) => {
      const next = { ...r };
      if (shouldResume(pos, dur)) next[item.path] = { pos, dur }; else delete next[item.path];
      AsyncStorage.setItem(RESUME_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const visible = useMemo(() => {
    const byKind = kind === 'all' ? items : items.filter((i) => i.kind === kind);
    return sortItems(filterItems(byKind, query), sortBy, sortBy === 'mtime' ? 'desc' : 'asc');
  }, [items, kind, query, sortBy]);

  const current = queue.current;

  if (current) {
    return (
      <Player
        key={current.path}
        item={current}
        startAt={resume[current.path] && shouldResume(resume[current.path].pos, resume[current.path].dur) ? resume[current.path].pos : 0}
        queue={queue}
        onProgress={(p, d) => saveProgress(current, p, d)}
        onEnded={() => { const n = queue.next({ auto: true }); if (!n) queue.setItems([]); bump((x) => x + 1); }}
        onNext={() => { queue.next(); bump((x) => x + 1); }}
        onPrev={() => { queue.prev(); bump((x) => x + 1); }}
        onClose={() => { queue.setItems([]); bump((x) => x + 1); }}
      />
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" />
      <Text style={s.h1}>Lumo</Text>
      <TextInput style={s.search} placeholder="Search your library" placeholderTextColor="#9a93b5" value={query} onChangeText={setQuery} />
      <View style={s.chips}>
        {[['all', 'All'], ['video', 'Videos'], ['audio', 'Music']].map(([k, label]) => (
          <Pressable key={k} onPress={() => setKind(k)} style={[s.chip, kind === k && s.chipOn]}>
            <Text style={[s.chipText, kind === k && s.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setSortBy(sortBy === 'mtime' ? 'name' : 'mtime')} style={[s.chip, { marginLeft: 'auto' }]}>
          <Text style={s.chipText}>{sortBy === 'mtime' ? 'Newest' : 'Name'}</Text>
        </Pressable>
      </View>
      {status === 'loading' && <Text style={s.empty}>Scanning your media...</Text>}
      {status === 'error' && <Text style={s.empty}>Could not read your media library: {error}</Text>}
      {status === 'denied' && <Text style={s.empty}>Lumo can't see your media. Allow access to audio and video in Settings, then reopen the app.</Text>}
      <FlatList
        data={visible}
        keyExtractor={(i) => i.path}
        ListEmptyComponent={status === 'ready' ? <Text style={s.empty}>No media found on this device.</Text> : null}
        renderItem={({ item, index }) => (
          <Pressable style={s.row} onPress={() => { queue.setItems(visible, index); bump((x) => x + 1); }}>
            <View style={[s.badge, { backgroundColor: item.kind === 'video' ? '#8aa4ff' : '#ffb86b' }]}>
              <Text style={s.badgeText}>{item.kind === 'video' ? 'V' : 'M'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{titleFromFile(item.name)}</Text>
              <Text style={s.meta}>{formatTime(item.duration)}{resume[item.path] ? `  ·  resume at ${formatTime(resume[item.path].pos)}` : ''}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function Player({ item, startAt, queue, onProgress, onEnded, onNext, onPrev, onClose }) {
  const [rate, setRate] = useState(1);
  const player = useVideoPlayer(item.uri, (p) => {
    p.timeUpdateEventInterval = 1;
    p.staysActiveInBackground = true; // keeps music playing with the screen off
    if (startAt) p.currentTime = startAt;
    p.play();
  });

  useEffect(() => {
    const t = player.addListener('timeUpdate', ({ currentTime }) => onProgress(currentTime, player.duration));
    const e = player.addListener('playToEnd', onEnded);
    return () => { t.remove(); e.remove(); };
  }, [player]);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.topBar}>
        <Pressable onPress={onClose}><Text style={s.link}>Back to library</Text></Pressable>
        <Text style={s.meta} numberOfLines={1}>{titleFromFile(item.name)}</Text>
      </View>
      <VideoView style={s.video} player={player} nativeControls allowsPictureInPicture contentFit="contain" />
      <View style={s.controls}>
        <Pressable onPress={onPrev} style={s.btn}><Text style={s.btnText}>Previous</Text></Pressable>
        <Pressable onPress={onNext} style={s.btn}><Text style={s.btnText}>Next</Text></Pressable>
        <Pressable onPress={() => { queue.shuffle = !queue.shuffle; setRate((r) => r); }} style={[s.btn, queue.shuffle && s.btnOn]}><Text style={s.btnText}>Shuffle</Text></Pressable>
        <Pressable
          onPress={() => { const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; player.playbackRate = r; setRate(r); }}
          style={s.btn}
        ><Text style={s.btnText}>{rate}x</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#15121f', paddingTop: (StatusBar.currentHeight ?? 0) + 8 },
  h1: { color: '#ece8f5', fontSize: 26, fontWeight: '700', paddingHorizontal: 16, paddingBottom: 8 },
  search: { backgroundColor: '#1f1b30', color: '#ece8f5', marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  chips: { flexDirection: 'row', gap: 8, padding: 16, alignItems: 'center' },
  chip: { backgroundColor: '#2a2542', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: '#8aa4ff' }, chipText: { color: '#ece8f5' }, chipTextOn: { color: '#101326' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  badge: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#101326', fontWeight: '700' },
  name: { color: '#ece8f5', fontSize: 16 }, meta: { color: '#9a93b5', fontSize: 12, flexShrink: 1 },
  empty: { color: '#9a93b5', padding: 24, textAlign: 'center' },
  topBar: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 }, link: { color: '#8aa4ff', fontSize: 15 },
  video: { flex: 1, backgroundColor: '#000' },
  controls: { flexDirection: 'row', gap: 8, padding: 14, justifyContent: 'center', flexWrap: 'wrap' },
  btn: { backgroundColor: '#2a2542', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnOn: { backgroundColor: '#8aa4ff' }, btnText: { color: '#ece8f5' },
});