# Suraksha Grid — Deployment Guide

This folder deploys to **Vercel** or **Netlify**, free tier, no credit card needed for hosting.
The AI backend auto-detects whichever provider you configure: **Groq** (recommended — free,
fast, reliable), **Google Gemini**, or **Azure OpenAI**. Storage uses free **Upstash Redis**.

---

## Step 0 — Get your credentials

### A. Pick an LLM provider

**Option 1 — Groq (recommended):**
1. Go to https://console.groq.com/keys
2. Sign up free, no card required → "Create API Key"
3. Copy it → `GROQ_API_KEY`
4. Groq is OpenAI-compatible and tends to be very reliable/fast. The default model
   (`meta-llama/llama-4-scout-17b-16e-instruct`) is vision-capable, so both tabs work.

**Option 2 — Gemini:**
1. https://aistudio.google.com/apikey → "Create API key" → choose **"Create API key in NEW project"**
   specifically (keys tied to existing projects have sometimes hit `limit:0` quota errors)
2. Copy it → `GEMINI_API_KEY`

**Option 3 — Azure OpenAI:**
1. In Azure Portal, create/use an Azure OpenAI resource
2. Deploy a **vision-capable** model (`gpt-4o` or `gpt-4o-mini` — plain `gpt-4` is usually text-only)
3. Copy the **Key** and **Endpoint** from "Keys and Endpoint" — copy the endpoint exactly as
   shown, do not append any path to it
4. Note your deployment's name
5. → `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`

You only need to set variables for **one** of these three options.

### B. Upstash Redis (free storage)
1. https://console.upstash.com → sign up free, no card
2. Create a database → any nearby region → "Regional" is fine
3. On the database page, open **REST API** → copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## Step 1 — Push this folder to GitHub

```bash
cd suraksha-grid-deploy
git init
git add .
git commit -m "Suraksha Grid prototype"
git remote add origin https://github.com/<your-username>/suraksha-grid.git
git branch -M main
git push -u origin main
```

---

## Step 2A — Deploy on Vercel

1. vercel.com → sign in with GitHub → "Add New Project" → import your repo
2. Framework preset: **"Other"** (no build command needed)
3. Before deploying, add environment variables — just ONE provider's block, plus the two
   Upstash variables:
   - `GROQ_API_KEY` (+ optionally `GROQ_MODEL`), **or**
   - `GEMINI_API_KEY` (+ optionally `GEMINI_MODEL`), **or**
   - `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Click **Deploy**.
5. Test the live URL: submit a scam report → real AI verdict; check Command Center → report
   appears in the feed; try Currency Check → upload a note photo.

Redeploy after changing any environment variable — hosts don't hot-reload them into
already-built deployments.

---

## Step 2B — Deploy on Netlify (alternative)

1. app.netlify.com → "Add new site" → import your repo
2. Build command empty, publish directory `.` (already configured via `netlify.toml`)
3. Add the same environment variables under Site settings → Environment variables
4. Deploy.

---

## How it fits together

```
Browser (index.html)
   │
   ├── POST /api/llm  → serverless function → auto-detects Groq, Gemini,
   │                     or Azure from your env vars → translates the
   │                     request into that provider's format → calls it
   │                     with the secret key → translates the reply back
   │                     to a common shape
   │
   └── POST /api/kv   → serverless function → Upstash Redis (free)
                         → stores/retrieves reports for the
                           Command Center's live clustering
```

Your API key(s) and Upstash token live only in server-side environment variables — never
shipped to the browser.

---

## Switching providers later

Just change the environment variables on your host and redeploy — no code changes needed.
If you have more than one provider's variables set at once (e.g. testing), add:
```
LLM_PROVIDER=groq
```
(or `gemini` / `azure`) to be explicit about which one `/api/llm` should use.
Default priority if unset: Gemini > Groq > Azure.

---

## Costs at hackathon scale

- **Vercel/Netlify hosting**: free tier is plenty
- **Upstash Redis**: free tier = 10,000 commands/day — a demo won't come close
- **Groq**: generous free tier, usually the most trouble-free option for a hackathon
- **Gemini**: free tier (rate-limited) — usually enough for testing and judging
- **Azure OpenAI**: pay-as-you-go through your Azure subscription; set a budget alert in
  Azure Cost Management if concerned

---

## Common issues

| Symptom | Likely cause |
|---|---|
| Verdict never loads, console shows 500 from `/api/llm` | Wrong/missing provider env vars, or forgot to redeploy after adding them |
| "fetch failed" (Azure) | The `AZURE_OPENAI_ENDPOINT` hostname doesn't resolve — copy it fresh from Azure Portal's Keys and Endpoint page, don't retype it |
| "model not found" (Groq) | Groq's model lineup changes — check console.groq.com for the current vision-capable model name, set `GROQ_MODEL` to override |
| "Gemini blocked the request" | Safety filter tripped — rare for this use case, try rephrasing |
| Works for text reports but fails on Currency Check | Your configured model isn't vision-capable — switch providers or deployment |
| Command Center always empty | `UPSTASH_REDIS_REST_URL`/`TOKEN` missing, or typo (must start with `https://`) |
| Netlify functions 404 | Confirm `netlify.toml` was committed and pushed — it must sit at the repo root |
