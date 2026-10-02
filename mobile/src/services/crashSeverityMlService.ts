// ════════════════════════════════════════════════════════════════════════════════
// ResQDrive — On-Device Crash Severity Machine Learning Inference Engine
// ════════════════════════════════════════════════════════════════════════════════
// Machine Learning Model: Random Forest Classifier (300 Decision Trees, 91.12% Accuracy)
// Trained Features: ['a_peak', 'delta_v', 'jerk', 'gyro_peak', 'sound_rms', 'duration_ms']
// Target Severity Classes: ['minor', 'moderate', 'none', 'severe']
// ════════════════════════════════════════════════════════════════════════════════

import FOREST_TREES_JSON from '../assets/crash_severity_rf_model.json';

export interface CrashFeatures {
  a_peak: number;        // Acceleration peak in g-forces (g)
  delta_v: number;       // Speed drop in km/h
  jerk: number;          // Acceleration derivative da/dt (g/s)
  gyro_peak: number;     // Angular velocity peak in deg/s
  sound_rms: number;     // Acoustic RMS energy [0.0, 1.0]
  duration_ms: number;   // Impact / sound transient window duration in ms
}

export type SeverityClass = 'none' | 'minor' | 'moderate' | 'severe';

export interface MlClassificationResult {
  topClass: SeverityClass;
  confidence: number;
  classProbabilities: Record<SeverityClass, number>;
}

const FEATURE_NAMES = ["a_peak", "delta_v", "jerk", "gyro_peak", "sound_rms", "duration_ms"];
const CLASS_NAMES: SeverityClass[] = ["minor", "moderate", "none", "severe"];

// Compact binary tree nodes representation
// Node structure: [feature_idx, threshold, left_child_idx, right_child_idx] OR [-1, p0, p1, p2, p3]
const FOREST_TREES: number[][][] = FOREST_TREES_JSON as number[][][];

/**
 * Runs 0ms latency on-device Machine Learning inference across all 300 decision trees
 * to predict vehicle accident severity tier.
 */
export function classifyCrashSeverityMl(features: CrashFeatures): MlClassificationResult {
  const featVec = [
    features.a_peak,
    features.delta_v,
    features.jerk,
    features.gyro_peak,
    features.sound_rms,
    features.duration_ms,
  ];

  const numClasses = CLASS_NAMES.length;
  const accumProbs = new Float32Array(numClasses);
  const numTrees = FOREST_TREES.length;

  for (let i = 0; i < numTrees; i++) {
    const tree = FOREST_TREES[i];
    let curr = 0;

    while (curr < tree.length) {
      const node = tree[curr];
      if (node[0] === -1) {
        // Leaf node reached — accumulate tree probability distribution
        for (let c = 0; c < numClasses; c++) {
          accumProbs[c] += node[c + 1];
        }
        break;
      } else {
        const featIdx = node[0];
        const threshold = node[1];
        const val = featVec[featIdx] ?? 0;

        if (val <= threshold) {
          curr = node[2]; // Left child
        } else {
          curr = node[3]; // Right child
        }
      }
    }
  }

  // Average class probabilities across all decision trees
  let maxProb = -1;
  let topClassIdx = 0;
  const classProbabilities: Record<string, number> = {};

  for (let c = 0; c < numClasses; c++) {
    const prob = accumProbs[c] / numTrees;
    const className = CLASS_NAMES[c];
    classProbabilities[className] = prob;

    if (prob > maxProb) {
      maxProb = prob;
      topClassIdx = c;
    }
  }

  return {
    topClass: CLASS_NAMES[topClassIdx],
    confidence: maxProb,
    classProbabilities: classProbabilities as Record<SeverityClass, number>,
  };
}
