#!/usr/bin/env python3
"""Extract word-level bounding boxes from a PDF using pdfminer.six.

Usage:
    python3 extract_words.py <pdf_path>

Outputs JSON to stdout matching the WordPosition schema:
    [{ "pageNumber": 1, "words": [{ "text", "x", "y", "width", "height" }] }]

All coordinates are percentages (0-100) in top-left origin.
"""

import sys
import json
import re

from pdfminer.high_level import extract_pages
from pdfminer.layout import LAParams, LTTextBox, LTTextLine, LTChar, LTAnno


def extract_words(pdf_path):
    laparams = LAParams(
        word_margin=0.1,
        char_margin=2.0,
    )

    result = []

    for page_num, page_layout in enumerate(
        extract_pages(pdf_path, laparams=laparams), start=1
    ):
        page_w = page_layout.width
        page_h = page_layout.height
        words = []

        for element in page_layout:
            if not isinstance(element, LTTextBox):
                continue
            for line in element:
                if not isinstance(line, LTTextLine):
                    continue

                # Walk characters, grouping non-space runs into words
                word_chars = []
                word_x0 = None
                word_y0 = None
                word_x1 = None
                word_y1 = None

                for char in line:
                    if not isinstance(char, (LTChar, LTAnno)):
                        continue

                    ch = char.get_text()

                    if ch.isspace():
                        # Flush current word
                        if word_chars and word_x0 is not None:
                            _emit_word(
                                word_chars, word_x0, word_y0, word_x1, word_y1,
                                page_w, page_h, words,
                            )
                        word_chars = []
                        word_x0 = word_y0 = word_x1 = word_y1 = None
                    else:
                        word_chars.append(ch)
                        # Only LTChar has a reliable bbox
                        if isinstance(char, LTChar):
                            if word_x0 is None:
                                word_x0 = char.x0
                                word_y0 = char.y0
                                word_x1 = char.x1
                                word_y1 = char.y1
                            else:
                                word_x0 = min(word_x0, char.x0)
                                word_y0 = min(word_y0, char.y0)
                                word_x1 = max(word_x1, char.x1)
                                word_y1 = max(word_y1, char.y1)

                # Flush last word in line
                if word_chars and word_x0 is not None:
                    _emit_word(
                        word_chars, word_x0, word_y0, word_x1, word_y1,
                        page_w, page_h, words,
                    )

        result.append({"pageNumber": page_num, "words": words})

    return result


def _emit_word(chars, x0, y0, x1, y1, page_w, page_h, out):
    text = "".join(chars)
    cleaned = re.sub(r"[^\w'-]", "", text)
    if not cleaned:
        return

    # PDF coords (bottom-left origin) -> percentage (top-left origin)
    x_pct = max(0.0, min(100.0, (x0 / page_w) * 100))
    y_pct = max(0.0, min(100.0, ((page_h - y1) / page_h) * 100))
    w_pct = max(0.0, min(100.0 - x_pct, ((x1 - x0) / page_w) * 100))
    h_pct = max(0.0, min(100.0 - y_pct, ((y1 - y0) / page_h) * 100))

    out.append({
        "text": cleaned,
        "x": round(x_pct, 4),
        "y": round(y_pct, 4),
        "width": round(w_pct, 4),
        "height": round(h_pct, 4),
    })


def extract_words_from_pdf(pdf_path, title):
    """
    Extract words from PDF and optionally render page images.
    Returns a book data structure compatible with the frontend.
    """
    pages_data = extract_words(pdf_path)

    book_data = {
        "title": title,
        "pages": pages_data,
    }

    return book_data


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(
            json.dumps({"error": "Usage: extract_words.py <pdf_path>"}),
            file=sys.stderr,
        )
        sys.exit(1)

    data = extract_words(sys.argv[1])
    print(json.dumps(data))
