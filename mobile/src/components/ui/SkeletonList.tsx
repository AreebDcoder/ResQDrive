/**
 * SkeletonList — renders N skeleton cards matching common list layouts.
 *
 * Replaces full-screen ActivityIndicator spinners with layout-matched
 * skeleton placeholders that give the user a sense of what's coming.
 *
 * Usage:
 *   import { SkeletonList } from '../components/ui';
 *   {isLoading ? <SkeletonList count={5} /> : <FlatList ... />}
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { spacing, radius } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export interface SkeletonListProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Layout variant: 'card' (default) or 'row' (compact list item) */
  variant?: 'card' | 'row';
}

export function SkeletonList({ count = 4, variant = 'card' }: SkeletonListProps) {
  const { colors: tc } = useTheme();
  
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            variant === 'card' ? styles.card : styles.row,
            { backgroundColor: tc.surface, borderColor: tc.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width="70%" height={14} />
              <Skeleton width="50%" height={10} />
            </View>
          </View>
          {variant === 'card' && (
            <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              <Skeleton width="90%" height={10} />
              <Skeleton width="60%" height={10} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  row: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
