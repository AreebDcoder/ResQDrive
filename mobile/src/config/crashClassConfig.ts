export const CRASH_RELEVANT_CLASS_NAMES = [
  'Glass',
  'Shatter',
  'Explosion',
  'Boom',
  'Skidding',
  'Tire squeal',
  'Vehicle',
  'Breaking',
] as const;

export type CrashRelevantClassName = (typeof CRASH_RELEVANT_CLASS_NAMES)[number];

// Resolved index mapping from yamnet_class_map.csv:
// 'Glass': 435, 'Shatter': 437, 'Explosion': 420, 'Boom': 430, 'Skidding': 306, 'Tire squeal': 307, 'Vehicle': 294, 'Breaking': 464
export const CRASH_CLASS_INDICES: number[] = [435, 437, 420, 430, 306, 307, 294, 464];

export const CLASS_INDEX_TO_NAME: Record<number, CrashRelevantClassName> = {
  435: 'Glass',
  437: 'Shatter',
  420: 'Explosion',
  430: 'Boom',
  306: 'Skidding',
  307: 'Tire squeal',
  294: 'Vehicle',
  464: 'Breaking',
};

export const CRASH_CONFIDENCE_THRESHOLD = 0.3;
export const ROLLING_WINDOW_SECONDS = 2;
export const SAMPLE_RATE_HZ = 16000;
