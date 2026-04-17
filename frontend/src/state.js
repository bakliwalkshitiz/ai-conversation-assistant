/**
 * Central application state — single source of truth.
 */

export const DEFAULT_SUGGESTION_PROMPT = `You are an intelligent real-time meeting assistant.

Your task is to analyze the ongoing conversation and generate exactly 3 high-quality suggestions that help move the conversation forward.

Transcript:
"{{TRANSCRIPT}}"

Instructions:
- Suggestions must be highly relevant to the context.
- Provide exactly 3 suggestions:
  1. One thoughtful question the user can ask next
  2. One useful insight or recommendation
  3. One clarification or improvement suggestion
- Each suggestion must be concise (max 1 sentence).
- Avoid generic, vague, or repetitive suggestions.
- Focus on practical usefulness over creativity.
- If context is unclear, make a reasonable assumption but stay relevant.

Strict Output Format (JSON only, no extra text):
[
  "Suggestion 1",
  "Suggestion 2",
  "Suggestion 3"
]`;

export const DEFAULT_CHAT_PROMPT = `You are a helpful and intelligent assistant.

Conversation context:
"{{TRANSCRIPT}}"

User selected suggestion:
"{{SUGGESTION}}"

Your task:
Generate a clear, structured, and practical response.

Instructions:
- Be specific and actionable.
- Keep response well-structured (short paragraphs or bullet points if needed).
- Stay focused on the context.
- Avoid unnecessary verbosity.
- If useful, include examples.

Answer:`;

const DEFAULT_SETTINGS = {
  model: 'llama-3.3-70b-versatile',
  whisperModel: 'whisper-large-v3',
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  chatSystemPrompt: DEFAULT_CHAT_PROMPT,
  suggestionContextWords: 600,
  refreshIntervalSeconds: 30,
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('twinmind_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export const state = {
  apiKey: localStorage.getItem('twinmind_api_key') || '',
  settings: loadSettings(),
  transcript: [],        // [{ id, text, timestamp }]
  suggestionBatches: [], // [{ id, timestamp, items: [{ id, type, label, text }] }]
  chatHistory: [],       // [{ id, role, content, timestamp }]
  isRecording: false,
  recordingStartTime: null,
  isGeneratingSuggestions: false,
  isSendingChat: false,
};

export function saveApiKey(key) {
  state.apiKey = key;
  localStorage.setItem('twinmind_api_key', key);
}

export function saveSettings(updates) {
  Object.assign(state.settings, updates);
  localStorage.setItem('twinmind_settings', JSON.stringify(state.settings));
}

/** Returns the last N words of the full transcript as a plain string. */
export function getTranscriptContext(wordLimit = 0) {
  const full = state.transcript.map((c) => c.text).join(' ');
  if (!wordLimit) return full;
  const words = full.split(/\s+/);
  return words.slice(-wordLimit).join(' ');
}

/** Generates a short unique ID. */
export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// fixed prompt structure

// fixed prompt structure

// fixed prompt
