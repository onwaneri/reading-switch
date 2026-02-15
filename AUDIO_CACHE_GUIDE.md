# Audio Cache System - Usage Guide

## Overview

Simple client-side audio caching with two-step interaction:
1. **Click word** → Generate/load audio (cached for reuse)
2. **Click play button** → Play the audio

## Features

✅ **Client-side caching** - Words only generated once
✅ **Two-step interaction** - Click to load, then play
✅ **Loading states** - Visual feedback while generating
✅ **Cache management** - View and clear cache
✅ **Error handling** - User-friendly error messages

---

## Quick Start

### 1. Install the Hook

The hook is at [src/hooks/useAudioCache.ts](src/hooks/useAudioCache.ts)

### 2. Use in Your Component

```typescript
import { useAudioCache } from '@/hooks/useAudioCache';

function MyComponent() {
  const {
    selectedWord,    // Currently selected word
    isLoading,       // True while generating
    isReady,         // True when ready to play
    error,           // Error message if any
    loadWord,        // Function to load a word
    playAudio,       // Function to play loaded audio
    clearCache,      // Function to clear cache
    cacheSize,       // Number of cached words
  } = useAudioCache();

  return (
    <div>
      {/* Click words to load */}
      <span onClick={() => loadWord('construction')}>
        construction
      </span>

      {/* Play button */}
      <button onClick={playAudio} disabled={!isReady}>
        Play
      </button>

      {/* Cache info */}
      <p>Cached: {cacheSize} words</p>
    </div>
  );
}
```

---

## User Flow

```
1. User clicks word "construction"
   ↓
2. Check cache
   ├─ HIT: Load instantly
   └─ MISS: Generate (3-8 seconds)
   ↓
3. Audio ready, button enabled
   ↓
4. User clicks "Play" button
   ↓
5. Audio plays: word → pause → syllables → word
   ↓
6. User clicks "construction" again
   ↓
7. Loads instantly from cache! (<10ms)
```

---

## API Reference

### `useAudioCache()`

Returns object with:

#### State
- `selectedWord: string | null` - Currently selected word
- `isLoading: boolean` - True while generating audio
- `isReady: boolean` - True when audio is ready to play
- `error: string | null` - Error message if generation failed
- `cacheSize: number` - Number of words in cache

#### Actions
- `loadWord(word: string): Promise<void>` - Load audio for a word
- `playAudio(): void` - Play the currently loaded audio
- `clearCache(): void` - Clear all cached audio

---

## Example Component

See [AUDIO_CACHE_EXAMPLE.tsx](AUDIO_CACHE_EXAMPLE.tsx) for a complete example.

**Key features:**
- Click word to load
- Loading indicator while generating
- Play button (enabled when ready)
- Visual feedback (highlight selected word)
- Cache size display
- Clear cache button

---

## Behavior

### First Click (Cache Miss)
```
User clicks "construction"
  ↓ (0ms)
Show loading state
  ↓ (3-8 seconds)
Generate audio via API
  ↓ (0ms)
Store in cache
  ↓ (0ms)
Enable play button
```

**Total:** 3-8 seconds

### Second Click (Cache Hit)
```
User clicks "construction"
  ↓ (0ms)
Load from cache
  ↓ (<10ms)
Enable play button
```

**Total:** <10ms

### Play Button
```
User clicks "Play"
  ↓ (0ms)
Play cached audio
  ↓ (8-10 seconds)
Audio finishes
```

---

## Customization

### Change Loading Text
```typescript
{isLoading ? (
  <>🔄 Generating pronunciation...</>
) : (
  <>▶️ Play</>
)}
```

### Add Replay Functionality
```typescript
// The playAudio function automatically resets to beginning
// Just call it again
<button onClick={playAudio}>🔁 Replay</button>
```

### Show Cache Stats
```typescript
<div>
  <p>Words in cache: {cacheSize}</p>
  <p>Selected: {selectedWord || 'None'}</p>
  <p>Status: {isLoading ? 'Loading...' : isReady ? 'Ready' : 'Idle'}</p>
</div>
```

### Persist Cache Across Page Reloads

Modify the hook to use `localStorage`:

```typescript
// In useAudioCache.ts
useEffect(() => {
  // Load from localStorage on mount
  const saved = localStorage.getItem('audioCache');
  if (saved) {
    cacheRef.current = new Map(JSON.parse(saved));
  }
}, []);

useEffect(() => {
  // Save to localStorage when cache changes
  localStorage.setItem('audioCache',
    JSON.stringify(Array.from(cacheRef.current.entries()))
  );
}, [cacheSize]);
```

---

## Cache Management

### Check What's Cached
```typescript
// Add to hook if needed
const getCachedWords = useCallback(() => {
  return Array.from(cacheRef.current.keys());
}, []);

// Usage
const cachedWords = getCachedWords();
console.log('Cached words:', cachedWords);
```

### Remove Single Word from Cache
```typescript
// Add to hook
const removeFromCache = useCallback((word: string) => {
  cacheRef.current.delete(word.toLowerCase());
}, []);
```

### Set Cache Size Limit
```typescript
// Add to hook
const MAX_CACHE_SIZE = 50;

// After adding to cache
if (cacheRef.current.size > MAX_CACHE_SIZE) {
  // Remove oldest entry
  const firstKey = cacheRef.current.keys().next().value;
  cacheRef.current.delete(firstKey);
}
```

---

## Testing

### Test in Browser Console

```javascript
// Test cache behavior
const testCache = async () => {
  console.time('First load');
  await loadWord('construction');
  console.timeEnd('First load'); // ~5000ms

  console.time('Second load');
  await loadWord('construction');
  console.timeEnd('Second load'); // ~5ms

  console.log('Cache size:', cacheSize);
};

testCache();
```

---

## Comparison: Old vs New

### Old Predictive System (Removed)
- ❌ Complex: IndexedDB, Web Audio API, background prefetching
- ❌ Pre-generates words user might not click
- ❌ Costs API calls for unused words
- ✅ <50ms latency (when cached)

### New Simple Cache (Current)
- ✅ Simple: Just in-memory Map
- ✅ Only generates clicked words
- ✅ Lower API costs
- ✅ <10ms reload (from cache)
- ⚠️ 3-8 seconds first click

---

## Best Practices

1. **Show loading state** - User knows something is happening
2. **Disable play button** - Until audio is ready
3. **Handle errors gracefully** - Show user-friendly messages
4. **Clear cache periodically** - Prevent memory issues
5. **Highlight selected word** - Visual feedback
6. **Add keyboard shortcuts** - Space to play, arrows to select

---

## Troubleshooting

### Audio doesn't play
- Check browser console for errors
- Verify `isReady` is true before calling `playAudio()`
- Check browser audio permissions

### Cache not working
- Check console for "Cache HIT" messages
- Verify word normalization (lowercase, trimmed)
- Clear cache and try again

### Generation is slow
- Normal for first click (3-8 seconds)
- Check network tab for API response time
- Verify backend is running

---

## Quick Reference

```typescript
// Load word (from cache or generate)
await loadWord('construction');

// Play loaded audio
playAudio();

// Clear all cached audio
clearCache();

// Check status
console.log({ selectedWord, isLoading, isReady, cacheSize });
```

---

**Complete example:** [AUDIO_CACHE_EXAMPLE.tsx](AUDIO_CACHE_EXAMPLE.tsx)
