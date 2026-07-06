import { Alert, NativeModules } from 'react-native';

let Tts: any = null;
const isNativeTtsSupported = !!NativeModules.TextToSpeech;

if (isNativeTtsSupported) {
  try {
    // Dynamic require to prevent runtime crashes in Expo Go
    Tts = require('react-native-tts').default;
  } catch (e) {
    console.warn('Native TextToSpeech module could not be loaded.');
  }
}

export class TtsService {
  /**
   * Initializes and reads aloud accident location and nearest hospital directions.
   * If running in Expo Go, falls back to local Alert box + console log statements.
   */
  static async announceAccidentInfo(locationDescription: string, hospitalName: string, etaMinutes: number) {
    const text = `Accident detected near ${locationDescription}. Nearest hospital is ${hospitalName}, approximately ${etaMinutes} minutes away.`;
    
    console.log(`[TtsService Announcement]: "${text}"`);

    if (isNativeTtsSupported && Tts) {
      try {
        Tts.setDefaultLanguage('en-US');
        Tts.speak(text);
      } catch (err: any) {
        console.warn('TTS speech execution failed. Falling back to alert display. Error:', err.message);
        Alert.alert('Text-to-Speech Announcement', text);
      }
    } else {
      // Mock Simulator Fallback
      Alert.alert('Text-to-Speech Announcement', text);
    }
  }
}
