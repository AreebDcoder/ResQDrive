/**
 * haptics.ts — Centralized haptic feedback presets.
 *
 * Wraps expo-haptics with semantic presets so screens don't need to
 * import ImpactFeedbackStyle enum directly.
 *
 * Usage:
 *   import { hapticLight, hapticHeavy } from '../utils/haptics';
 *   hapticLight();   // on each countdown tick
 *   hapticHeavy();   // on SOS press
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light impact — for countdown ticks, row selection, small toggles */
export function hapticLight() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

/** Medium impact — for switches, tab changes, moderate actions */
export function hapticMedium() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

/** Heavy impact — for SOS press, emergency trigger, destructive actions */
export function hapticHeavy() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }
}

/** Success notification — for dispatch complete, save success */
export function hapticSuccess() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

/** Warning notification — for partial dispatch, error states */
export function hapticWarning() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }
}

/** Error notification — for dispatch failure, critical errors */
export function hapticError() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }
}
