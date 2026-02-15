#!/usr/bin/env python3
"""
Standalone script to generate TTS audio with syllable breakdown.
Usage: python3 generate_tts.py <word>
Outputs: base64 encoded audio data to stdout
"""

import sys
from main import generate_tts_base64

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 generate_tts.py <word>", file=sys.stderr)
        sys.exit(1)

    word = sys.argv[1]

    try:
        # Generate TTS audio and get base64 encoded string
        audio_base64 = generate_tts_base64(word)

        # Output to stdout (this is what the Next.js API will read)
        print(audio_base64)

    except Exception as e:
        print(f"Error generating TTS: {e}", file=sys.stderr)
        sys.exit(1)
