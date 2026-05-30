# AI Provider Setup

Do not put AI provider keys in frontend code, `VITE_` variables, `NEXT_PUBLIC_` variables, or committed env files. Use server-side environment variables only.

This app's Vercel API routes read these optional server-side keys:

```text
OPENAI_API_KEY=your_openai_key_here
XAI_API_KEY=your_xai_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
```

For production, add the keys in the Vercel project environment settings.

For local development, put them in `.env.local`, which is ignored by git.

## Supabase Edge Function Legacy Setup

If you also run the older Supabase Edge Function flow, store the OpenAI key as a Supabase secret:

```bash
npx supabase secrets set OPENAI_API_KEY="your_openai_key_here" --project-ref your-project-ref
npx supabase functions deploy ai-generate-site --project-ref your-project-ref
```

Optional model defaults:

```bash
npx supabase secrets set OPENAI_MODEL="gpt-5-mini" --project-ref your-project-ref
npx supabase secrets set OPENAI_MAX_OUTPUT_TOKENS="12000" --project-ref your-project-ref
```
