# Reclaim Web

A deployable Reclaim web app with:

- React + Vite frontend
- Express backend
- local SQLite for development
- hosted Postgres support for production
- account login and session handling
- OpenAI and Claude API key linking per user
- `.txt`, `.md`, `.docx`, and `.pdf` import
- AI summaries and house-style presentation generation
- `.pptx` export from generated presentation structures

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

This starts:

- web app on `http://localhost:5173`
- API on `http://localhost:8787`

During development, Vite proxies `/api/*` to the local backend.

## Environment variables

Copy `.env.example` to `.env` and set what you need.

Important values:

- `PORT`: backend port
- `CORS_ORIGIN`: allowed frontend origin for API calls
- `VITE_API_BASE_URL`: frontend API base URL
- `DATABASE_URL`: set this in production to use hosted Postgres
- `DATABASE_SSL`: use `require` for most hosted Postgres providers

If `DATABASE_URL` is empty, the app falls back to local SQLite in `server/data/reclaim-web.sqlite`.

## Production build

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run start
```

In production, the Express server serves the built frontend from `dist/`.

## Hosting

This repo is prepared for container-based hosting.

Included:

- `Dockerfile`
- `railway.json`

### Railway setup

1. Create a new Railway project from this repo.
2. Add a Postgres service in Railway.
3. Set these variables on the web service:
   - `DATABASE_URL`
   - `DATABASE_SSL=require`
   - `CORS_ORIGIN=https://your-domain.com`
   - `VITE_API_BASE_URL=` if frontend and API share the same domain
4. Deploy.

Because the backend serves the built frontend, one web service is enough.

## Recommended production stack

- Hosting: Railway
- Database: Railway Postgres or Supabase Postgres
- AI calls: user-linked OpenAI or Claude API keys stored server-side in the database

## Current product flow

1. Create an account.
2. Go to `Settings`.
3. Link an OpenAI or Claude API key.
4. Set brand tone, color, and slide rules.
5. Upload source files or paste report text.
6. Generate summaries and presentation structures in house style.
