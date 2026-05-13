# kanyoai OpenAI API Setup

Do not put your OpenAI API key in the Hostinger files, `src`, `.env`, or any `VITE_` / `NEXT_PUBLIC_` variable. Those files are public in the browser.

The kanyoai AI builder reads the key from the Supabase Edge Function secret named `OPENAI_API_KEY`.

## Put The Key In Supabase

Use one of these methods.

### Supabase Dashboard

1. Open your Supabase project.
2. Go to Edge Functions.
3. Open Secrets.
4. Add this secret:

```text
OPENAI_API_KEY=your_openai_key_here
```

5. Deploy or redeploy the `ai-generate-site` function.

### Supabase CLI

```bash
npx supabase secrets set OPENAI_API_KEY="your_openai_key_here" --project-ref kuyjkbbbmsbtvsrjkrbi
npx supabase functions deploy ai-generate-site --project-ref kuyjkbbbmsbtvsrjkrbi
```

Optional model defaults:

```bash
npx supabase secrets set OPENAI_MODEL="gpt-5-mini" --project-ref kuyjkbbbmsbtvsrjkrbi
npx supabase secrets set OPENAI_MAX_OUTPUT_TOKENS="12000" --project-ref kuyjkbbbmsbtvsrjkrbi
```

## Local Testing

For local Supabase function testing only, create a local file that is not committed:

```text
supabase/.env.local
```

Example:

```text
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-5-mini
OPENAI_MAX_OUTPUT_TOKENS=12000
```

Then run:

```bash
npx supabase functions serve ai-generate-site --env-file supabase/.env.local
```

The frontend calls:

```text
https://kuyjkbbbmsbtvsrjkrbi.supabase.co/functions/v1/ai-generate-site
```

So on Hostinger, the static site does not need the OpenAI key. Hostinger only serves the frontend; Supabase safely calls OpenAI from the server side.
