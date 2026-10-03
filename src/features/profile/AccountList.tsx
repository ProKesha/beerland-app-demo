import type { ReactNode } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';
import { ListSkeleton, Screen } from '@/components/ui';
import { sessionOwner, useSessionStore } from '@/stores/session';
import { spacing } from '@/theme/tokens';
import { AccountHeader } from './AccountPage';

/** One vertical scroll owner for collections that can grow with real accounts. */
export function AccountList<T>({
  title,
  items,
  keyExtractor,
  renderItem,
  empty,
  header,
}: {
  title: string;
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  empty: ReactNode;
  header?: ReactNode;
}) {
  const hydrated = useSessionStore((state) => state.hydrated);
  const owner = useSessionStore(sessionOwner);
  return (
    <Screen scroll={false} includeBottomInset keyboardAware>
      <FlatList
        key={owner}
        style={styles.list}
        contentContainerStyle={styles.content}
        data={hydrated ? items : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        ListHeaderComponent={
          <View style={styles.header}>
            <AccountHeader title={title} />
            {hydrated && header}
          </View>
        }
        ListEmptyComponent={<View>{hydrated ? empty : <ListSkeleton />}</View>}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { flex: 1, minHeight: 0 },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  header: { gap: spacing.xl },
});
