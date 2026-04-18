# Physics Codex

A lightweight static web app scaffold for learning physics with a clear top-level information architecture:

- Learn
- Play
- Challenges
- Progress
- Profile

## Project structure

```text
.
├── assets/
├── content/
│   ├── SOURCES.md
│   ├── lectures/
│   │   └── v1/
│   ├── raw/
│   └── schema/
├── docs/
├── index.html
├── scripts/
│   ├── ingest_lectures.py
│   ├── main.js
│   └── validate_content.py
└── styles/
    └── main.css
```

## Content ingestion workflow

1. Add or update raw lecture text files in `content/raw/*.txt`.
2. Run ingestion to normalize content into versioned JSON lecture files:

```bash
python3 scripts/ingest_lectures.py --version v1
```

3. Validate all chapter files before publishing:

```bash
python3 scripts/validate_content.py --lectures-dir content/lectures
```

4. Keep attribution and legal-use notes up to date in `content/SOURCES.md`.

## Local preview

Because this is static HTML/CSS/JS, you can preview it in several ways.

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Run a local static server (recommended)

From the repo root:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## GitHub Pages deployment

This scaffold supports either GitHub Pages source mode:

### Serve from repository root (`/`)

1. In GitHub: **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select your branch (for example, `main`) and folder **`/ (root)`**.
4. Save.

### Serve from `/docs`

1. In GitHub: **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select your branch and folder **`/docs`**.
4. Save.

`docs/index.html` includes a redirect to `../index.html` so Pages can be configured consistently while keeping the main source at repo root.
