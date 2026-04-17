/**
 * /api/transcribe — proxies audio blobs to Groq Whisper Large V3.
 * Accepts multipart/form-data with fields: file, model, language, response_format.
 */

import { Router } from 'express';
import multer from 'multer';

export const transcribeRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

transcribeRouter.post('/', upload.single('file'), async (req, res) => {
  const apiKey = req.headers['x-groq-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing X-Groq-Key header.' });
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });

  try {
    // Use Web API FormData + Blob (Node 18+ built-ins) so global fetch handles
    // the multipart boundary automatically — the npm form-data package is incompatible.
    const form = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    form.append('file', audioBlob, req.file.originalname || 'audio.webm');
    form.append('model', req.body.model || 'whisper-large-v3');
    form.append('language', req.body.language || 'en');
    form.append('response_format', req.body.response_format || 'json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      // Do NOT set Content-Type manually — fetch sets it with the correct boundary
      body: form,
    });

    const data = await groqRes.json();
    if (!groqRes.ok) return res.status(groqRes.status).json({ error: data.error?.message || 'Transcription failed.' });

    res.json(data);
  } catch (err) {
    console.error('[transcribe]', err);
    res.status(500).json({ error: 'Internal server error during transcription.' });
  }
});
