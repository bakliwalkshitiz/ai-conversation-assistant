/**
 * Transcription module.
 * Posts audio blobs to /api/transcribe (backend proxies to Groq Whisper).
 */

import { state, uid } from './state.js';

/**
 * Transcribes a raw audio blob and appends the text to state.transcript.
 * @param {Blob} audioBlob
 * @returns {string} transcribed text, or '' on silence/failure
 */
export async function transcribeBlob(audioBlob) {
  if (!state.apiKey) throw new Error('No API key configured. Open Settings to add your Groq key.');

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', state.settings.whisperModel || 'whisper-large-v3');
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'X-Groq-Key': state.apiKey },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Transcription failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  const text = (data.text || '').trim();

  if (text) {
    state.transcript.push({ id: uid(), text, timestamp: new Date().toISOString() });
  }

  return text;
}
