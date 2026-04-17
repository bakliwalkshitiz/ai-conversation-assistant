/**
 * /api/chat — streams Groq chat completions back to the client as SSE.
 */

import { Router } from 'express';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  const apiKey = req.headers['x-groq-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing X-Groq-Key header.' });

  const { userMessage, suggestion, transcript, model, systemPrompt } = req.body;

  const system = (systemPrompt || '')
    .replace('{{TRANSCRIPT}}', transcript || '')
    .replace('{{SUGGESTION}}', suggestion || userMessage || '');

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ];

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({ error: err.error?.message || 'Chat request failed.' });
    }

    // Pipe Groq's SSE stream directly to the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    console.error('[chat]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error.' });
  }
});
