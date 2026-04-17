/**
 * Chat module.
 * Streams responses from /api/chat via SSE.
 * Handles both suggestion-click auto-messages and freeform user input.
 */

import { state, uid, getTranscriptContext } from './state.js';

/**
 * Sends a user message and streams the assistant reply.
 *
 * @param {string} userMessage   - Text shown as the user's message
 * @param {string|null} suggestion - Original suggestion text for the system prompt slot
 * @param {Function} onToken     - Called with each streamed token string
 * @param {Function} onDone      - Called with full response when streaming ends
 */
export async function sendChatMessage(userMessage, suggestion = null, onToken, onDone) {
  if (!state.apiKey) throw new Error('No API key configured.');
  if (state.isSendingChat) return;

  state.isSendingChat = true;

  // Persist the user turn immediately so UI can render it
  state.chatHistory.push({
    id: uid(),
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  let assistantContent = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Groq-Key': state.apiKey,
      },
      body: JSON.stringify({
        userMessage,
        suggestion: suggestion || userMessage,
        transcript: getTranscriptContext(0), // full transcript for chat
        model: state.settings.model,
        systemPrompt: state.settings.chatSystemPrompt,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Chat request failed (HTTP ${res.status})`);
    }

    // Parse SSE stream from backend
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          finalize(assistantContent);
          onDone?.(assistantContent);
          return;
        }
        try {
          const json = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content || '';
          if (token) {
            assistantContent += token;
            onToken?.(token);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    // Stream ended without [DONE] sentinel
    finalize(assistantContent);
    onDone?.(assistantContent);
  } finally {
    state.isSendingChat = false;
  }
}

function finalize(content) {
  state.chatHistory.push({
    id: uid(),
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
  });
}
