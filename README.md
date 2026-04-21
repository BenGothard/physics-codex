# Physics Codex

Physics Codex is a static self-study physics tutor aimed at college-intro learners. It keeps the deployment model lightweight while expanding the learning experience into:

- structured lessons with objectives, equations, worked examples, and common mistakes
- inline interactive labs driven by lecture JSON content
- four challenge modes per lesson
- local progress, notes, streaks, XP, badges, and recommendation logic

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
│   ├── gamification.js
│   ├── ingest_lectures.py
│   ├── main.js
│   └── validate_content.py
└── styles/
    └── main.css
```

## Raw content format

Each source file under `content/raw/*.txt` uses labeled sections. In addition to the original lecture summary fields, the v1.5 format includes:

- `Unit Title`
- `Unit Slug`
- `Unit Summary`
- `Estimated Minutes`
- `Learning Objectives`
- `Quick Recap`
- `Equations`
- `Worked Examples`
- `Common Mistakes`
- `Checkpoints`
- `Interactive Lab`
- `Challenge Sets`

Object-heavy sections use pipe-delimited key/value fields on bullet lines. Lists inside those objects use `||` as the separator.

## Content ingestion workflow

1. Add or update raw lecture text files in `content/raw/*.txt`.
2. Run ingestion to normalize content into versioned JSON lecture files:

```bash
python3 scripts/ingest_lectures.py --version v1
```

3. Validate all lecture files before publishing:

```bash
python3 scripts/validate_content.py --lectures-dir content/lectures
```

4. Keep attribution and legal-use notes up to date in `content/SOURCES.md`.

## Local preview

Because this is static HTML/CSS/JS, use a local static server for reliable content fetches:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## GitHub Pages deployment

This repository includes an Actions workflow at `.github/workflows/deploy-pages.yml` that:

1. Runs on pushes to `main` and via `workflow_dispatch`.
2. Builds a deploy artifact in `dist/`.
3. Detects whether the repository is a user/org site or project site.
4. Injects the correct `<base href="...">` into the built `index.html`.
5. Deploys with `actions/deploy-pages`.

## Post-deploy smoke checklist

- [ ] Home page loads without console errors.
- [ ] Unit selection loads the correct lesson and practice content.
- [ ] Notes and completion state persist after refresh.
- [ ] Each challenge mode renders and records progress correctly.
- [ ] Static assets and lecture JSON resolve from the correct GitHub Pages base path.
