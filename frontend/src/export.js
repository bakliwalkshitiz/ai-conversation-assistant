/**
 * Export module.
 * Builds a structured JSON snapshot of the session and triggers download.
 */

import { state } from './state.js';

export function exportSession() {
  const payload = {
    exportedAt: new Date().toISOString(),
    transcript: state.transcript.map((c) => ({
      timestamp: c.timestamp,
      text: c.text,
    })),
    suggestionBatches: state.suggestionBatches.map((b) => ({
      timestamp: b.timestamp,
      suggestions: b.items.map((s) => ({ type: s.type, text: s.text })),
    })),
    chatHistory: state.chatHistory.map((m) => ({
      timestamp: m.timestamp,
      role: m.role,
      content: m.content,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `twinmind-session-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
