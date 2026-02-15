"""
Backend for Structured Word Inquiry (SWI) word matrix generation.
Uses Claude API for morphological analysis.
"""

import json
import os
import sys
import tempfile
from typing import Dict
from anthropic import Anthropic
from openai import OpenAI
import base64
import requests
from requests_oauthlib import OAuth1

from dotenv import load_dotenv
# Load .env.local from the script's directory
env_path = os.path.join(os.path.dirname(__file__), ".env.local")
load_dotenv(env_path)
print(f"Loading env from: {env_path}", file=sys.stderr)



client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
openai_client = None
if os.environ.get("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# In-memory cache for word matrices
matrix_cache: Dict[str, dict] = {}


def call_llm(prompt: str) -> str:
    """
    Call Claude API with the given prompt.

    Args:
        prompt: The prompt to send to Claude

    Returns:
        Claude's response as a string
    """
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",  # Latest Claude Sonnet 4.5
            max_tokens=2000,
            temperature=0.3,  # Lower temperature for more precise, consistent results
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return message.content[0].text
    except Exception as e:
        print(f"Error calling Claude API: {e}", file=sys.stderr)
        raise


def clean_json_response(response: str) -> str:
    """
    Clean AI response by removing markdown code blocks if present.

    Args:
        response: Raw response from the AI

    Returns:
        Cleaned JSON string
    """
    response = response.strip()

    # Remove markdown code blocks if present
    if response.startswith("```"):
        # Remove opening fence (```json or ```)
        lines = response.split('\n')
        if lines[0].startswith("```"):
            lines = lines[1:]
        # Remove closing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        response = '\n'.join(lines)

    return response.strip()


def extract_base(word: str) -> str:
    """
    Extract the base morpheme(s) from a given word using Claude API.

    Args:
        word: The input word to analyze

    Returns:
        The base morpheme(s) - single base or multiple bases separated by '+'
    """
    prompt = f"""You are an expert linguist specializing in structured word inquiry and English morphology.

Your task: Identify the BASE MORPHEME(S) (root) of the word "{word}"

CRITICAL RULES:
1. Return ONLY the base morpheme(s) - no prefixes, no suffixes
2. The base must be a real morpheme found in English dictionaries
3. The base should be the smallest meaningful unit that carries the core meaning
4. Do NOT invent bases - use established linguistic analysis
5. For common words, use well-documented bases appropriate for educational contexts
6. If the word has TWO base morphemes (compound word), separate them with ' + ' (e.g., "auto + mobile")
7. Most words have ONE base - only return multiple bases if it's truly a compound word

Examples:
Single base words:
- "construction" → "struct" (meaning: to build)
- "unhappiness" → "happy" (the base emotional state)
- "replay" → "play" (the core action)
- "education" → "duce" (meaning: to lead)
- "inspection" → "spect" (meaning: to look)
- "description" → "scribe" (meaning: to write)

Compound words (two bases):
- "automobile" → "auto + mobile" (self + move)
- "bibliography" → "biblio + graph" (book + write)
- "biography" → "bio + graph" (life + write)
- "telephone" → "tele + phone" (far + sound)

Word to analyze: {word}

Return ONLY the base morpheme(s) with no explanation, no hyphens in the bases themselves. If multiple bases, separate with ' + '."""

    try:
        base = call_llm(prompt).strip()
        print(f"Extracted base: '{base}'", file=sys.stderr)
        return base
    except Exception as e:
        print(f"Error extracting base for '{word}': {e}", file=sys.stderr)
        raise


def generate_matrix_with_icons(base: str) -> dict:
    """
    Generate a complete word matrix with icons for each morpheme.

    Args:
        base: The base morpheme(s) - can be single or multiple separated by ' + '

    Returns:
        Dictionary containing the word matrix with icon URLs
    """
    # First generate the matrix
    matrix = generate_matrix(base)

    # Fetch icons for bases
    for base_morph in matrix.get("bases", []):
        try:
            icon_url = fetch_noun_project_icon(base_morph["text"], base_morph["text"])
            if icon_url:
                base_morph["iconUrl"] = icon_url
        except Exception as e:
            print(f"Failed to fetch icon for base '{base_morph['text']}': {e}", file=sys.stderr)

    # Fetch icons for prefixes (use meaning for better results)
    for prefix in matrix.get("prefixes", []):
        try:
            search_term = prefix.get("meaning", prefix["text"])
            icon_url = fetch_noun_project_icon(search_term, prefix["text"])
            if icon_url:
                prefix["iconUrl"] = icon_url
        except Exception as e:
            print(f"Failed to fetch icon for prefix '{prefix['text']}': {e}", file=sys.stderr)

    # Fetch icons for suffixes (use meaning for better results)
    for suffix in matrix.get("suffixes", []):
        try:
            search_term = suffix.get("meaning", suffix["text"])
            icon_url = fetch_noun_project_icon(search_term, suffix["text"])
            if icon_url:
                suffix["iconUrl"] = icon_url
        except Exception as e:
            print(f"Failed to fetch icon for suffix '{suffix['text']}': {e}", file=sys.stderr)

    return matrix


def generate_matrix(base: str) -> dict:
    """
    Generate a complete word matrix for a given base morpheme(s) using Claude API.

    Args:
        base: The base morpheme(s) - can be single or multiple separated by ' + '

    Returns:
        Dictionary containing the word matrix in the specified format
    """
    prompt = f"""You are an expert linguist specializing in structured word inquiry and English morphology.

Generate a precise word matrix for the base morpheme(s): "{base}"

CRITICAL RULES - FOLLOW STRICTLY:
1. ONLY include prefixes/suffixes that form REAL, COMMON English words with this base
2. Do NOT invent morphemes - use only established, documented morphemes
3. Do NOT include rare, archaic, or highly technical forms
4. Prefixes and suffixes must be appropriate for an educational setting (K-12 or undergraduate)
5. Return morphemes WITHOUT hyphens in the "text" field (e.g., "con", not "con-")
6. Before including any morpheme, internally verify it forms at least one real English word
7. If the input contains multiple bases (e.g., "auto + mobile"), include EACH base in the "bases" array

VERIFICATION PROCESS:
- For each prefix, confirm: prefix + base = real English word
- For each suffix, confirm: base + suffix = real English word
- If you cannot verify a real word, DO NOT include that morpheme

JSON STRUCTURE FOR SINGLE BASE:
{{
  "bases": [
    {{"text": "<base morpheme>", "meaning": "<concise definition>"}}
  ],
  "prefixes": [
    {{"text": "<prefix>", "meaning": "<concise meaning>"}}
  ],
  "suffixes": [
    {{"text": "<suffix>", "meaning": "<concise meaning>"}}
  ]
}}

JSON STRUCTURE FOR COMPOUND (TWO BASES):
{{
  "bases": [
    {{"text": "<first base>", "meaning": "<concise definition>"}},
    {{"text": "<second base>", "meaning": "<concise definition>"}}
  ],
  "prefixes": [
    {{"text": "<prefix>", "meaning": "<concise meaning>"}}
  ],
  "suffixes": [
    {{"text": "<suffix>", "meaning": "<concise meaning>"}}
  ]
}}

EXAMPLE 1 - Single base "struct":
{{
  "bases": [
    {{"text": "struct", "meaning": "to build or arrange"}}
  ],
  "prefixes": [
    {{"text": "con", "meaning": "together"}},
    {{"text": "de", "meaning": "down, away"}},
    {{"text": "in", "meaning": "in, into"}},
    {{"text": "re", "meaning": "again"}}
  ],
  "suffixes": [
    {{"text": "ure", "meaning": "action or result"}},
    {{"text": "ion", "meaning": "act or process"}},
    {{"text": "ive", "meaning": "having nature of"}},
    {{"text": "or", "meaning": "one who does"}},
    {{"text": "al", "meaning": "relating to"}}
  ]
}}
Verified words: construct, destruct, instruct, restructure, destruction, instructive, instructor, structural

EXAMPLE 2 - Compound "auto + mobile":
{{
  "bases": [
    {{"text": "auto", "meaning": "self"}},
    {{"text": "mobile", "meaning": "move, movable"}}
  ],
  "prefixes": [],
  "suffixes": [
    {{"text": "s", "meaning": "plural"}}
  ]
}}

Now generate the matrix for: {base}

IMPORTANT: Return ONLY valid JSON with verified morphemes. No markdown, no explanation, no extra text."""

    try:
        response = call_llm(prompt)

        # Clean the response (remove markdown code blocks if present)
        cleaned_response = clean_json_response(response)

        # Try to parse the response as JSON
        matrix = json.loads(cleaned_response)

        # Validate the structure
        required_keys = ["bases", "prefixes", "suffixes"]
        if not all(key in matrix for key in required_keys):
            raise ValueError(f"Matrix missing required keys. Got: {matrix.keys()}")

        print(f"Generated matrix for base '{base}'", file=sys.stderr)
        return matrix

    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response for base '{base}': {e}", file=sys.stderr)
        print(f"Cleaned response was: {cleaned_response}", file=sys.stderr)
        raise ValueError(f"AI did not return valid JSON: {e}")
    except Exception as e:
        print(f"Error generating matrix for '{base}': {e}", file=sys.stderr)
        raise


def analyze_word_in_context(word: str, base: str, context: dict = None) -> dict:
    """
    Analyze a specific word: definition, word sum, etymology, and relatives.

    Args:
        word: The original word tapped by the user
        base: The extracted base morpheme(s)
        context: Optional dict with bookTitle and pageText for better definitions

    Returns:
        Dictionary with definition, wordSum, etymology, and relatives
    """
    # Build context section for the prompt
    context_section = ""
    if context:
        book_title = context.get("bookTitle", "")
        page_text = context.get("pageText", "")
        if book_title or page_text:
            context_section = "\nCONTEXT FOR DEFINITION:\n"
            if book_title:
                context_section += f'This word appears in the book "{book_title}".\n'
            if page_text:
                context_section += f'The page text where it appears: "{page_text}"\n'
            context_section += "Use this context to make the definition relevant to how the word is used in the story. If the word is a made-up name or fantasy word, explain it as a character/place name from the story.\n"

    prompt = f"""You are an expert linguist specializing in structured word inquiry for kids.

Analyze the word "{word}" which has the base morpheme(s) "{base}".
{context_section}
Return a JSON object with exactly these four fields:

1. "definition": A brief, kid-friendly definition (1 sentence, simple language). If story context is provided, make the definition relevant to how the word is used in that story.
2. "wordSum": The word sum showing how "{word}" is built from its morphemes, separated by " + ". Use the ACTUAL morphemes (prefixes, base, suffixes). Example: "con + struct + ion" for "construction", "un + happy + ness" for "unhappiness", "re + play" for "replay". If the word IS the base with no affixes, just return the base itself.
3. "etymology": A brief, kid-friendly explanation of the word's origin. Include the language(s) it came from and what the original word(s) meant. Keep it simple and interesting (2-3 sentences max). Example: "From Latin 'struere' meaning 'to build or pile up'" or "From Greek 'tele' (far) and 'phone' (sound)".
4. "relatives": A list of 4-6 common English words built from the same base "{base}". Only include real, common words a child might encounter. Do NOT include the original word "{word}".

Examples:
Word "construction", base "struct":
{{"definition": "The process of building something", "wordSum": "con + struct + ion", "etymology": "From Latin 'struere' meaning 'to build or pile up'. The prefix 'con-' means 'together'.", "relatives": ["structure", "destruction", "instruct", "restructure"]}}

Word "unhappiness", base "happy":
{{"definition": "The feeling of not being happy", "wordSum": "un + happy + ness", "etymology": "From Middle English 'happy' meaning 'lucky or fortunate'. The prefix 'un-' means 'not' and '-ness' makes it a noun.", "relatives": ["happiness", "happily", "unhappy"]}}

Word "telephone", base "tele + phone":
{{"definition": "A device for talking to someone far away", "wordSum": "tele + phone", "etymology": "From Greek 'tele' meaning 'far' and 'phone' meaning 'sound or voice'. Invented in the 1870s.", "relatives": ["telephonic", "telephones", "cellphone", "smartphone"]}}

Now analyze: "{word}" with base "{base}"

Return ONLY valid JSON. No markdown, no explanation."""

    try:
        response = call_llm(prompt)
        cleaned = clean_json_response(response)
        result = json.loads(cleaned)
        print(f"Analyzed word in context: '{word}'", file=sys.stderr)
        return result
    except Exception as e:
        print(f"Error analyzing word in context '{word}': {e}", file=sys.stderr)
        # Return fallback so the app still works
        return {
            "definition": f"A word related to {base}",
            "wordSum": word,
            "etymology": "Etymology unavailable",
            "relatives": []
        }


def generate_visual_concept(word: str) -> str:
    """
    Generate a simple, concrete visual concept for icon search.

    Args:
        word: The word to visualize

    Returns:
        Simple noun phrase (e.g., "hardhat", "book")
    """
    prompt = f"""You are an expert at converting words into simple, concrete visual representations.

Your task: Generate 1-3 simple nouns that represent "{word}" visually.

CRITICAL RULES:
1. Return ONLY concrete, physical objects - no abstract concepts
2. Prefer everyday objects that children would recognize
3. Use simple, common English words (1-2 words maximum)
4. Return plain text only - no JSON, no markdown, no explanation
5. If multiple concepts, separate with comma
6. Think about what icon would help a child understand this word

Examples:
- "construction" → "hardhat"
- "education" → "book"
- "telephone" → "phone"
- "transportation" → "car"
- "happiness" → "smile"
- "writing" → "pencil"

Word to visualize: {word}

Return ONLY the simple noun(s), nothing else."""

    try:
        # Use existing Claude client with lower temperature for consistency
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=50,
            temperature=0.1,  # Lower than usual 0.3 for consistency
            messages=[{"role": "user", "content": prompt}]
        )
        concept = message.content[0].text.strip()

        # Take only first concept if multiple returned
        concept = concept.split(',')[0].strip()

        print(f"Generated visual concept for '{word}': '{concept}'", file=sys.stderr)
        return concept
    except Exception as e:
        print(f"Error generating visual concept for '{word}': {e}", file=sys.stderr)
        return word  # Fallback: use word itself


