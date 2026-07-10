// Vercel serverless function.
// Minimal key-value store backed by Upstash Redis (free tier), replacing
// the Claude-artifact-only window.storage API for real deployment.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(500).json({ error: "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set on the server." });
  }

  async function redis(command) {
    const r = await fetch(UPSTASH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command)
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }

  const { action, key, value, prefix } = req.body || {};

  try {
    if (action === "set") {
      if (!key) return res.status(400).json({ error: "key required" });
      await redis(["SET", key, value]);
      return res.status(200).json({ ok: true });
    }

    if (action === "get") {
      if (!key) return res.status(400).json({ error: "key required" });
      const val = await redis(["GET", key]);
      return res.status(200).json({ value: val });
    }

    if (action === "list") {
      if (!prefix) return res.status(400).json({ error: "prefix required" });
      const keys = await redis(["KEYS", `${prefix}*`]);
      if (!keys || keys.length === 0) return res.status(200).json({ keys: [], values: [] });
      const values = await redis(["MGET", ...keys]);
      return res.status(200).json({ keys, values });
    }

    return res.status(400).json({ error: "Unknown action: expected 'set' | 'get' | 'list'" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
