#!/usr/bin/env python3
"""
Generate audio files for Amharic vocabulary using TTS.
This script tries multiple TTS engines in order of preference.

Requirements:
    pip install gtts pyttsx3

Usage:
    python3 generate-audio-tts.py
"""

import json
import os
from pathlib import Path

def generate_with_gtts(entries, output_dir):
    """Generate audio using Google Text-to-Speech (gTTS)"""
    try:
        from gtts import gTTS
    except ImportError:
        print("❌ gTTS not installed. Install with: pip install gtts")
        return False

    print("Using Google TTS (gTTS)")
    print("Note: This requires internet connection\n")

    success_count = 0
    skip_count = 0
    fail_count = 0

    for entry in entries:
        output_path = output_dir / entry['filename']

        # Skip if file exists and is not a placeholder
        if output_path.exists() and output_path.stat().st_size > 100:
            print(f"✓ Skipping {entry['filename']} (already exists)")
            skip_count += 1
            continue

        try:
            # Use the romanized text for TTS
            text = entry['romanized']

            # Try different language codes
            # 'am' for Amharic, 'en' for English pronunciation
            tts = gTTS(text=text, lang='en', slow=True)
            tts.save(str(output_path))

            print(f"✓ Generated {entry['filename']}: {entry['english']} ({entry['romanized']})")
            success_count += 1

        except Exception as e:
            print(f"✗ Error generating {entry['filename']}: {e}")
            fail_count += 1

    print(f"\n=== Generation Summary ===")
    print(f"Generated: {success_count}")
    print(f"Skipped: {skip_count}")
    print(f"Failed: {fail_count}")

    return True

def generate_with_pyttsx3(entries, output_dir):
    """Generate audio using pyttsx3 (offline TTS)"""
    try:
        import pyttsx3
    except ImportError:
        print("❌ pyttsx3 not installed. Install with: pip install pyttsx3")
        return False

    print("Using pyttsx3 (offline TTS)")

    try:
        engine = pyttsx3.init()

        # Configure voice properties
        engine.setProperty('rate', 140)  # Speed (words per minute)
        engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)

        # List available voices
        voices = engine.getProperty('voices')
        print(f"\nAvailable voices: {len(voices)}")
        for i, voice in enumerate(voices):
            print(f"  {i}: {voice.name}")

        # Use first voice by default
        if voices:
            engine.setProperty('voice', voices[0].id)

    except Exception as e:
        print(f"❌ Error initializing pyttsx3: {e}")
        return False

    success_count = 0
    skip_count = 0
    fail_count = 0

    for entry in entries:
        output_path = output_dir / entry['filename']

        # Skip if file exists and is not a placeholder
        if output_path.exists() and output_path.stat().st_size > 100:
            print(f"✓ Skipping {entry['filename']} (already exists)")
            skip_count += 1
            continue

        try:
            text = entry['romanized']
            engine.save_to_file(text, str(output_path))
            engine.runAndWait()

            print(f"✓ Generated {entry['filename']}: {entry['english']} ({entry['romanized']})")
            success_count += 1

        except Exception as e:
            print(f"✗ Error generating {entry['filename']}: {e}")
            fail_count += 1

    print(f"\n=== Generation Summary ===")
    print(f"Generated: {success_count}")
    print(f"Skipped: {skip_count}")
    print(f"Failed: {fail_count}")

    return True

def main():
    # Load audio list
    script_dir = Path(__file__).parent
    audio_list_path = script_dir / 'audio-generation-list.json'

    if not audio_list_path.exists():
        print(f"❌ Audio list not found: {audio_list_path}")
        print("Run merge-vocab.js first to generate the audio list")
        return

    with open(audio_list_path, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    print(f"Loaded {len(entries)} entries\n")

    # Set output directory
    output_dir = script_dir / 'client' / 'static' / 'audio' / 'vocab'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Try TTS engines in order of preference
    print("=== Attempting TTS Generation ===\n")

    # Try gTTS first (better quality)
    if generate_with_gtts(entries, output_dir):
        return

    # Fall back to pyttsx3
    if generate_with_pyttsx3(entries, output_dir):
        return

    print("\n❌ No TTS engines available")
    print("Install one of the following:")
    print("  pip install gtts          # Google TTS (requires internet)")
    print("  pip install pyttsx3       # Offline TTS")
    print("\nOr use the browser-based generator: generate-audio-browser.html")

if __name__ == '__main__':
    main()
