/**
 * Settings module.
 * Manages the settings modal: field binding, save, reset to defaults.
 */

import {
  state,
  saveApiKey,
  saveSettings,
  DEFAULT_SUGGESTION_PROMPT,
  DEFAULT_CHAT_PROMPT,
} from './state.js';

let onSavedCallback = null;

export function initSettings(onSaved) {
  onSavedCallback = onSaved;
  _bindEvents();
}

function _bindEvents() {
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
  document.getElementById('settings-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });
  document.getElementById('btn-save-settings').addEventListener('click', _saveAndClose);
  document.getElementById('btn-reset-settings').addEventListener('click', _resetDefaults);
}

export function openSettings() {
  // Populate fields with current values
  document.getElementById('setting-api-key').value = state.apiKey || '';
  document.getElementById('setting-model').value = state.settings.model || '';
  document.getElementById('setting-suggestion-prompt').value = state.settings.suggestionPrompt || '';
  document.getElementById('setting-chat-prompt').value = state.settings.chatSystemPrompt || '';
  document.getElementById('setting-context-words').value = state.settings.suggestionContextWords || 600;
  document.getElementById('setting-refresh-interval').value = state.settings.refreshIntervalSeconds || 30;

  document.getElementById('settings-overlay').classList.remove('hidden');
  document.getElementById('setting-api-key').focus();
}

export function closeSettings() {
  document.getElementById('settings-overlay').classList.add('hidden');
}

export function hasApiKey() {
  return Boolean(state.apiKey);
}

function _saveAndClose() {
  const apiKey = document.getElementById('setting-api-key').value.trim();
  if (apiKey) saveApiKey(apiKey);

  saveSettings({
    model: document.getElementById('setting-model').value.trim(),
    suggestionPrompt: document.getElementById('setting-suggestion-prompt').value.trim(),
    chatSystemPrompt: document.getElementById('setting-chat-prompt').value.trim(),
    suggestionContextWords: parseInt(document.getElementById('setting-context-words').value, 10) || 600,
    refreshIntervalSeconds: parseInt(document.getElementById('setting-refresh-interval').value, 10) || 30,
  });

  closeSettings();
  onSavedCallback?.();
}

function _resetDefaults() {
  document.getElementById('setting-suggestion-prompt').value = DEFAULT_SUGGESTION_PROMPT;
  document.getElementById('setting-chat-prompt').value = DEFAULT_CHAT_PROMPT;
  document.getElementById('setting-model').value = 'llama-3.3-70b-versatile';
  document.getElementById('setting-context-words').value = 600;
  document.getElementById('setting-refresh-interval').value = 30;
}
