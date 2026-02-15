# Quick Start Guide

## Setup (One-Time)

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Install FFmpeg
brew install ffmpeg  # macOS
# or: sudo apt-get install ffmpeg  # Linux

# 3. Add API keys to .local.env
echo "OPENAI_API_KEY=your_key_here" >> .local.env
echo "ANTHROPIC_API_KEY=your_key_here" >> .local.env
```

## Test Features

```bash
# Test TTS (Text-to-Speech with syllables)
python3 test_tts.py construction

# Test audio cache system
python3 test_audio_cache.py

# Test Full Word Analysis
python3 main.py construction
```

## Quick Examples

### Generate TTS Audio
```bash
python3 generate_tts.py hello
# Outputs: base64 encoded audio to stdout
```

### Analyze a Word
```bash
python3 main.py education
# Output includes: definition, wordSum, etymology, relatives, matrix
```

### Custom Word
```bash
python3 test_tts.py supercalifragilisticexpialidocious
```

## Output Locations

- **Test Audio:** `test_output/` directory
- **Logs:** stderr (shown in terminal)

## API Usage

```bash
# Start Next.js dev server
npm run dev

# Then use:
# POST /api/tts with {"word": "hello"}
# POST /api/analyze with {"word": "hello", "depth": 2}
```

## Common Issues

**"FFmpeg not found"**
→ Install ffmpeg (see setup step 2)

**"API key not found"**
→ Check .local.env file exists and has both keys

## File Locations

- Main code: `main.py`
- TTS API script: `generate_tts.py`
- Next.js TTS API: `src/app/api/tts/route.ts`
- Test scripts: `test_*.py`
- Full docs: `FEATURES.md`
