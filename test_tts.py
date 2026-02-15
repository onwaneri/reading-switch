#!/usr/bin/env python3
"""
Test script for TTS functionality.
Usage: python3 test_tts.py [word]
Default word: "construction"
"""

import sys
import os
from main import generate_tts_with_syllables, generate_tts_base64

def test_tts_generation(word):
    """Test TTS audio generation."""
    print(f"\n{'='*50}")
    print(f"Generating TTS audio for: '{word}'")
    print(f"{'='*50}")

    try:
        # Test 1: Generate audio file
        print("\n[Test 1] Generating audio file...")
        output_dir = os.path.join(os.getcwd(), "test_output")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"{word}_test.mp3")

        audio_path = generate_tts_with_syllables(word, output_path)

        print(f"✓ Audio file generated successfully!")
        print(f"  Location: {audio_path}")
        print(f"  File size: {os.path.getsize(audio_path) / 1024:.2f} KB")

        # Test 2: Generate base64 encoded audio
        print("\n[Test 2] Generating base64 encoded audio...")
        base64_audio = generate_tts_base64(word)

        print(f"✓ Base64 audio generated successfully!")
        print(f"  Base64 length: {len(base64_audio)} characters")
        print(f"  Estimated size: {len(base64_audio) * 3 / 4 / 1024:.2f} KB")
        print(f"  First 50 chars: {base64_audio[:50]}...")

        print(f"\n{'='*50}")
        print("✓ All tests passed successfully!")
        print(f"{'='*50}")
        print(f"\nTo play the audio file:")
        print(f"  macOS: open {audio_path}")
        print(f"  Linux: xdg-open {audio_path}")
        print(f"  Windows: start {audio_path}")

        return True

    except Exception as e:
        print(f"\n✗ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    # Get word from command line or use default
    word = sys.argv[1] if len(sys.argv) > 1 else "construction"

    print("\n" + "="*50)
    print("TTS TEST SCRIPT")
    print("="*50)

    # Check for required environment variables
    if not os.environ.get("OPENAI_API_KEY"):
        print("\n✗ Error: OPENAI_API_KEY not found in environment!")
        print("Please set it in your .local.env file or export it:")
        print("  export OPENAI_API_KEY='your-api-key-here'")
        sys.exit(1)

    print(f"\n✓ OpenAI API key found")
    print(f"  Testing with word: '{word}'")

    # Run tests
    success = test_tts_generation(word)

    if success:
        print("\n✓ TTS functionality is working correctly!")
        sys.exit(0)
    else:
        print("\n✗ TTS testing failed. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
