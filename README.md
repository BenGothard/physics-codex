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

This repository includes an Actions workflow at `.github/workflows/deploy-pages.yml` that:

1. Runs on pushes to `main` (and manually via `workflow_dispatch`).
2. Builds a deploy artifact in `dist/`.
3. Detects whether the repository is a **user/org site** (`<owner>.github.io`) or a **project site**.
4. Injects a `<base href="...">` in the built `index.html` so routes/assets resolve correctly:
   - User/org site: `/`
   - Project site: `/<repository-name>/`
5. Deploys with `actions/deploy-pages`.

### Required GitHub repository settings

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Go to **Settings → Actions → General** and ensure workflow permissions allow deployments:
   - **Read repository contents and packages** (minimum)
   - The workflow itself requests `pages: write` and `id-token: write` permissions for deployment.
4. (Optional) Configure a custom domain in **Settings → Pages → Custom domain**, then enable **Enforce HTTPS** once DNS is propagated.

### Post-deploy smoke checklist

After each deploy, validate the published URL (from the workflow run output):

- [ ] Home page loads without console errors.
- [ ] In-page routes/anchors resolve correctly (`#dashboard`, `#topic-chapter`, `#interactive-lesson`, etc.).
- [ ] Static assets resolve (CSS and JavaScript load from the expected Pages base path).
- [ ] Content data files resolve (for example `content/lectures/v1/index.json` returns `200 OK`).
