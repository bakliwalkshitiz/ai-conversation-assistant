/**
 * Express backend — proxies all Groq API calls.
 * Keeps the Groq key off the public network path and gives us
 * a proper full-stack structure for the assignment.
 */

import express from 'express';
import cors from 'cors';
import { transcribeRouter } from './routes/transcribe.js';
import { suggestionsRouter } from './routes/suggestions.js';
import { chatRouter } from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Feature routes
app.use('/api/transcribe', transcribeRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/chat', chatRouter);

// Serve static frontend in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TwinMind backend running on http://localhost:${PORT}`);
});

// added cors support

// added cors support

// added cors