def fetch_noun_project_icon(concept: str, word: str) -> str:
    """
    Fetch an icon from The Noun Project API.

    Args:
        concept: Visual concept to search for (e.g., "hardhat")
        word: Original word (used for caching filename)

    Returns:
        Path to downloaded icon file, or None if unavailable
    """
    # Step 1: Check cache first
    icon_dir = os.path.join(os.path.dirname(__file__), "public", "icons")
    icon_path = os.path.join(icon_dir, f"{word}.png")
    web_path = f"/icons/{word}.png"

    if os.path.exists(icon_path):
        print(f"Cache hit! Using cached icon for '{word}'", file=sys.stderr)
        return web_path

    # Step 2: Ensure icons directory exists
    try:
        os.makedirs(icon_dir, exist_ok=True)
    except Exception as e:
        print(f"Error creating icons directory: {e}", file=sys.stderr)
        return None

    # Step 3: Get API credentials
    api_key = os.environ.get("NOUN_PROJECT_KEY")
    api_secret = os.environ.get("NOUN_PROJECT_SECRET")

    if not api_key or not api_secret:
        print("Warning: NOUN_PROJECT_KEY or NOUN_PROJECT_SECRET not set", file=sys.stderr)
        return None

    # Step 4: Set up OAuth1 authentication
    auth = OAuth1(api_key, api_secret)

    # Step 5: Search for icon
    try:
        print(f"Searching Noun Project for: '{concept}'", file=sys.stderr)

        search_url = "https://api.thenounproject.com/v2/icon"
        params = {
            "query": concept,
            "limit": 1,
            "thumbnail_size": 200
        }

        response = requests.get(search_url, auth=auth, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        icons = data.get("icons", [])

        if not icons:
            print(f"No icons found for concept '{concept}'", file=sys.stderr)
            return None

        # Step 6: Get thumbnail URL
        icon_data = icons[0]
        thumbnail_url = icon_data.get("thumbnail_url")

        if not thumbnail_url:
            print(f"No thumbnail URL in icon data", file=sys.stderr)
            return None

        print(f"Found icon: {icon_data.get('term', 'unknown')} (ID: {icon_data.get('id', 'N/A')})", file=sys.stderr)

        # Step 7: Download icon
        print(f"Downloading icon from: {thumbnail_url}", file=sys.stderr)
        icon_response = requests.get(thumbnail_url, timeout=10)
        icon_response.raise_for_status()

        # Step 8: Save to file
        with open(icon_path, 'wb') as f:
            f.write(icon_response.content)

        print(f"Icon saved to: {icon_path}", file=sys.stderr)
        return web_path

    except requests.exceptions.RequestException as e:
        print(f"API request failed for concept '{concept}': {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error fetching icon for '{concept}': {e}", file=sys.stderr)
        return None


def get_word_matrix(word: str, context: dict = None) -> dict:
    """
    Main function to get a word matrix for any input word.

    This function:
    1. Extracts the base morpheme from the word
    2. Checks the cache for an existing matrix
    3. Generates a new matrix if needed
    4. Analyzes the word (definition, word sum, etymology, relatives)
    5. Generates visual concept and fetches icon
    6. Returns the complete analysis with optional icon

    Args:
        word: The input word to analyze
        context: Optional dict with bookTitle and pageText for better definitions

    Returns:
        Dictionary containing the complete word matrix and optional icon path
    """
    print(f"Processing word: {word}", file=sys.stderr)
    if context:
        print(f"Context: book='{context.get('bookTitle', '')}', pageText length={len(context.get('pageText', ''))}", file=sys.stderr)

    # Step 1: Extract the base morpheme
    base = extract_base(word)

    # Step 2: Check cache for the matrix
    if base in matrix_cache:
        print(f"Cache hit! Using cached matrix for '{base}'", file=sys.stderr)
        matrix = matrix_cache[base]
    else:
        print(f"Cache miss. Generating new matrix for '{base}'", file=sys.stderr)
        matrix = generate_matrix_with_icons(base)
        matrix_cache[base] = matrix

    # Step 3: Get word-specific analysis (definition, word sum, relatives)
    word_analysis = analyze_word_in_context(word, base, context)

    # Step 4: Fetch icon using the word directly
    icon_path = None
    try:
        icon_path = fetch_noun_project_icon(word, word)
    except Exception as e:
        print(f"Icon generation failed (non-critical): {e}", file=sys.stderr)
        # Continue without icon

    return {
        "definition": word_analysis.get("definition", ""),
        "wordSum": word_analysis.get("wordSum", word),
        "etymology": word_analysis.get("etymology", "Etymology unavailable"),
        "relatives": word_analysis.get("relatives", []),
        "matrix": matrix,
        "icon": icon_path,
        "visualConcept": word if icon_path else None,
    }


def generate_tts_with_syllables(word: str, output_path: str = None) -> str:
    """
    Generate a TTS audio file that pronounces a word.

    Args:
        word: The word to pronounce
        output_path: Optional path for the output audio file. If None, uses temp file.

    Returns:
        Path to the generated audio file
    """
    try:
        if openai_client is None:
            raise RuntimeError("OPENAI_API_KEY not set — TTS unavailable")
        print(f"Generating TTS for word: {word}", file=sys.stderr)

        # Generate TTS for the word
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",  # You can change to: alloy, echo, fable, onyx, nova, shimmer
            input=word
        )

        # Determine output path
        if output_path is None:
            temp_dir = tempfile.mkdtemp()
            output_path = os.path.join(temp_dir, f"{word}_tts.mp3")

        # Save the audio file
        response.stream_to_file(output_path)
        print(f"TTS audio generated: {output_path}", file=sys.stderr)

        return output_path

    except Exception as e:
        print(f"Error generating TTS for '{word}': {e}", file=sys.stderr)
        raise


