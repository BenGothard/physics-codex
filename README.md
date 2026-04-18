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
├── docs/
├── index.html
├── scripts/
│   └── main.js
└── styles/
    └── main.css
```

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
