/**
 * main.js — Application bootstrap.
 * Wires all modules together, handles UI events and rendering.
 */

import { state } from './state.js';
import { startRecording, stopRecording } from './audio.js';
import { transcribeBlob } from './transcription.js';
import { fetchSuggestions } from './suggestions.js';
import { sendChatMessage } from './chat.js';
import { initSettings, openSettings, hasApiKey } from './settings.js';
import { exportSession } from './export.js';

// ── Bootstrap ────────────────────────────────────────────────────────────────

initSettings(() => {}); // bind modal events

if (!hasApiKey()) openSettings(); // prompt for key on first load

// ── Mic ──────────────────────────────────────────────────────────────────────

let timerInterval = null;

document.getElementById('btn-mic').addEventListener('click', async () => {
  if (!hasApiKey()) { openSettings(); return; }
  state.isRecording ? handleStop() : await handleStart();
});

async function handleStart() {
  try {
    await startRecording(handleAudioChunk);
    setRecordingUI(true);
    timerInterval = setInterval(updateTimer, 1000);
    showStatus('transcript', 'Recording…');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleStop() {
  stopRecording();
  setRecordingUI(false);
  clearInterval(timerInterval);
  showStatus('transcript', 'Stopped');
}

// Called every ~30 s with a complete audio blob
async function handleAudioChunk(blob) {
  showStatus('transcript', 'Transcribing…');
  try {
    const text = await transcribeBlob(blob);
    if (text) {
      renderTranscriptChunk(state.transcript.at(-1));
      await refreshSuggestions();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    showStatus('transcript', state.isRecording ? 'Recording…' : 'Ready');
  }
}

// ── Suggestions ──────────────────────────────────────────────────────────────

document.getElementById('btn-refresh').addEventListener('click', async () => {
  if (!hasApiKey()) { openSettings(); return; }
  await refreshSuggestions();
});

async function refreshSuggestions() {
  if (!state.transcript.length) {
    showToast('No transcript yet — start speaking first.', 'warning');
    return;
  }
  showStatus('suggestions', 'Generating…');
  document.getElementById('btn-refresh').disabled = true;
  try {
    const batch = await fetchSuggestions();
    if (batch) renderSuggestionBatch(batch);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    showStatus('suggestions', 'Ready');
    document.getElementById('btn-refresh').disabled = false;
  }
}

// ── Chat ─────────────────────────────────────────────────────────────────────

document.getElementById('btn-send-chat').addEventListener('click', submitChatInput);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChatInput(); }
});

async function submitChatInput() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || state.isSendingChat) return;
  if (!hasApiKey()) { openSettings(); return; }
  input.value = '';
  await sendChat(text, null);
}

async function sendChat(userMessage, suggestion) {
  renderUserMessage(userMessage);
  const bubble = renderAssistantPlaceholder();
  document.getElementById('btn-send-chat').disabled = true;

  try {
    await sendChatMessage(
      userMessage,
      suggestion,
      (token) => appendTokenToBubble(bubble, token),
      ()      => finalizeBubble(bubble),
    );
  } catch (err) {
    bubble.textContent = `Error: ${err.message}`;
    bubble.classList.remove('streaming');
  } finally {
    document.getElementById('btn-send-chat').disabled = false;
  }
}

// ── Export ───────────────────────────────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', () => {
  if (!state.transcript.length && !state.chatHistory.length) {
    showToast('Nothing to export yet.', 'warning');
    return;
  }
  exportSession();
  showToast('Session exported!', 'success');
});

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderTranscriptChunk(chunk) {
  const list = document.getElementById('transcript-list');
  list.querySelector('.empty-state')?.remove();

  const el = document.createElement('div');
  el.className = 'transcript-chunk';
  el.innerHTML = `
    <span class="chunk-time">${formatTime(chunk.timestamp)}</span>
    <p class="chunk-text">${escapeHtml(chunk.text)}</p>
  `;
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

function renderSuggestionBatch(batch) {
  const list = document.getElementById('suggestions-list');
  list.querySelector('.empty-state')?.remove();

  const batchEl = document.createElement('div');
  batchEl.className = 'suggestion-batch slide-in';

  batchEl.innerHTML = `<div class="batch-time">${formatTime(batch.timestamp)}</div>`;

  batch.items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card';
    card.innerHTML = `
      <span class="suggestion-badge badge-${item.type}">${item.label}</span>
      <p class="suggestion-text">${escapeHtml(item.text)}</p>
      <span class="suggestion-cta">Click for details →</span>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.suggestion-card.selected').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      sendChat(item.text, item.text);
    });
    batchEl.appendChild(card);
  });

  list.insertBefore(batchEl, list.firstChild);
}

function renderUserMessage(content) {
  const messages = document.getElementById('chat-messages');
  messages.querySelector('.empty-state')?.remove();
  const el = document.createElement('div');
  el.className = 'chat-message user-message';
  el.innerHTML = `<div class="message-bubble">${escapeHtml(content)}</div>`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}

function renderAssistantPlaceholder() {
  const messages = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'chat-message assistant-message';
  el.innerHTML = `<div class="message-bubble streaming"><span class="cursor-blink"></span></div>`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el.querySelector('.message-bubble');
}

function appendTokenToBubble(bubble, token) {
  const cursor = bubble.querySelector('.cursor-blink');
  bubble.insertBefore(document.createTextNode(token), cursor || null);
  bubble.closest('#chat-messages').scrollTop = 999999;
}

function finalizeBubble(bubble) {
  bubble.classList.remove('streaming');
  bubble.querySelector('.cursor-blink')?.remove();
  bubble.innerHTML = bubble.innerHTML.replace(/\n/g, '<br>');
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function setRecordingUI(recording) {
  document.getElementById('btn-mic').classList.toggle('recording', recording);
  document.getElementById('recording-timer').classList.toggle('hidden', !recording);
  document.getElementById('rec-indicator').classList.toggle('hidden', !recording);
  if (!recording) document.getElementById('recording-timer').textContent = '00:00';
}

function updateTimer() {
  if (!state.recordingStartTime) return;
  const s = Math.floor((Date.now() - state.recordingStartTime) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  document.getElementById('recording-timer').textContent = `${mm}:${ss}`;
}

function showStatus(col, text) {
  const el = document.getElementById(`${col}-status`);
  if (el) el.textContent = text;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
