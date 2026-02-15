#!/usr/bin/env python3
import sys
import json
from internetarchive import search_items

def search_gutenberg(query):
    """Search Internet Archive for Gutenberg collection books"""
    try:
        search_query = f'{query} AND collection:gutenberg AND mediatype:texts'
        results = search_items(search_query)

        books = []
        count = 0
        for item in results:
            if count >= 20:
                break

            metadata = item.get('metadata', {})
            books.append({
                'identifier': item.get('identifier', ''),
                'title': metadata.get('title', 'Unknown Title'),
                'creator': metadata.get('creator', '') or metadata.get('author', ''),
            })
            count += 1

        return books
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Query parameter required'}), file=sys.stderr)
        sys.exit(1)

    query = sys.argv[1]
    results = search_gutenberg(query)
    print(json.dumps(results))
