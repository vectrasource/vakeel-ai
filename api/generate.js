export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fullPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: { message: 'GEMINI_API_KEY not set in Vercel environment variables.' } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.4 }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: { message: data.error.message } });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
