import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  AppText,
  Button,
  FilterChip,
  Modal,
  ErrorState,
} from '@/components/ui';
import { getBeerStyleTheme } from '@/theme/beerStyles';
import { spacing } from '@/theme/tokens';
import {
  abvOptions,
  priceOptions,
  styleOptions,
  servingOptions,
  bitternessOptions,
  flagOptions,
  productCount,
  type CatalogRequest,
  type CatalogFilters as Filters,
} from '../model';
import { useCatalogCount, useCatalogMetadata } from '../useCatalog';

export function CatalogFilters({
  request,
  onApply,
  onClose,
}: {
  request: CatalogRequest;
  onApply: (filters: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(request.filters ?? {});
  const count = useCatalogCount({ ...request, filters: draft });
  const metadata = useCatalogMetadata(true);
  function multi(
    key: 'styles' | 'servingTypes' | 'breweries' | 'bitterness',
    value: string,
  ) {
    setDraft((current) => {
      const values: readonly string[] = current[key] ?? [];
      return {
        ...current,
        [key]: values.includes(value)
          ? values.filter((v) => v !== value)
          : [...values, value],
      };
    });
  }
  const groups = [
    { key: 'styles' as const, title: 'Стиль пива', options: styleOptions },
    { key: 'servingTypes' as const, title: 'Формат', options: servingOptions },
    {
      key: 'breweries' as const,
      title: 'Броварня',
      options: (metadata.data?.breweries ?? []).map((id) => ({
        id,
        label: id,
      })),
    },
    {
      key: 'bitterness' as const,
      title: 'Гіркота',
      options: bitternessOptions,
    },
  ];
  return (
    <Modal
      visible
      title="Фільтри"
      onClose={onClose}
      footer={
        <>
          {count.isError && (
            <ErrorState
              title="Не вдалося порахувати товари"
              onRetry={() => {
                void count.refetch();
              }}
            />
          )}
          <Button
            label={
              count.data
                ? `Показати ${productCount(count.data.total)}`
                : 'Рахуємо товари…'
            }
            disabled={!count.data || count.isFetching || count.isError}
            testID="apply-filters"
            onPress={() => onApply(draft)}
          />
          <Button
            label="Скинути"
            variant="ghost"
            onPress={() => setDraft({})}
          />
        </>
      }
    >
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <AppText variant="label">{group.title}</AppText>
          {group.key === 'breweries' && metadata.isError && (
            <Button
              label="Оновити броварні"
              variant="ghost"
              onPress={() => {
                void metadata.refetch();
              }}
            />
          )}
          <View style={styles.options}>
            {group.options.map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                accessibilityLabel={`${group.title}: ${option.label}`}
                selected={(
                  draft[group.key] as readonly string[] | undefined
                )?.includes(option.id)}
                style={
                  group.key === 'styles'
                    ? { borderColor: getBeerStyleTheme(option.id).accent }
                    : undefined
                }
                onPress={() => multi(group.key, option.id)}
              />
            ))}
          </View>
        </View>
      ))}
      {(
        [
          { key: 'abv', title: 'Міцність', options: abvOptions },
          { key: 'price', title: 'Ціна за порцію', options: priceOptions },
        ] as const
      ).map((group) => (
        <View key={group.key} style={styles.group}>
          <AppText variant="label">{group.title}</AppText>
          <View style={styles.options}>
            {group.options.map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                selected={draft[group.key] === option.id}
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    [group.key]:
                      current[group.key] === option.id ? undefined : option.id,
                  }))
                }
              />
            ))}
          </View>
        </View>
      ))}
      <View style={styles.group}>
        <AppText variant="label">Особливості</AppText>
        <View style={styles.options}>
          {flagOptions.map(({ id, label }) => (
            <FilterChip
              key={id}
              label={label}
              selected={!!draft[id]}
              onPress={() =>
                setDraft((current) => ({ ...current, [id]: !current[id] }))
              }
            />
          ))}
        </View>
      </View>
      {!request.storeId && (
        <AppText variant="caption" color="textSubtle">
          Наявність у конкретному магазині уточнюється після його вибору.
        </AppText>
      )}
    </Modal>
  );
}
const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
