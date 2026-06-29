import { createClient } from '@supabase/supabase-js';

const DEVELOPER_EMAIL = 'kpharis.hk@gmail.com';
const GEN_LIMIT = 10;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { fullPrompt, model, maxTokens, userId, userEmail } = req.body;

    // ===== SERVER-SIDE GENERATION LIMIT =====
    const supabase = getSupabaseAdmin();
    if (supabase && userId && userEmail !== DEVELOPER_EMAIL) {
      const { data: row, error } = await supabase
        .from('generation_count')
        .select('count')
        .eq('user_id', userId)
        .single();

      if (!error && row && row.count >= GEN_LIMIT) {
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
    if (supabase && userId && userEmail !== DEVELOPER_EMAIL) {
      const { data: row } = await supabase
        .from('generation_count')
        .select('count')
        .eq('user_id', userId)
        .single();

      if (row) {
        await supabase
          .from('generation_count')
          .update({ count: row.count + 1 })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('generation_count')
          .insert({ user_id: userId, count: 1 });
      }
    }

    const text = data.choices?.[0]?.message?.content || 'No output received.';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
