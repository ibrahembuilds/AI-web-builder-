# AI Web Builder

Open-source AI website builder powered by React, Vite, Supabase, and serverless AI generation.

AI Web Builder helps users create, edit, preview, and export high-quality websites from a guided brief. It includes authentication, a project dashboard, a playground editor, custom brand colors, logo/image generation, and an edit agent that can update generated HTML/CSS/JS from natural language.

## Features

- AI website generation from a structured brief
- Natural-language edit agent for generated sites
- Custom brand color controls
- Logo direction and AI logo generation
- AI image generation and image direction controls
- Responsive preview/playground with exportable site files
- Supabase authentication and project storage
- Vercel-compatible serverless API routes
- OpenAI, xAI, and DeepSeek text model support

## Tech stack

- React 19
- Vite 7
- TypeScript
- Tailwind CSS 4
- Supabase Auth/Postgres
- Vercel serverless functions
- OpenAI image generation

## Requirements

- Node.js 20.19+ or 22.13+
- npm
- Supabase project
- AI provider key: OpenAI, xAI, or DeepSeek
- Vercel account for production deployment

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite.

On Windows PowerShell, copy the env file with:

```powershell
Copy-Item .env.example .env.local
```

## Environment variables

Create `.env.local` from `.env.example`.

Client-side Supabase values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Server-side values:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
XAI_API_KEY=
DEEPSEEK_API_KEY=
```

Only put server-side keys in `.env.local` or your hosting provider's secret environment variables. Never expose service-role or AI provider keys in frontend code.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL in `supabase/RUN_THIS_SQL_IN_SUPABASE.sql` from the Supabase SQL editor.
3. Copy your Supabase project URL and publishable key into `.env.local`.
4. Add the service-role key only to server-side environments.

## Scripts

```bash
npm run dev        # local development
npm run lint       # ESLint checks
npm run typecheck  # TypeScript checks
npm run build      # production static build
npm run preview    # preview the built app
```

The production static app is written to `dist/static`.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Use the existing `vercel.json` settings.
4. Add the environment variables from `.env.example`.
5. Deploy.

Required production secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Optional production secrets:

- `XAI_API_KEY`
- `DEEPSEEK_API_KEY`

## Production checklist

- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run build`
- Confirm `.env.local` is not committed
- Confirm Supabase RLS policies are installed
- Confirm Vercel has all server-side secrets
- Test signup, login, AI generation, image generation, edit, preview, and export

## Open source

This project is released under the MIT License. You can use it, modify it, deploy it, and build on top of it.

When contributing, keep changes focused, run the checks above, and do not commit secrets, generated build output, or local tool configuration.
