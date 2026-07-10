// Netlify function. Same behaviour as api/kv.js (Vercel version).
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set." })
    };
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

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch (e) { /* ignore */ }
  const { action, key, value, prefix } = payload;

  try {
    if (action === "set") {
      if (!key) return { statusCode: 400, body: JSON.stringify({ error: "key required" }) };
      await redis(["SET", key, value]);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === "get") {
      if (!key) return { statusCode: 400, body: JSON.stringify({ error: "key required" }) };
      const val = await redis(["GET", key]);
      return { statusCode: 200, body: JSON.stringify({ value: val }) };
    }

    if (action === "list") {
      if (!prefix) return { statusCode: 400, body: JSON.stringify({ error: "prefix required" }) };
      const keys = await redis(["KEYS", `${prefix}*`]);
      if (!keys || keys.length === 0) return { statusCode: 200, body: JSON.stringify({ keys: [], values: [] }) };
      const values = await redis(["MGET", ...keys]);
      return { statusCode: 200, body: JSON.stringify({ keys, values }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action: expected 'set' | 'get' | 'list'" }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
