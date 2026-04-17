/**
 * Suggestions module.
 * Calls /api/suggestions to generate 3 contextual suggestion cards.
 */

import { state, uid, getTranscriptContext } from './state.js';

const TYPES  = ['question_to_ask', 'talking_point', 'clarification'];
const LABELS = ['Question', 'Insight', 'Clarification'];

/**
 * Fetches 3 fresh suggestions and prepends a new batch to state.suggestionBatches.
 * @returns {Object|null} the new batch, or null if already in-flight
 */
export async function fetchSuggestions() {
  if (!state.apiKey) throw new Error('No API key configured.');
  if (state.isGeneratingSuggestions) return null;

  const transcriptText = getTranscriptContext(state.settings.suggestionContextWords || 600);
  if (!transcriptText.trim()) throw new Error('No transcript yet — start speaking first.');

  state.isGeneratingSuggestions = true;

  try {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Groq-Key': state.apiKey,
      },
      body: JSON.stringify({
        transcript: transcriptText,
        model: state.settings.model,
        prompt: state.settings.suggestionPrompt,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Suggestions request failed (HTTP ${res.status})`);
    }

    const { suggestions } = await res.json(); // string[]

    const items = suggestions.slice(0, 3).map((text, i) => ({
      id: uid(),
      type: TYPES[i] || 'talking_point',
      label: LABELS[i] || 'Insight',
      text,
    }));

    const batch = { id: uid(), timestamp: new Date().toISOString(), items };
    state.suggestionBatches.unshift(batch); // newest batch at top
    return batch;
  } finally {
    state.isGeneratingSuggestions = false;
  }
}
