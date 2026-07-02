# Frontend

This directory contains the frontend application for the project (built with Vite + React). This README provides setup, development, build, environment, and deployment information to help contributors get started quickly.

---

## Table of contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Available scripts](#available-scripts)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Development notes & best practices](#development-notes--best-practices)
- [Building & deployment](#building--deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The frontend is a single-page application using React and Vite. It provides the user interface for interacting with the backend APIs, including authentication, project/deployment management, and UI components.

This README assumes the top-level `frontend` folder is the working directory when running commands.

## Prerequisites

- Node.js (recommended >= 16.x)
- npm or Yarn (examples below use `npm`)
- Git (to clone the repo)

Verify versions:

```bash
node --version
npm --version
```

## Quick start

1. Install dependencies

```bash
cd frontend
npm install
```

2. Start development server

```bash
npm run dev
```

3. Open your browser

Vite typically serves at `http://localhost:5173` (check terminal output).

## Available scripts

Run these from the `frontend` directory.

- `npm run dev` — Start development server (Vite hot-reload).
- `npm run build` — Create a production build in `dist/`.
- `npm run preview` — Preview the production build locally.
- `npm run lint` — Run linter (if configured).
- `npm test` — Run tests (if present / configured).

If a script referenced above does not exist in `package.json`, add or modify it to fit your workflow.

## Environment variables

Frontend configuration uses Vite environment variables. Create a `.env` file in the `frontend` folder or set variables in your CI provider. Prefix variables with `VITE_` so Vite exposes them to the client.

Common environment variables used in this project (examples):

- `VITE_API_URL` — Base URL of the backend API (e.g. `http://localhost:3000`)
- `VITE_FIREBASE_API_KEY` — Firebase API key (if using Firebase)
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_GOOGLE_CLIENT_ID` — OAuth client ID if applicable

Example `.env` (do not commit secrets):

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Project structure (high level)

- `index.html` — Vite entry HTML
- `package.json` — Frontend dependencies & scripts
- `vite.config.js` — Vite config
- `src/` — Application source code
	- `main.jsx` / `main.tsx` — App bootstrap
	- `App.jsx` — Top-level React component
	- `assets/` — Images, icons, static assets
	- `components/` — Reusable UI components (Navbar, Card, Forms, etc.)
	- `context/` — React context providers (AuthContext, etc.)
	- `pages/` — Page-level components (LandingPage, Dashboard, Login)
	- `services/` — API service wrappers and business logic
	- `hooks/` — Custom React hooks
	- `utils/` — Utility functions

Tip: Use this section to add any repo-specific conventions (naming, state management approach, routing strategy).

## Development notes & best practices

- Keep components small and focused. Prefer presentational and container separation when helpful.
- Use `src/services/api.js` (or equivalent) to centralize API calls and base URL usage.
- When adding environment variables, update README and `.env.example`.
- Use `ESLint` / `Prettier` for consistent formatting (configure pre-commit hooks as desired).
- For components that fetch data, prefer hooks that centralize loading and error handling.

## Building & deployment

1. Build for production

```bash
npm run build
```

2. Serve the production build locally (optional)

```bash
npm run preview
```

Deployment targets:

- Static hosts (Netlify, Vercel, GitHub Pages): upload `dist/` contents.
- Docker: use an Nginx static server to serve `dist/`.

Minimal Docker example (Dockerfile):

```Dockerfile
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Troubleshooting

- Dev server won't start: ensure required Node version, delete `node_modules` and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

- Backend CORS / API errors: ensure `VITE_API_URL` points to the running backend and the backend allows requests from the frontend origin.

- Environment variables not available in client: Vite only exposes variables prefixed with `VITE_`.

## Contributing

- Create a feature branch: `git checkout -b feat/your-feature`
- Follow existing code style and run linters/tests locally before opening a PR.
- Add or update tests for significant logic.

## License

Add project license information here (if available). If the repo uses a root-level license, refer to it.

---

If you'd like, I can:

- add a `.env.example` file showing common variables,
- update `package.json` scripts to match this README, or
- tailor the README to a specific hosting provider (Vercel/Netlify) or CI setup.

