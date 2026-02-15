# New Features Documentation

## Overview

This document describes the new educational features added to the word analysis system:
1. **Text-to-Speech with Syllable Breakdown**

---

## 1. Text-to-Speech (TTS) with Syllable Breakdown

### Description
Generates audio **on-demand** when a word is clicked. The audio pronounces the word with syllable breakdown to help learners understand pronunciation.

**Key Feature:** Each syllable is automatically converted to phonetic spelling using Claude AI before TTS generation, ensuring accurate pronunciation even when syllables are pronounced in isolation.

**Note:** Audio is generated fresh for each click (no pre-caching). Typical generation time: 3-8 seconds per word.

### Audio Sequence
```
word → [500ms pause] → syllable-1 → [300ms pause] → syllable-2 → ... → [500ms pause] → word
```

### Example
For the word "construction":
```
Syllables: con - struc - tion
Phonetic:  kuhn - struhk - shun

Audio: "construction" → pause → "kuhn" → "struhk" → "shun" → pause → "construction"
```

This ensures syllables like "tion" are pronounced as "shun" rather than incorrectly.

### Functions

#### `syllables_to_phonetic(word: str, syllables: list) -> list`
Converts syllables to phonetic spellings for accurate TTS pronunciation using Claude AI.

**Parameters:**
- `word`: The original word (for context)
- `syllables`: List of syllables to convert

**Returns:** List of tuples `(original_syllable, phonetic_spelling)`

**Example:**
```python
syllables_to_phonetic("construction", ["con", "struc", "tion"])
# Returns: [("con", "kuhn"), ("struc", "struhk"), ("tion", "shun")]
```

#### `generate_tts_with_syllables(word: str, output_path: str = None) -> str`
Generates TTS audio file with syllable breakdown using phonetic pronunciations.

**Parameters:**
- `word`: The word to pronounce
- `output_path`: Optional file path for output (default: temp file)

**Returns:** Path to generated MP3 file

**Process:**
1. Splits word into syllables using pyphen
2. Converts syllables to phonetic spellings using Claude
3. Generates TTS audio for each phonetic syllable
4. Combines all segments with pauses

#### `generate_tts_base64(word: str) -> str`
Generates TTS audio and returns as base64 encoded string (for API responses).

**Returns:** Base64 encoded MP3 audio

### API Endpoint

**URL:** `/api/tts`

**Method:** POST

**Request Body:**
```json
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

### Testing

Run the test script:
```bash
python3 test_tts.py construction
```

### Dependencies
- `openai` - OpenAI TTS API
- `pyphen` - Syllable separation
- `pydub` - Audio manipulation
- `ffmpeg` - Required by pydub (install via brew/apt)

---

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install FFmpeg (for TTS)
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### 3. Configure API Keys

Add to `.local.env`:
```
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 4. Test Features

```bash
# Test TTS
python3 test_tts.py construction

# Test Full Pipeline
python3 main.py construction
```

---

## File Structure

```
reading-switch/
├── main.py                      # Main backend with all features
├── generate_tts.py              # Standalone TTS script for API
├── test_tts.py                  # TTS test script
├── test_audio_cache.py          # Audio cache test script
├── src/app/api/
│   ├── analyze/route.ts         # Word analysis API
│   └── tts/route.ts             # TTS API endpoint
└── test_output/                 # Test audio files (gitignored)
```

---

## Usage Examples

### Python Direct Usage

```python
from main import get_word_matrix, generate_tts_with_syllables

# Get full word analysis
result = get_word_matrix("construction")
print(result["definition"])
print(result["wordSum"])

# Generate TTS audio
audio_path = generate_tts_with_syllables("construction")
print(audio_path)  # Path to MP3 file
```

### API Usage

```typescript
// Get word analysis
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word: 'construction', depth: 2 })
});
const { analysis } = await response.json();
// analysis contains: definition, wordSum, etymology, relatives, matrix

// Get TTS audio
const ttsResponse = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word: 'construction' })
});
const { audio } = await ttsResponse.json();
// audio is base64 encoded MP3

// Play audio in browser
const audioElement = new Audio(`data:audio/mp3;base64,${audio}`);
audioElement.play();
```

---

## Cost Considerations

### TTS Costs
- OpenAI TTS-1 model: ~$0.015 per 1K characters
- Average word with 3 syllables: ~30 characters total
- Cost per word: ~$0.0005

### API Rate Limits
- OpenAI: 500 requests/minute
- Anthropic: varies by plan

---

## Troubleshooting

### FFmpeg Not Found
```
Error: ffmpeg not found
Solution: Install ffmpeg (see Setup Instructions)
```

### API Key Error
```
Error: OPENAI_API_KEY not found
Solution: Add API key to .local.env file
```

---

## Future Enhancements

Possible improvements:
- [ ] Voice selection for TTS (currently uses "alloy")
- [ ] Adjustable pause durations
- [ ] Batch processing for multiple words
- [ ] Persistent audio caching across sessions
