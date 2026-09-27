export const CRASH_RELEVANT_CLASS_NAMES = [
  'Glass',
  'Shatter',
  'Explosion',
  'Boom',
  'Skidding',
  'Tire squeal',
  'Vehicle',
  'Crash',
] as const;

export type CrashRelevantClassName = (typeof CRASH_RELEVANT_CLASS_NAMES)[number];

// Resolved index mapping from YAMNet audioset class map:
// 'Glass': 435, 'Shatter': 437, 'Explosion': 420, 'Boom': 430, 'Skidding': 306, 'Tire squeal': 307, 'Vehicle': 294, 'Crash': 463 (Smash, crash)
export const CRASH_CLASS_INDICES: number[] = [435, 437, 420, 430, 306, 307, 294, 463];

// Core vehicle crash classes - metal crumple, tires skidding on pavement, glass shattering
export const CORE_VEHICLE_CRASH_INDICES: number[] = [463, 306, 307, 435, 437];

// Vehicle presence index (automobile/engine acoustic context)
export const VEHICLE_CLASS_INDEX = 294;

// Secondary burst classes (susceptible to voice plosives, breath, microphone handling)
export const SECONDARY_BURST_INDICES: number[] = [420, 430];

// Human speech, vocalizations, breathing, coughing (Audioset classes 0-45)
export const SPEECH_AND_VOCAL_CLASS_INDICES: number[] = [
  0,  // Speech
  1,  // Child speech, kid speaking
  2,  // Conversation
  3,  // Narration, monologue
  4,  // Babbling
  5,  // Speech synthesizer
  6,  // Shout
  7,  // Bellow
  8,  // Whoop
  9,  // Yell
  10, // Children shouting
  11, // Screaming
  12, // Whispering
  13, // Laughter
  14, // Baby laughter
  15, // Giggle
  16, // Snicker
  17, // Belly laugh
  18, // Chuckle, chortle
  19, // Crying, sobbing
  20, // Baby cry
  21, // Whimper
  22, // Wail, moan
  23, // Sigh
  24, // Singing
  31, // Rapping
  32, // Humming
  33, // Groan
  34, // Grunt
  35, // Whistling
  36, // Breathing
  37, // Wheeze
  38, // Snoring
  39, // Gasp
  40, // Pant
  41, // Snort
  42, // Cough
  43, // Throat clearing
  44, // Sneeze
  45, // Sniff
];

export const CLASS_INDEX_TO_NAME: Record<number, CrashRelevantClassName> = {
  435: 'Glass',
  437: 'Shatter',
  420: 'Explosion',
  430: 'Boom',
  306: 'Skidding',
  307: 'Tire squeal',
  294: 'Vehicle',
  463: 'Crash',
};

export const CRASH_CONFIDENCE_THRESHOLD = 0.40;
export const ROLLING_WINDOW_SECONDS = 2;
export const SAMPLE_RATE_HZ = 16000;
