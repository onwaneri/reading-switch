#!/usr/bin/env python3
"""
Test script for audio cache system (backend only).
Tests the TTS generation that the cache will use.

Usage: python3 test_audio_cache.py
"""

import sys
import os
import time
import json

# Load environment variables from .local.env
try:
    from dotenv import load_dotenv
    load_dotenv(".local.env")
except ImportError:
    print("⚠ Warning: python-dotenv not installed. Install with: pip install python-dotenv")
    print("ℹ Continuing with system environment variables...\n")

# ANSI colors
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
BOLD = '\033[1m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BOLD}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓{RESET} {text}")

def print_error(text):
    print(f"{RED}✗{RESET} {text}")

def print_info(text):
    print(f"{BLUE}ℹ{RESET} {text}")


def test_environment():
    """Test 1: Check environment"""
    print_header("Test 1: Environment Check")

    checks = []

    # Check Python version
    python_version = sys.version_info
    version_ok = python_version.major == 3 and python_version.minor >= 8
    checks.append(("Python 3.8+", version_ok))

    # Check API keys
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    checks.append(("ANTHROPIC_API_KEY", bool(anthropic_key)))
    checks.append(("OPENAI_API_KEY", bool(openai_key)))

    # Check dependencies
    try:
        import anthropic
        checks.append(("anthropic module", True))
    except ImportError:
        checks.append(("anthropic module", False))

    try:
        import openai
        checks.append(("openai module", True))
    except ImportError:
        checks.append(("openai module", False))

    # Print results
    all_passed = True
    for name, passed in checks:
        if passed:
            print_success(f"{name}")
        else:
            print_error(f"{name}")
            all_passed = False

    return all_passed


def test_tts_generation():
    """Test 2: Generate TTS for a single word"""
    print_header("Test 2: TTS Generation (Single Word)")

    try:
        from main import generate_tts_base64

        test_word = "hello"
        print_info(f"Generating audio for '{test_word}'...")

        start_time = time.time()
        audio_base64 = generate_tts_base64(test_word)
        duration = (time.time() - start_time) * 1000

        print_success(f"Generated audio in {duration:.0f}ms")
        print(f"  Base64 length: {len(audio_base64)} characters")
        print(f"  Estimated size: {len(audio_base64) * 3 / 4 / 1024:.2f} KB")

        return True, audio_base64

    except Exception as e:
        print_error(f"Failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None


def test_cache_simulation():
    """Test 3: Simulate cache behavior"""
    print_header("Test 3: Cache Simulation")

    print_info("Simulating client-side cache behavior...")

    # Simulate cache with dict
    cache = {}

    words = ["construction", "hello", "construction", "education", "hello"]

    print(f"\n{BOLD}Simulating clicks:{RESET}")
    for i, word in enumerate(words, 1):
        print(f"\n{BOLD}Click {i}: '{word}'{RESET}")

        if word in cache:
            print_success(f"  Cache HIT - Load from cache (<10ms)")
            print(f"  Audio size: {cache[word]['size']:.2f} KB")
        else:
            print_info(f"  Cache MISS - Generating...")
            # Simulate generation
            import time
            time.sleep(0.1)  # Simulate API call

            # Simulate cache storage
            cache[word] = {
                'audio': f'base64_audio_for_{word}',
                'size': 50.0,
                'timestamp': time.time()
            }

            print_success(f"  Generated and cached")
            print(f"  Audio size: {cache[word]['size']:.2f} KB")

    print(f"\n{BOLD}Final cache state:{RESET}")
    print(f"  Cached words: {list(cache.keys())}")
    print(f"  Cache size: {len(cache)} words")
    print(f"  Total storage: {sum(c['size'] for c in cache.values()):.2f} KB")

    return True


def test_api_response_format():
    """Test 4: Verify API response format"""
    print_header("Test 4: API Response Format")

    try:
        from main import generate_tts_base64

        test_word = "test"
        print_info(f"Generating audio for '{test_word}'...")

        audio_base64 = generate_tts_base64(test_word)

        # Verify it's valid base64
        import base64
        try:
            decoded = base64.b64decode(audio_base64)
            print_success("Valid base64 encoding")
            print(f"  Decoded size: {len(decoded)} bytes")
        except Exception as e:
            print_error(f"Invalid base64: {e}")
            return False

        # Check it looks like MP3
        if decoded[:3] == b'ID3' or decoded[:2] == b'\xff\xfb':
            print_success("Valid MP3 format")
        else:
            print_error("Doesn't look like MP3")
            return False

        return True

    except Exception as e:
        print_error(f"Failed: {e}")
        return False


def test_multiple_words():
    """Test 5: Generate audio for multiple words"""
    print_header("Test 5: Multiple Word Generation")

    try:
        from main import generate_tts_base64

        test_words = ["cat", "dog", "bird"]
        cache = {}

        print_info(f"Testing {len(test_words)} words...")

        for word in test_words:
            print(f"\n{BOLD}Processing '{word}':{RESET}")

            start_time = time.time()
            audio_base64 = generate_tts_base64(word)
            duration = (time.time() - start_time) * 1000

            cache[word] = audio_base64

            print_success(f"  Generated in {duration:.0f}ms")
            print(f"  Size: {len(audio_base64) * 3 / 4 / 1024:.2f} KB")

        print(f"\n{BOLD}Summary:{RESET}")
        print(f"  Successfully cached {len(cache)} words")
        total_size = sum(len(audio) * 3 / 4 for audio in cache.values())
        print(f"  Total cache size: {total_size / 1024:.2f} KB")

        return True

    except Exception as e:
        print_error(f"Failed: {e}")
        return False


def main():
    print(f"""
{BOLD}{BLUE}╔══════════════════════════════════════════════════════════════╗
║           AUDIO CACHE SYSTEM - BACKEND TEST              ║
╚══════════════════════════════════════════════════════════════╝{RESET}

This tests the backend TTS generation that the audio cache uses.
Frontend caching is tested separately in the browser.
    """)

    results = []

    # Test 1: Environment
    env_ok = test_environment()
    results.append(("Environment", env_ok))

    if not env_ok:
        print_error("\n❌ Environment check failed. Cannot proceed.")
        print_info("Fix missing dependencies or API keys.")
        return False

    # Test 2: Single word generation
    tts_ok, audio = test_tts_generation()
    results.append(("TTS Generation", tts_ok))

    # Test 3: Cache simulation
    cache_ok = test_cache_simulation()
    results.append(("Cache Simulation", cache_ok))

    # Test 4: API format
    format_ok = test_api_response_format()
    results.append(("API Format", format_ok))

    # Test 5: Multiple words
    multi_ok = test_multiple_words()
    results.append(("Multiple Words", multi_ok))

    # Summary
    print_header("TEST SUMMARY")

    passed = sum(1 for _, ok in results if ok)
    total = len(results)

    for name, ok in results:
        status = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
        print(f"  {name:<20} {status}")

    print(f"\n{BOLD}Results: {passed}/{total} tests passed{RESET}")

    if passed == total:
        print(f"\n{GREEN}{BOLD}✅ ALL TESTS PASSED!{RESET}")
        print_info("Backend is ready for audio cache system")
        print_info("Next: Test frontend with: npm run dev")
    else:
        print(f"\n{RED}{BOLD}❌ SOME TESTS FAILED{RESET}")
        print_info("Fix the errors above before proceeding")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
