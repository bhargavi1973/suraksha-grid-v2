# 🛡️ SurakshaAI — AI Operating System for Digital Public Safety

**Stopping fraud before the money moves.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Netlify](https://img.shields.io/badge/deploy-Netlify-00C7B7?logo=netlify)](https://netlify.com)
[![Groq](https://img.shields.io/badge/AI-Groq-F97316)](https://groq.com)
[![Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=googlegemini)](https://ai.google.dev)
[![Chart.js](https://img.shields.io/badge/charts-Chart.js-FF6384?logo=chartdotjs)](https://www.chartjs.org)
[![Leaflet](https://img.shields.io/badge/maps-Leaflet-199900?logo=leaflet)](https://leafletjs.com)
[![vis-network](https://img.shields.io/badge/graph-vis--network-8A2BE2)](https://visjs.github.io/vis-network/)

**SurakshaAI** (Sanskrit: *surakṣā* — safety, protection) is an AI-powered digital public safety intelligence platform that sits between citizens and cyber officials — **screening digital arrest scams, counterfeit currency, and fraud rings at the point of contact**, not after the complaint is filed.

> 📖 Built as a hackathon prototype for *AI for Digital Public Safety: Defeating Counterfeiting, Fraud & Digital Arrest Scams*. This repository contains the actual buildable, deployable code.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [App Interfaces](#app-interfaces)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Setup](#local-setup)
  - [Deploy to Vercel](#deploy-to-vercel)
  - [Deploy to Netlify](#deploy-to-netlify)
- [Environment Variables](#environment-variables)
- [Demo Guide](#demo-guide)
- [What's Real vs. What's a Stand-In](#whats-real-vs-whats-a-stand-in)
- [Project Status: Built vs. Roadmap](#project-status-built-vs-roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

India registered 1.14 million cybercrime complaints in 2023 — up 60% year-over-year — and "digital arrest" scams alone cost citizens over ₹1,776 crore in just nine months of 2024. Counterfeit currency, particularly high-denomination ₹500 notes, is now good enough to defeat routine manual checks. Current systems are built to process complaints *after* the money moves.

**SurakshaAI intervenes at the point of contact instead.**

### The Core Idea: One Shared Intelligence Pipeline

A citizen mid-scam-call can describe it, record it, or upload a suspicious currency photo — all three input types flow into the **same** AI classification pipeline and the **same** shared database. A cyber official's Command Center sees one unified intelligence feed — clustered by number and pattern, mapped geographically, and visualized as a live fraud network graph — not three disconnected tools bolted together.

---

## Features

| Feature | Purpose | Input | Output |
|---|---|---|---|
| **Report a Contact** | Real-time scam-call risk classification | Text description | Risk level, confidence score, red flags, safety advisory |
| **Voice Input** | Lets citizens report mid-call without typing | Recorded or uploaded audio | Transcript (Groq Whisper) auto-filled into the report |
| **Currency Check** | Counterfeit note screening | Front + back photo | Verdict (genuine / anomalies found / likely counterfeit), confidence, visual flags |
| **NCRB Complaint Draft** | Cuts complaint filing time | Submitted report data | Pre-filled complaint text ready for cybercrime.gov.in |
| **Fraud Network Graph** | Visualizes coordinated scam campaigns | Clustered reports | Interactive node graph — numbers, campaigns, cross-linked by shared pattern |
| **Geospatial Map** | District-level hotspot mapping | Report location text | Live map with severity-colored markers + top-locations ranking |
| **Analytics Dashboard** | Trend visualization for officials | All report data | Scam-type breakdown, denomination breakdown, 14-day activity trend |
| **PDF Intelligence Packets** | Auditable evidence export | A campaign cluster | Formatted PDF with SHA-256 content hash for integrity verification |
| **Role-Based Access** | Separate citizen / official experiences | Access code (officials only) | Citizens see Report + Currency Check; officials see Command Center only |
| **12-Language Support** | Multilingual citizen access | Language selector | Full UI + AI-generated verdicts in Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Gujarati, Malayalam, Punjabi, Odia, Urdu, English |

---

## Tech Stack

### What's Actually Running in This Repo

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript, HTML5, CSS (single-file SPA — no build step) |
| **Charts** | Chart.js |
| **Maps** | Leaflet + OpenStreetMap tiles (no API key required) |
| **Network graph** | vis-network |
| **PDF generation** | jsPDF |
| **Backend** | Serverless functions (Vercel / Netlify) |
| **AI — text & vision** | Groq, Google Gemini, or Azure OpenAI (auto-detected, multi-provider failover) |
| **AI — speech-to-text** | Groq Whisper (`whisper-large-v3-turbo`) |
| **Data store** | Upstash Redis (REST API, serverless-native) |
| **Hosting** | Vercel or Netlify, both free-tier |

### Why No Framework

The frontend is intentionally a single `index.html` file — no React, no build pipeline, no `npm install` required to run it. This was a deliberate choice for a hackathon deployment: any judge, teammate, or future contributor can open the file, understand the whole app, and deploy it by pushing to GitHub and connecting a host. Complexity was spent on the AI pipeline and data model, not on frontend tooling.

---

## Repository Layout

```
suraksha-ai/
├── index.html                    # Entire frontend — UI, i18n (12 languages), all client logic
├── api/                           # Vercel serverless functions
│   ├── llm.js                     # Multi-provider AI router (Groq / Gemini / Azure)
│   ├── kv.js                      # Upstash Redis read/write proxy
│   ├── auth.js                    # Cyber official access-code check
│   └── transcribe.js              # Groq Whisper audio transcription
├── netlify/
│   └── functions/                 # Netlify equivalents of the same 4 functions
│       ├── llm.js
│       ├── kv.js
│       ├── auth.js
│       └── transcribe.js
├── netlify.toml                   # Netlify build config + /api/* redirects
├── package.json                   # Minimal — no dependencies, Node 18+ only
├── .env.example                   # All environment variables, documented
└── README.md                      # This file
```

---

## Architecture

![](SurakshaAI/ArchitectureDiagram.png)

Every citizen report — whether typed, spoken, or photographed — flows through `/api/llm` into the same classification logic and the same Upstash dataset that powers the Command Center. This is what makes the fraud network graph, geo map, and analytics dashboard reflect *one* intelligence picture instead of three siloed tools.

---

## API Endpoints

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| `POST` | `/api/llm` | Routes a classification request to whichever AI provider is configured | `{ model, max_tokens, system, messages }` (Anthropic-shaped, translated internally) | `{ content: [{ type: "text", text }] }` |
| `POST` | `/api/kv` | Reads/writes report data | `{ action: "set"\|"get"\|"list", key, value?, prefix? }` | `{ ok }` / `{ value }` / `{ keys, values }` |
| `POST` | `/api/auth` | Validates a cyber official's access code | `{ code }` | `{ ok: boolean }` |
| `POST` | `/api/transcribe` | Transcribes audio via Groq Whisper | `{ audioBase64, mimeType }` | `{ text }` |

`/api/llm` is provider-agnostic by design — the frontend always sends the same request shape regardless of whether Groq, Gemini, or Azure OpenAI is configured on the backend.

---

## App Interfaces

| View | Who sees it | Description |
|---|---|---|
| **Login / Role Select** | Everyone, first screen | Choose "I'm a Citizen" (no code) or "I'm a Cyber Official" (access code required) |
| **Report a Contact** | Citizens | Describe or record a suspicious call/message; get an instant AI risk verdict |
| **Currency Check** | Citizens | Upload front (+ optional back) of a currency note for visual screening |
| **Command Center** | Officials only | Fraud network graph, geospatial map, analytics charts, campaign clusters, PDF export |

Citizens never see the Command Center tab; officials only see the Command Center. The split is enforced client-side after a server-verified access-code check — see [What's Real vs. What's a Stand-In](#whats-real-vs-whats-a-stand-in) for the honest caveat on this.

---

## Getting Started

### Prerequisites

- A **GitHub** account (to fork/clone and connect to a host)
- A **Vercel** or **Netlify** account (both free tier)
- One AI provider account — **Groq** (recommended, free, no card), **Google AI Studio** (Gemini), or **Azure OpenAI**
- An **Upstash** account (free Redis, no card)

No local Node.js installation is required to deploy — this is a static-plus-serverless project with zero build step.

### Local Setup

```bash
git clone https://github.com/<your-username>/suraksha-ai.git
cd suraksha-ai
cp .env.example .env
# Fill in your API keys in .env, then use `vercel dev` or `netlify dev`
# to run the serverless functions locally alongside index.html
```

### Deploy to Vercel

1. Push this repo to GitHub
2. [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Framework preset: **Other** (no build command needed)
4. Add the environment variables listed below
5. **Deploy**

### Deploy to Netlify

1. Push this repo to GitHub
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → import your repo
3. Build command: empty, publish directory: `.` (already configured via `netlify.toml`)
4. Add the same environment variables
5. **Deploy**

---

## Environment Variables

### AI Provider — pick one block

| Variable | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | Pick one provider | Free at [console.groq.com](https://console.groq.com/keys) |
| `GROQ_MODEL` | No | Defaults to a current vision-capable Groq model; override if Groq deprecates the default |
| `GEMINI_API_KEY` | Pick one provider | Free at [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.0-flash` |
| `AZURE_OPENAI_API_KEY` / `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_DEPLOYMENT` | Pick one provider | Requires an Azure OpenAI resource with a vision-capable deployment |
| `LLM_PROVIDER` | No | Force `groq` / `gemini` / `azure` if more than one is set |

### Storage & Access

| Variable | Required | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Yes | From your Upstash database's REST API section |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | From the same page |
| `OFFICIAL_ACCESS_CODE` | Yes | Any string — gates the Command Center login |

Full documented template: [`.env.example`](./.env.example)

---

## Demo Guide

Try this end-to-end scenario to see the fraud network graph and geo map populate with connected data, not empty placeholders.

### 1. Submit linked scam reports (as Citizen)

Submit 3 reports using **Report a Contact**:
- Two using the **same** phone number, different cities, both claiming CBI/police impersonation
- One using a **different** number, same scam type, a different city

Result: the two same-number reports cluster into one campaign; the third forms its own cluster, cross-linked by a dashed edge in the Fraud Network Graph since it shares the same scam type.

### 2. Try voice input

On the Report a Contact tab, click **Record**, describe a scam scenario out loud, click **Stop**, then **Transcribe → fill description** — confirm the transcript appears and classifies correctly.

### 3. Screen a currency note

Go to **Currency Check**, upload a note photo (front is enough, back improves accuracy), and review the screening verdict and disclaimer.

### 4. Switch to the official view

Click **Switch role** → **I'm a Cyber Official** → enter your `OFFICIAL_ACCESS_CODE` → land in **Command Center**.

### 5. Explore the intelligence layer

- **Fraud Network Graph** — see the connected campaign nodes from step 1
- **Geospatial map** — see markers across the cities you used
- **Analytics** — scam-type breakdown and 14-day trend
- Click **⬇ PDF** on a cluster to download a hashed intelligence packet
- Click **Generate NCRB complaint draft** on any report's verdict card

### 6. Try another language

Switch the language selector (available on the login screen and every tab) to any of the 11 non-English options and confirm the verdict text regenerates natively in that language.

---

## What's Real vs. What's a Stand-In

Everything below runs live, end-to-end, at zero infrastructure cost — but a few things are honestly framed as prototype-grade rather than production-grade:

| Component | This Prototype | Production Upgrade Needed |
|---|---|---|
| **Currency screening** | Photo-based visual heuristics (print quality, thread continuity, portrait clarity) | Cannot check UV features, security-thread colour-shift, or latent image — needs physical note + UV/IR hardware |
| **Access control** | Single shared access code for all officials, checked server-side | Per-user accounts, audit logging, government SSO |
| **Geocoding** | Static lookup table of ~90 major Indian cities matched against free-text location | Street-level geocoding via a live geocoding API |
| **Risk confidence scores** | LLM self-reported confidence, calibrated by prompt instructions | Validation against a labeled dataset of known genuine/fraudulent cases |
| **NCRB complaint draft** | Template-generated from citizen input — deterministic, not LLM-authored | Direct API submission integration with cybercrime.gov.in (no public API currently exists) |

The in-app disclaimer strip and footer make this framing visible to every user, not just documented here.

---

## Project Status: Built vs. Roadmap

| Feature | Status | Notes |
|---|---|---|
| Text-based scam classification | ✅ **Built** | Multi-provider LLM routing via `/api/llm` |
| Voice input + transcription | ✅ **Built** | Groq Whisper, live recording or file upload |
| Currency check (front only) | ✅ **Built** | Vision-capable AI screening |
| Currency check (front + back) | ✅ **Built** | Cross-checks print consistency between sides |
| Fraud network graph | ✅ **Built** | vis-network, auto-clustered from report data |
| Geospatial hotspot map | ✅ **Built** | Leaflet + static city lookup table |
| Analytics dashboard | ✅ **Built** | Chart.js — scam types, denominations, 14-day trend |
| PDF intelligence packets | ✅ **Built** | jsPDF with SHA-256 integrity hash |
| NCRB complaint auto-draft | ✅ **Built** | Template-based, copy/download |
| 12-language support | ✅ **Built** | Full UI + AI-generated verdicts |
| Citizen / official role gate | ✅ **Built** | Demo-grade access code, not production auth |
| Light / dark theme | ✅ **Built** | Persisted per session |
| Officer case workflow (status, notes) | 🔜 **Roadmap** | Would need extended Redis schema |
| Real WhatsApp / IVR integration | 🔜 **Roadmap** | Requires Meta Business verification |
| Validated accuracy benchmarking | 🔜 **Roadmap** | Needs a labeled test dataset |
| Government SSO for officials | 🔜 **Roadmap** | Out of scope for a hackathon prototype |

---

## Contributing

This started as a hackathon submission. Issues and pull requests are welcome — particularly around:
- Expanding the Indian city lookup table for the geospatial map
- Adding accuracy benchmarks against labeled scam/counterfeit datasets
- Improving translation quality across the 12 supported languages

## License

MIT — see [`LICENSE`](./LICENSE) for details.
