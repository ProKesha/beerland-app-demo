import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, FilterChip } from '@/components/ui';
import { spacing } from '@/theme/tokens';
import type { CommerceGroup } from '@/types/domain';
import { commerceGroups, type CatalogRequest } from '../model';
import { useCatalogMetadata } from '../useCatalog';

export function CommerceGroupFilters({
  request,
  storeName,
  enabled,
  onGroup,
  onSubcategory,
}: {
  request: CatalogRequest;
  storeName?: string;
  enabled: boolean;
  onGroup: (group?: CommerceGroup) => void;
  onSubcategory: (subcategory?: string) => void;
}) {
  const metadata = useCatalogMetadata(enabled);
  const group = commerceGroups.find((item) => item.id === request.group);
  const subcategories =
    metadata.data?.commerceGroups?.find((item) => item.id === request.group)
      ?.subcategories ?? [];
  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <FilterChip
          label="Весь каталог"
          accessibilityLabel="Колекція: Весь каталог"
          selected={!request.group}
          onPress={() => onGroup()}
        />
        {commerceGroups.map(({ id, shortLabel, label }) => (
          <FilterChip
            key={id}
            label={shortLabel}
            accessibilityLabel={`Колекція: ${label}`}
            testID={`catalog-group-${id}`}
            selected={request.group === id}
            onPress={() => onGroup(id)}
          />
        ))}
      </ScrollView>
      {group && (
        <View style={styles.collection}>
          <AppText variant="title" accessibilityRole="header">
            {group.label}
          </AppText>
          {request.group === 'onTap' && storeName && (
            <AppText variant="caption" color="textSubtle">
              Доступне сьогодні у {storeName}
            </AppText>
          )}
          {!!subcategories.length && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <FilterChip
                label="Усе в колекції"
                accessibilityLabel="Підкатегорія: Усе в колекції"
                selected={!request.subcategory}
                onPress={() => onSubcategory()}
              />
              {subcategories.map(({ id, label }) => (
                <FilterChip
                  key={id}
                  label={label}
                  accessibilityLabel={`Підкатегорія: ${label}`}
                  selected={request.subcategory === id}
                  onPress={() => onSubcategory(id)}
                />
              ))}
            </ScrollView>
          )}
          {metadata.isError && (
            <Button
              label="Оновити підкатегорії"
              variant="ghost"
              size="compact"
              onPress={() => {
                void metadata.refetch();
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  collection: { gap: spacing.xs },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
});
