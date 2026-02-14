"""
Backend for Structured Word Inquiry (SWI) word matrix generation.
Uses Claude API for morphological analysis.
"""

import json
import os
import sys
from typing import Dict
from anthropic import Anthropic

from dotenv import load_dotenv
load_dotenv(".local.env")



client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

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


def get_word_matrix(word: str, context: dict = None) -> dict:
    """
    Main function to get a word matrix for any input word.

    This function:
    1. Extracts the base morpheme from the word
    2. Checks the cache for an existing matrix
    3. Generates a new matrix if needed
    4. Returns the matrix JSON

    Args:
        word: The input word to analyze
        context: Optional dict with bookTitle and pageText for better definitions

    Returns:
        Dictionary containing the complete word matrix
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
        matrix = generate_matrix(base)
        matrix_cache[base] = matrix

    # Step 3: Get word-specific analysis (definition, word sum, relatives)
    word_analysis = analyze_word_in_context(word, base, context)

    return {
        "definition": word_analysis.get("definition", ""),
        "wordSum": word_analysis.get("wordSum", word),
        "etymology": word_analysis.get("etymology", "Etymology unavailable"),
        "relatives": word_analysis.get("relatives", []),
        "matrix": matrix,
    }


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
