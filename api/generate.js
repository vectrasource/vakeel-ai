const DEVELOPER_EMAIL = 'kpharis.hk@gmail.com';
const GEN_LIMIT = 10;

async function sbFetch(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { fullPrompt, model, maxTokens, userId, userEmail } = req.body;

    // ===== SERVER-SIDE GENERATION LIMIT =====
    if (userId && userEmail !== DEVELOPER_EMAIL && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const rows = await sbFetch(`generation_count?user_id=eq.${encodeURIComponent(userId)}&select=count`);
      if (Array.isArray(rows) && rows.length > 0 && rows[0].count >= GEN_LIMIT) {
        return res.status(403).json({ error: 'Generation limit reached' });
      }
    }

    // ===== CALL OPENROUTER =====
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: { message: 'OPENROUTER_API_KEY not set.' } });
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vectrasource.com',
        'X-Title': 'Vectrasource AI Suite'
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: maxTokens || 4000,
        temperature: 0.4
      })
    });
    const data = await response.json();

    if (data.error) {
      if (data.error.code === 429 ||
          data.error.message?.includes('credits') ||
          data.error.message?.includes('billing')) {
        return res.status(200).json({
          text: '⚠️ High demand right now! Please try again in a few minutes. Need unlimited access? Subscribe at vectrasource.com 🌴'
        });
      }
      return res.status(400).json({ error: { message: data.error.message } });
    }

    // ===== INCREMENT COUNT SERVER-SIDE AFTER SUCCESS =====
    if (userId && userEmail !== DEVELOPER_EMAIL && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const rows = await sbFetch(`generation_count?user_id=eq.${encodeURIComponent(userId)}&select=count`);
      if (Array.isArray(rows) && rows.length > 0) {
        await sbFetch(`generation_count?user_id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({ count: rows[0].count + 1 }),
        });
      } else {
        await sbFetch('generation_count', {
          method: 'POST',
          prefer: 'return=minimal',
          body: JSON.stringify({ user_id: userId, count: 1 }),
        });
      }
    }

    const text = data.choices?.[0]?.message?.content || 'No output received.';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
