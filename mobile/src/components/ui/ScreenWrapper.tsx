import React from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export interface ScreenWrapperProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollable?: boolean;
  padding?: number;
}

/**
 * ScreenWrapper — standardized screen container with loading/empty/error states.
 *
 * Usage:
 *   <ScreenWrapper loading={isLoading} error={error} onRetry={refetch} empty={data?.length === 0}>
 *     {data?.map(item => <Card key={item.id}>...</Card>)}
 *   </ScreenWrapper>
 *
 * Features:
 *   - Loading: shows centered Spinner
 *   - Error: shows ErrorState with retry button
 *   - Empty: shows EmptyState
 *   - Refresh: pull-to-refresh via RefreshControl
 *   - Theme-aware background color
 *   - Scrollable option for long content
 *   - Consistent padding
 */
export function ScreenWrapper({
  children, loading, error, empty, emptyTitle = 'No data found',
  emptyDescription = 'Try refreshing or check back later.',
  emptyIcon = 'list', onRetry, onRefresh, refreshing, scrollable = true, padding = spacing.lg,
}: ScreenWrapperProps) {
  const { colors: tc } = useTheme();

  const content = () => {
    if (loading) return <Spinner label="Loading..." />;
    if (error) return <ErrorState title="Something went wrong" description={error} onRetry={onRetry} />;
    if (empty) return <EmptyState icon={emptyIcon as any} title={emptyTitle} description={emptyDescription} />;
    return children;
  };

  if (scrollable && !loading && !error && !empty) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: tc.background }]}
        contentContainerStyle={[styles.content, { padding }]}
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} tintColor={tc.text} />
        ) : undefined}
      >
        {content()}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.background }, !loading && !error && !empty && { padding }]}>
      {content()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
});
