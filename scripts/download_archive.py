#!/usr/bin/env python3
import sys
import json
import os
import uuid
from pathlib import Path
from internetarchive import get_item
import subprocess

def download_and_process_book(identifier):
    """Download a book from Internet Archive and process it"""
    try:
        item = get_item(identifier)
        metadata = item.metadata

        book_id = str(uuid.uuid4())
        title = metadata.get('title', 'Unknown Title')

        temp_dir = Path('temp')
        temp_dir.mkdir(exist_ok=True)

        pdf_found = False
        pdf_path = None

        for file_info in item.files:
            if file_info.get('format') == 'Text PDF':
                pdf_name = file_info.get('name')
                pdf_path = temp_dir / pdf_name

                item.download(files=[pdf_name], destdir=str(temp_dir))
                pdf_found = True
                break

        if not pdf_found:
            raise Exception('No PDF file found for this item')

        if not pdf_path or not pdf_path.exists():
            raise Exception('Failed to download PDF')

        books_dir = Path('public') / 'books' / book_id
        books_dir.mkdir(parents=True, exist_ok=True)

        import sys
        sys.path.insert(0, str(Path(__file__).parent))
        from extract_words import extract_words_from_pdf

        book_data = extract_words_from_pdf(str(pdf_path), title)
        book_data['id'] = book_id

        book_json_path = books_dir / 'book.json'
        with open(book_json_path, 'w', encoding='utf-8') as f:
            json.dump(book_data, f, indent=2)

        os.remove(pdf_path)

        return {
            'bookId': book_id,
            'title': title,
        }

    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Identifier parameter required'}), file=sys.stderr)
        sys.exit(1)

    identifier = sys.argv[1]
    result = download_and_process_book(identifier)
    print(json.dumps(result))
