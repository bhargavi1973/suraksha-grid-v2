// Vercel serverless function -- LLM proxy supporting Google Gemini, Groq,
// or Azure OpenAI as the backend, auto-selected by whichever environment
// variables are present (or forced via LLM_PROVIDER = "gemini" | "groq" | "azure").
//
// Priority when multiple are set: explicit LLM_PROVIDER wins, otherwise
// Gemini > Groq > Azure.
//
// The frontend (index.html) always sends requests in Anthropic's shape:
//   { model, max_tokens, system, messages: [{ role, content }] }
// where content can be a string, or blocks of
//   { type: "text", text }
//   { type: "image", source: { type: "base64", media_type, data } }
// This function translates that into whichever provider is configured,
// and translates the reply back into { content: [{ type: "text", text }] }
// so index.html's parsing code never has to change, no matter which
// provider you're using behind the scenes.

function getProvider() {
  if (process.env.LLM_PROVIDER) return process.env.LLM_PROVIDER.toLowerCase();
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.AZURE_OPENAI_API_KEY) return "azure";
  return null;
}

/* ---------------- shared: Anthropic-shape -> OpenAI-shape messages ---------------- */
/* Used by both Azure OpenAI and Groq, since both speak the OpenAI chat-completions format. */

function toOpenAIMessages(body) {
  const msgs = [];
  if (body.system) msgs.push({ role: "system", content: body.system });
  for (const m of body.messages || []) {
    let content = m.content;
    if (Array.isArray(content)) {
      content = content.map((block) => {
        if (block.type === "text") return { type: "text", text: block.text };
        if (block.type === "image") {
          return { type: "image_url", image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } };
        }
        return block;
      });
    }
    msgs.push({ role: m.role, content });
  }
  return msgs;
}

/* ---------------- Azure OpenAI ---------------- */

async function callAzure(body) {
  const { AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION } = process.env;
  if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
    throw new Error("Missing AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_DEPLOYMENT");
  }
  const apiVersion = AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
  const endpoint = AZURE_OPENAI_ENDPOINT.replace(/\/$/, "");
  const url = `${endpoint}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": AZURE_OPENAI_API_KEY },
    body: JSON.stringify({ messages: toOpenAIMessages(body), max_tokens: body.max_tokens || 1000 })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ? data.error.message : "Azure OpenAI request failed");
  return (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : "";
}

/* ---------------- Groq ---------------- */
/* Groq speaks the same OpenAI chat-completions schema, so this reuses toOpenAIMessages. */

async function callGroq(body) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  // Default to a current Groq vision-capable model. Groq's model lineup changes over time --
  // if this errors with "model not found", check https://console.groq.com for the current
  // vision-capable model name and set GROQ_MODEL to override.
  const GROQ_MODEL = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: toOpenAIMessages(body),
      max_tokens: body.max_tokens || 1000
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ? data.error.message : "Groq request failed");
  return (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : "";
}

/* ---------------- Google Gemini ---------------- */

function toGeminiContents(body) {
  const contents = [];
  for (const m of body.messages || []) {
    const role = m.role === "assistant" ? "model" : "user";
    let parts;
    if (Array.isArray(m.content)) {
      parts = m.content.map((block) => {
        if (block.type === "text") return { text: block.text };
        if (block.type === "image") return { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
        return { text: "" };
      });
    } else {
      parts = [{ text: m.content }];
    }
    contents.push({ role, parts });
  }
  return contents;
}

async function callGemini(body) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const geminiBody = {
    contents: toGeminiContents(body),
    generationConfig: { maxOutputTokens: body.max_tokens || 1000 }
  };
  if (body.system) geminiBody.system_instruction = { parts: [{ text: body.system }] };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ? data.error.message : "Gemini request failed");

  const candidate = data.candidates && data.candidates[0];
  if (!candidate) {
    const blockReason = data.promptFeedback && data.promptFeedback.blockReason;
    throw new Error(blockReason ? `Gemini blocked the request: ${blockReason}` : "Gemini returned no candidates");
  }
  return ((candidate.content && candidate.content.parts) || []).map(p => p.text || "").join("");
}

/* ---------------- handler ---------------- */

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const provider = getProvider();
  if (!provider) {
    return res.status(500).json({ error: "No LLM provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, or the AZURE_OPENAI_* variables." });
  }

  try {
    let text;
    if (provider === "gemini") text = await callGemini(req.body || {});
    else if (provider === "groq") text = await callGroq(req.body || {});
    else text = await callAzure(req.body || {});
    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (e) {
    // Node's fetch() wraps real network errors (DNS failure, timeout, TLS, etc.)
    // in a generic "fetch failed" message -- the actual cause is nested here.
    const causeInfo = e.cause ? (e.cause.code || e.cause.message || String(e.cause)) : undefined;
    return res.status(500).json({ error: e.message, cause: causeInfo, provider });
  }
};
