#!/usr/bin/env python3
"""
Process recommended PDF books and create metadata index.
This script should be run whenever new PDFs are added to data/recommended/
"""

import json
import os
import uuid
from pathlib import Path
from datetime import datetime
import sys

def process_recommended_books():
    """Process all PDFs in data/recommended/ folder"""

    rec_dir = Path('data/recommended')
    rec_dir.mkdir(parents=True, exist_ok=True)

    index_file = rec_dir / 'index.json'

    if index_file.exists():
        with open(index_file, 'r', encoding='utf-8') as f:
            index = json.load(f)
    else:
        index = []

    processed_files = {entry['originalPath'] for entry in index}

    sys.path.insert(0, str(Path(__file__).parent))
    from extract_words import extract_words_from_pdf

    pdf_files = list(rec_dir.glob('*.pdf'))

    if not pdf_files:
        print("No PDF files found in data/recommended/")
        return

    new_count = 0
    for pdf_path in pdf_files:
        if pdf_path.name in processed_files:
            print(f"Skipping already processed: {pdf_path.name}")
            continue

        print(f"Processing: {pdf_path.name}")

        try:
            book_id = str(uuid.uuid4())
            title = pdf_path.stem.replace('_', ' ').replace('-', ' ').title()

            book_data = extract_words_from_pdf(str(pdf_path), title)
            book_data['id'] = book_id

            books_dir = Path('public/books') / book_id
            books_dir.mkdir(parents=True, exist_ok=True)

            book_json_path = books_dir / 'book.json'
            with open(book_json_path, 'w', encoding='utf-8') as f:
                json.dump(book_data, f, indent=2)

            index.append({
                'bookId': book_id,
                'title': title,
                'originalPath': pdf_path.name,
                'processedDate': datetime.now().isoformat(),
            })

            new_count += 1
            print(f"  ✓ Processed as book ID: {book_id}")

        except Exception as e:
            print(f"  ✗ Error processing {pdf_path.name}: {e}")
            continue

    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2)

    print(f"\nProcessed {new_count} new books")
    print(f"Total books in recommended library: {len(index)}")
    print(f"Index saved to: {index_file}")

if __name__ == '__main__':
    process_recommended_books()
