# kanyoai

kanyoai is a static Vite/React website builder for templates, a visual editor, a code playground, and an AI website generator backed by Supabase Edge Functions.

## Run locally

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and add your Supabase values.

## Build

```bash
npm run build
```

The production static site is written to `dist/static`.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the GitHub repo in Vercel.
3. Vercel will use `vercel.json`:
   - Build command: `npm run build`
   - Output directory: `dist/static`
4. Add these Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

Do not add the OpenAI secret key to Vercel for the frontend. Store it only in Supabase Edge Function secrets as `OPENAI_API_KEY`. Use `gpt-5.2` for the premium generator, `gpt-5-mini` for the cheaper default, or `gpt-5-nano` for fast drafts.

## Supabase

Run the SQL in `supabase/RUN_THIS_SQL_IN_SUPABASE.sql`, then deploy `supabase/functions/ai-generate-site`. The AI builder calls that function after the user signs in.