def generate_tts_base64(word: str) -> str:
    """
    Generate TTS audio and return as base64 encoded string.

    Args:
        word: The word to pronounce

    Returns:
        Base64 encoded audio data
    """
    try:
        # Generate the audio file
        audio_path = generate_tts_with_syllables(word)

        # Read the file and encode to base64
        with open(audio_path, 'rb') as audio_file:
            audio_data = audio_file.read()
            base64_audio = base64.b64encode(audio_data).decode('utf-8')

        # Clean up the temporary file
        os.remove(audio_path)

        return base64_audio

    except Exception as e:
        print(f"Error generating base64 TTS for '{word}': {e}", file=sys.stderr)
        raise


# CLI: python3 main.py <word> [contextJson]
# Outputs JSON to stdout for the Next.js API route.
if __name__ == "__main__":
    if len(sys.argv) >= 2:
        word = sys.argv[1]
        context = None
        if len(sys.argv) >= 3:
            try:
                context = json.loads(sys.argv[2])
            except json.JSONDecodeError:
                print("Warning: could not parse context JSON, ignoring", file=sys.stderr)
        result = get_word_matrix(word, context)
        print(json.dumps(result))
    else:
        print("Usage: python3 main.py <word> [contextJson]", file=sys.stderr)
        sys.exit(1)