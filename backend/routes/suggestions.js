/**
 * /api/suggestions — generates 3 contextual suggestions via Groq LLM.
 */

import { Router } from 'express';

export const suggestionsRouter = Router();

suggestionsRouter.post('/', async (req, res) => {
  const apiKey = req.headers['x-groq-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing X-Groq-Key header.' });

  const { transcript, model, prompt } = req.body;
  if (!transcript?.trim()) return res.status(400).json({ error: 'transcript is required.' });

  const userPrompt = (prompt || '').replace('{{TRANSCRIPT}}', transcript);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) return res.status(groqRes.status).json({ error: data.error?.message || 'LLM failed.' });

    const raw = data.choices?.[0]?.message?.content || '[]';
    const suggestions = parseJsonArray(raw);

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(502).json({ error: 'Model returned unexpected format.' });
    }

    res.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    console.error('[suggestions]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

function parseJsonArray(text) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}
