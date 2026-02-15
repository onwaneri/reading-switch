# Audio Cache Testing Guide

## Overview

Three ways to test the audio cache system:
1. **Backend Test** - Python script (tests TTS generation)
2. **Interactive Test Page** - Browser interface (tests full system)
3. **Manual Browser Test** - Console commands

---

## 1. Backend Test (Python)

Tests the TTS generation that the cache uses.

### Run:
```bash
python3 test_audio_cache.py
```

### What it tests:
- ✅ Environment setup (API keys, dependencies)
- ✅ Single word TTS generation
- ✅ Cache simulation
- ✅ API response format
- ✅ Multiple word generation

### Expected Output:
```
╔══════════════════════════════════════════════════════════════╗
║           AUDIO CACHE SYSTEM - BACKEND TEST              ║
╚══════════════════════════════════════════════════════════════╝

==============================================================
Test 1: Environment Check
==============================================================

✓ Python 3.8+
✓ ANTHROPIC_API_KEY
✓ OPENAI_API_KEY
✓ anthropic module
✓ openai module
✓ pyphen module
✓ pydub module

==============================================================
Test 2: TTS Generation (Single Word)
==============================================================

ℹ Generating audio for 'hello'...
✓ Generated audio in 5234ms
  Base64 length: 123456 characters
  Estimated size: 92.59 KB

==============================================================
Test 3: Cache Simulation
==============================================================

Click 1: 'construction'
ℹ   Cache MISS - Generating...
✓   Generated and cached

Click 2: 'hello'
ℹ   Cache MISS - Generating...
✓   Generated and cached

Click 3: 'construction'
✓   Cache HIT - Load from cache (<10ms)

...

✅ ALL TESTS PASSED!
```

---

## 2. Interactive Test Page (Browser)

Full-featured test interface with automated tests.

### Access:
```bash
# Start dev server
npm run dev

# Open browser
http://localhost:3000/test-audio-cache
```

### Features:

#### Manual Testing
- Click test words to load audio
- Visual feedback (loading, ready states)
- Play button to hear audio
- Cache size display
- Clear cache button

#### Automated Test
- Runs sequence of loads
- Verifies cache hits/misses
- Shows timing for each operation
- Logs results in real-time

#### Test Log
- Displays all operations
- Color-coded (success/fail/info)
- Timestamps for each event
- Performance metrics

### Expected Behavior:

**First Click on "hello":**
```
[10:30:15] Testing word: "hello"
[10:30:18] ✓ Loaded "hello" in 3245ms
```

**Second Click on "hello":**
```
[10:30:20] Testing word: "hello"
[10:30:20] ✓ Loaded "hello" in 8ms   <- CACHED!
```

---

## 3. Manual Browser Test (Console)

Test directly in browser console.

### Open Console:
1. Start app: `npm run dev`
2. Open browser to your app page
3. Press F12 → Console tab

### Test Commands:

#### Basic Test
```javascript
// This won't work directly - you need to use the hook in a component
// But here's how to test the API:

// Test API endpoint
const response = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word: 'hello' })
});

const data = await response.json();
console.log('Audio length:', data.audio.length);

// Play it
const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
audio.play();
```

#### Performance Test
```javascript
// Measure generation time
console.time('First generation');
const r1 = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word: 'construction' })
});
await r1.json();
console.timeEnd('First generation');
// Expected: 3000-8000ms

// The frontend cache would store this, so second call
// from the hook would be instant
```

---

## Test Scenarios

### Scenario 1: Fresh Load
```
Action: Click "hello" (first time)
Expected:
  - Loading indicator shows
  - Takes 3-8 seconds
  - Play button enables
  - Cache size: 1
```

### Scenario 2: Cached Load
```
Action: Click "hello" (second time)
Expected:
  - Loading indicator shows briefly
  - Takes <100ms
  - Play button enables
  - Cache size: 1 (same)
```

### Scenario 3: Multiple Words
```
Action: Click "hello", then "world", then "hello"
Expected:
  - "hello": 3-8s (generate)
  - "world": 3-8s (generate)
  - "hello": <100ms (cached)
  - Cache size: 2
```

### Scenario 4: Play Audio
```
Action: Click word, then click Play
Expected:
  - Hear: word → pause → syllables → pause → word
  - Duration: ~8-10 seconds
  - Can click Play again to replay
```

### Scenario 5: Clear Cache
```
Action: Clear cache, then click previously loaded word
Expected:
  - Cache size: 0
  - Word loads slowly again (regenerate)
  - Cache size: 1
```

---

## Automated Test Sequence

The interactive test page runs this sequence:

```
1. Load "hello" → Expect: NEW (3-8s)
2. Load "world" → Expect: NEW (3-8s)
3. Load "hello" → Expect: CACHED (<100ms) ✓
4. Load "construction" → Expect: NEW (3-8s)
5. Load "world" → Expect: CACHED (<100ms) ✓

Result: 3 new, 2 cached
Cache size: 3 words
```

---

## Success Criteria

✅ **Backend Test**
- All environment checks pass
- Single word generation works
- API returns valid base64 MP3

✅ **Interactive Test**
- First click: 3-8 seconds
- Second click: <100ms
- Play button works
- Cache persists between loads

✅ **Manual Test**
- API endpoint responds
- Audio plays in browser
- No console errors

---

## Troubleshooting

### Backend Test Fails

**"Module not found"**
```bash
pip install -r requirements.txt
```

**"API key not set"**
```
Add to .local.env:
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
```

### Frontend Test Fails

**"Cannot find module '@/hooks/useAudioCache'"**
- Verify file exists: `src/hooks/useAudioCache.ts`
- Restart dev server: `npm run dev`

**"Audio doesn't play"**
- Check browser console for errors
- Verify `isReady` is true before playing
- Try different browser

**"Cache not working"**
- Check browser console for "Cache HIT" messages
- Verify timing: second click should be <100ms
- Clear cache and try again

### Performance Issues

**"Generation too slow (>10s)"**
- Normal for first time
- Check network tab for API timing
- Verify backend is running

**"Cached load still slow (>1s)"**
- Check browser console for errors
- May be re-generating (cache miss)
- Verify same word is being clicked

---

## Quick Reference

```bash
# Backend test
python3 test_audio_cache.py

# Frontend test
npm run dev
# Open: http://localhost:3000/test-audio-cache

# Manual API test
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"word":"hello"}'
```

---

## Next Steps

After testing:
1. ✅ Verify backend generates audio
2. ✅ Verify frontend caches correctly
3. ✅ Verify play button works
4. 🚀 Integrate into your app!

See [AUDIO_CACHE_EXAMPLE.tsx](AUDIO_CACHE_EXAMPLE.tsx) for integration example.
