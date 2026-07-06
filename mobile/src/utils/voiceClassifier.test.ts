import { classifyIntent } from './voiceClassifier';

describe('Voice Intent Classifier tests', () => {
  // Test Cancel Phrases
  test('should classify cancel phrases correctly', () => {
    expect(classifyIntent("I am ok")).toBe('CANCEL');
    expect(classifyIntent("cancel the alert")).toBe('CANCEL');
    expect(classifyIntent("stop stop stop")).toBe('CANCEL');
    expect(classifyIntent("im fine, do not call")).toBe('CANCEL');
    expect(classifyIntent("I'm fine.")).toBe('CANCEL');
  });

  // Test SOS Phrases
  test('should classify SOS phrases correctly', () => {
    expect(classifyIntent("Help me!")).toBe('SOS');
    expect(classifyIntent("call ambulance now")).toBe('SOS');
    expect(classifyIntent("SOS trigger")).toBe('SOS');
    expect(classifyIntent("emergency ambulance please")).toBe('SOS');
    expect(classifyIntent("i need help")).toBe('SOS');
  });

  // Test Unknown / Unmatched Phrases
  test('should classify unrelated phrases as UNKNOWN', () => {
    expect(classifyIntent("hello how are you")).toBe('UNKNOWN');
    expect(classifyIntent("turn left on the highway")).toBe('UNKNOWN');
    expect(classifyIntent("the weather is nice today")).toBe('UNKNOWN');
    expect(classifyIntent("")).toBe('UNKNOWN');
  });
});
