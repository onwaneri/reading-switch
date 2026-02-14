# Reading SWItch

An interactive picture book app that uses Structured Word Inquiry (SWI) to help kids learn to read. Upload a PDF of a picture book, tap any word, and see its morphological breakdown — prefixes, bases, suffixes, etymology, and word families.

Built at TreeHacks 2025.

## Setup

**Prerequisites:** Node.js 18+, Python 3 with `pdfminer.six` (`pip install pdfminer.six`)

```bash
npm install
```

Create `.env.local` with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Running

```bash
npm run dev
```

Open http://localhost:3000, upload a PDF, and start tapping words.

## How It Works

1. **Upload** — Client renders each PDF page to PNG via `pdfjs-dist`, sends to server
2. **OCR** — Server runs `scripts/extract_words.py` (pdfminer.six) to extract word bounding boxes as percentages
3. **Read** — Reader page renders page images with invisible, clickable word overlays positioned over each word
4. **Analyze** — Tapping a word calls `/api/analyze` which returns an SWI breakdown (word sum, morphemes, etymology, word family)
5. **Display** — Right-side panel slides in showing color-coded morpheme chips and analysis at the selected depth level

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Landing / upload page
│   ├── reader/page.tsx         # Book reader with SWI panel
│   └── api/
│       ├── analyze/route.ts    # SWI word analysis endpoint
│       └── upload/route.ts     # PDF image storage + OCR
├── components/
│   ├── UploadForm.tsx          # PDF upload + client-side rendering
│   ├── BookPage.tsx            # Page image + word overlays
│   ├── WordOverlay.tsx         # Clickable word button over text
│   ├── SWIPanel.tsx            # Right-side analysis panel
│   └── DepthSelector.tsx       # Analysis depth toggle
├── lib/
│   └── wordCache.ts            # In-memory SWI analysis cache
└── types/
    └── book.ts                 # Shared types (WordPosition, SWIAnalysis, etc.)
```

## Key Integration Points

**SWI Analysis Logic** — Replace the mock `analyzeWithClaude()` function in `src/app/api/analyze/route.ts`. It should return data conforming to the `SWIAnalysis` type from `src/types/book.ts`.

**Frontend Styling** — Components have semantic structure ready for restyling. Morpheme color coding (blue=prefix, green=base, orange=suffix) is functional, everything else is open for design changes.

## Scripts

```bash
npm run dev       # Dev server at localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```
