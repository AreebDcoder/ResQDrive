export type VoiceIntent = 'CANCEL' | 'SOS' | 'UNKNOWN';

const CANCEL_PHRASES = ["i am ok", "i'm ok", "im ok", "cancel", "stop", "i'm fine", "im fine"];
const SOS_PHRASES = ["help", "call ambulance", "emergency", "call rescue", "sos", "i need help"];

/**
 * Normalizes speech text and maps it to specific system intents (CANCEL or SOS).
 * Tolerates stress variation by matching substring containment.
 */
export function classifyIntent(transcript: string): VoiceIntent {
  if (!transcript) return 'UNKNOWN';

  // Lowercase, trim, and strip punctuation symbols
  const normalized = transcript
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
    .replace(/\s{2,}/g, ' ');

  // Substring checks to match stress-induced verbal phrasing variations
  if (CANCEL_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return 'CANCEL';
  }

  if (SOS_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return 'SOS';
  }

  return 'UNKNOWN';
}
