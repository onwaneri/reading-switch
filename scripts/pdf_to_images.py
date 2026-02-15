#!/usr/bin/env python3
"""Convert PDF pages to PNG images.

Usage:
    python3 pdf_to_images.py <pdf_path> <output_dir>

Converts each page of the PDF to a PNG image saved in the output directory
as page-1.png, page-2.png, etc.

Requires: pdf2image library and poppler-utils
Install: pip install pdf2image
On Windows, you may also need to install poppler separately.
"""

import sys
import os
from pdf2image import convert_from_path


def pdf_to_images(pdf_path, output_dir):
    """Convert PDF to images and save them."""
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Convert PDF to images (150 DPI - good balance of quality and speed)
    images = convert_from_path(pdf_path, dpi=150)

    # Save each page as PNG
    for i, image in enumerate(images, start=1):
        output_path = os.path.join(output_dir, f'page-{i}.png')
        image.save(output_path, 'PNG')

    return len(images)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: pdf_to_images.py <pdf_path> <output_dir>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]

    try:
        num_pages = pdf_to_images(pdf_path, output_dir)
        print(f"Converted {num_pages} pages")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
