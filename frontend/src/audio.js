/**
 * Audio capture module.
 * Cycles through 30-second MediaRecorder segments — each stop produces
 * a complete, valid audio file that Whisper can handle reliably.
 */

import { state } from './state.js';

let mediaStream = null;
let mediaRecorder = null;
let chunks = [];
let cycleTimer = null;
let onChunkReady = null;

/**
 * Start recording from the microphone.
 * @param {Function} onChunk - async fn(blob) called every ~30s with a complete audio blob
 */
export async function startRecording(onChunk) {
  onChunkReady = onChunk;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    throw new Error(`Microphone access denied: ${err.message}`);
  }

  state.isRecording = true;
  state.recordingStartTime = Date.now();
  startCycle();
}

export function stopRecording() {
  state.isRecording = false;
  clearTimeout(cycleTimer);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop(); // fires onstop → sends final chunk
  }
}

function getSupportedMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function startCycle() {
  if (!state.isRecording) return;

  chunks = [];
  const mimeType = getSupportedMimeType();
  mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    if (chunks.length === 0) return;
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    // Skip tiny blobs (silence / near-empty recordings)
    if (onChunkReady && blob.size > 1000) {
      await onChunkReady(blob).catch(console.error);
    }
    if (state.isRecording) startCycle();
  };

  mediaRecorder.start();

  const intervalMs = (state.settings.refreshIntervalSeconds || 30) * 1000;
  cycleTimer = setTimeout(() => {
    if (mediaRecorder.state === 'recording') mediaRecorder.stop();
  }, intervalMs);
}
