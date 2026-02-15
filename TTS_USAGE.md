# Text-to-Speech Usage Guide

## Overview

On-demand text-to-speech system that generates audio when a word is clicked. The audio includes:
1. Full word pronunciation
2. Pause
3. Individual syllables (phonetically accurate)
4. Pause
5. Full word pronunciation again

---

## How It Works

```
User clicks word
       ↓
API call to /api/tts
       ↓
Python backend:
  ├─ Split into syllables (pyphen)
  ├─ Convert to phonetics (Claude)
  ├─ Generate TTS for each part (OpenAI)
  └─ Combine with pauses (pydub)
       ↓
Return base64 MP3
       ↓
Play in browser
```

---

## Backend API

### Endpoint: `/api/tts`

**Request:**
```json
POST /api/tts
{
  "word": "construction"
}
```

**Response:**
```json
{
  "audio": "base64_encoded_mp3_data..."
}
```

---

## Frontend Usage

### Basic Example

```typescript
async function playWord(word: string) {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word })
  });

  const { audio } = await response.json();
  const audioElement = new Audio(`data:audio/mp3;base64,${audio}`);
  await audioElement.play();
}
```

---

## Testing

```bash
# Test TTS generation
python3 test_tts.py construction

# Test API endpoint
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"word":"hello"}'
```

---

For complete documentation, see [FEATURES.md](FEATURES.md)
