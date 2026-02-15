# Reading SWItch

An interactive picture book app that uses Structured Word Inquiry (SWI) to help kids learn to read. Upload a PDF of a picture book, tap any word, and see its morphological breakdown — prefixes, bases, suffixes, etymology, and word families.

Built at TreeHacks 2025.

## Setup

**Prerequisites:**
- Node.js 18+
- Python 3

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

Create `.env.local` with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Initialize data directories:

```bash
mkdir -p data/users data/recommended
echo "[]" > data/users/users.json
```

## Running

```bash
npm run dev
```

Open http://localhost:3000, create an account, and start reading!

## Adding Recommended Books

1. Place PDF files in the `data/recommended/` folder
2. Visit the library page (PDFs auto-process on first load)

That's it! PDFs are automatically processed when you first access the library. Pages render on-demand for instant display. Manual processing is also available with `npm run setup-recommended`.

## How It Works

1. **Authentication** — File-based user accounts with bcrypt password hashing and HTTP-only cookie sessions
2. **Library** — Two collections: "My Library" (user's personal books) and "Recommended Library" (pre-processed PDFs)
3. **Recommended Processing** — PDFs in `data/recommended/` auto-process when library page loads:
   - Copy PDF to book directory
   - Extract word bounding boxes using `pdfminer.six`
   - Create book metadata (runs once, cached after)
4. **Upload** — Users can add their own PDFs via the web interface:
   - Server saves PDF and extracts word positions
   - Book is added to user's library
5. **Read** — Reader renders PDF pages on-demand using `pdfjs-dist` with invisible, clickable word overlays
6. **Analyze** — Tapping a word calls `/api/analyze` which uses Claude AI (Anthropic API) to return an SWI breakdown (word sum, morphemes, etymology, word family)
7. **Display** — Right-side panel shows color-coded morpheme chips and analysis at the selected depth level

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Login / registration page
│   ├── library/page.tsx             # Library with My Library and Recommended carousels
│   ├── upload/page.tsx              # PDF upload page
│   ├── reader/page.tsx              # Book reader with SWI panel
│   └── api/
│       ├── auth/                    # Authentication endpoints (login, register, logout, session)
│       ├── library/route.ts         # User library management
│       ├── recommended/route.ts     # Recommended books with auto-processing
│       ├── analyze/route.ts         # SWI word analysis via Claude AI
│       └── upload/route.ts          # PDF processing and storage
├── components/
│   ├── DropZone.tsx                 # Drag-and-drop file upload
│   ├── BookCard.tsx                 # Book thumbnail card
│   ├── BookCarousel.tsx             # Horizontal scrolling carousel
│   ├── BookPage.tsx                 # Page image + word overlays
│   ├── WordOverlay.tsx              # Clickable word button
│   ├── SWIPanel.tsx                 # Right-side analysis panel
│   ├── DepthSelector.tsx            # Analysis depth toggle
│   └── PageSearch.tsx               # In-book page search
├── contexts/
│   └── AuthContext.tsx              # Authentication state provider
├── lib/
│   ├── userManager.ts               # User CRUD operations
│   ├── sessionManager.ts            # Session management
│   ├── bookManager.ts               # Book metadata and auto-processing
│   └── wordCache.ts                 # In-memory SWI analysis cache
└── types/
    ├── auth.ts                      # User and Session types
    └── book.ts                      # Book, WordPosition, SWIAnalysis types

scripts/
├── extract_words.py                 # Extract word bounding boxes from PDF
└── setup-recommended.mjs            # One-time script to process recommended PDFs

data/
├── users/
│   └── users.json                   # User accounts
└── recommended/
    ├── index.json                   # Processed recommended books index
    └── *.pdf                        # Source PDFs (user-populated)
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
