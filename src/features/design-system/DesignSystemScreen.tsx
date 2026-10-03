import { formatMoney } from '@/utils/format';
import { useState, type PropsWithChildren } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  AppText,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  ErrorState,
  FilterChip,
  Icon,
  IconButton,
  ListSkeleton,
  LoadingIndicator,
  Modal,
  OfflineBanner,
  Price,
  ProductCardSkeleton,
  QuantityControl,
  Screen,
  SearchInput,
  SectionHeader,
  TextInput,
  useToast,
} from '@/components/ui';
import type { IconName } from '@/components/ui/Icon';
import { colors, layout, radius, spacing, typography } from '@/theme/tokens';
import { getBeerStyleTheme } from '@/theme/beerStyles';
import { CraftAccent } from '@/components/common/CraftAccent';
import { EmptyState } from '@/components/common/EmptyState';
import { ProductCard } from '@/features/product/components/ProductCard';
import { BitternessIndicator } from '@/features/product/components/BitternessIndicator';
import { FlavorProfile } from '@/features/product/components/FlavorProfile';
import { useProducts } from '@/features/catalog/useProducts';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import type { Product } from '@/types/domain';

function Section({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </View>
  );
}
const textSamples: {
  variant: keyof typeof typography;
  label: string;
  text: string;
}[] = [
  {
    variant: 'displayLarge',
    label: 'Великий акцент',
    text: 'Смак має історію',
  },
  { variant: 'display', label: 'Акцент', text: 'Знайди свій смак' },
  {
    variant: 'h1',
    label: 'Заголовок сторінки',
    text: 'Добрий вечір, Beerland',
  },
  { variant: 'h2', label: 'Заголовок розділу', text: 'Від нашої броварні' },
  { variant: 'h3', label: 'Малий заголовок', text: 'Для теплих зустрічей' },
  { variant: 'title', label: 'Назва товару', text: 'Бурштиновий вечір' },
  {
    variant: 'body',
    label: 'Основний текст',
    text: 'Пиво, за яким стоять люди та їхня справа.',
  },
  {
    variant: 'bodyMedium',
    label: 'Виділений текст',
    text: 'Зварено з увагою до деталей.',
  },
  {
    variant: 'bodySmall',
    label: 'Допоміжний текст',
    text: 'Самовивіз із вашого магазину.',
  },
  { variant: 'label', label: 'Підпис', text: 'Ваш магазин' },
  { variant: 'caption', label: 'Примітка', text: '5,1% • 35 IBU • 500 мл' },
  {
    variant: 'priceLarge',
    label: 'Велика ціна',
    text: formatMoney({ amount: 9500, currency: 'UAH' }),
  },
  {
    variant: 'price',
    label: 'Ціна',
    text: formatMoney({ amount: 9500, currency: 'UAH' }),
  },
  { variant: 'button', label: 'Кнопка', text: 'Додати в кошик' },
];
export function DesignSystemScreen() {
  const [selected, setSelected] = useState('ipa');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(2);
  const [emptyVariant, setEmptyVariant] = useState<
    'cart' | 'favorites' | 'orders' | 'search'
  >('cart');
  const [modal, setModal] = useState(false);
  const toast = useToast();
  const query = useProducts();
  const favorites = useFavoritesStore((state) => state.productIds);
  const toggle = useFavoritesStore((state) => state.toggle);
  const addItem = useCartStore((state) => state.addItem);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const add = (product: Product) => {
    addItem({
      productId: product.id,
      storeId: product.storeIds[0],
      quantity: 1,
    });
    toast.show('Додано в кошик');
  };
  const favorite = (product: Product) => {
    toggle(product.id);
    toast.show(
      favorites.includes(product.id)
        ? 'Видалено з обраного'
        : 'Додано в обране',
    );
  };
  return (
    <Screen includeBottomInset keyboardAware>
      <Container style={styles.page}>
        <View style={styles.top}>
          <AppText variant="label">BEERLAND</AppText>
          <IconButton
            accessibilityLabel="До застосунку"
            icon={<Icon name="arrow-right" />}
            onPress={() => router.replace('/')}
          />
        </View>
        <View style={styles.hero}>
          <CraftAccent kind="wheat" color={colors.primary} />
          <AppText variant="displayLarge">
            Свій смак.{`\n`}Свій характер.
          </AppText>
          <AppText color="textSubtle">
            Тепла естетика крафту. Зручність щодня.
          </AppText>
          <Badge label="Бібліотека компонентів · для команди" />
        </View>
        <Card>
          <AppText variant="bodySmall">
            Тут ми перевіряємо компоненти майбутнього Beerland. Товари й
            магазини демонстраційні.
          </AppText>
          <AppText variant="caption" color="textSubtle">
            Дії з картками змінюють локальний демо-кошик та обране. У кошику:{' '}
            {cartCount}.
          </AppText>
        </Card>
        <Section
          title="01. Типографіка"
          subtitle="Lora — характер. Manrope — ясність."
        >
          {textSamples.map((item) => (
            <View key={item.variant} style={styles.sample}>
              <AppText variant="caption" color="textSubtle">
                {item.label}
              </AppText>
              <AppText variant={item.variant}>{item.text}</AppText>
            </View>
          ))}
        </Section>
        <Divider />
        <Section title="02. Палітра" subtitle="Світла основа, виразні акценти.">
          <View style={styles.swatches}>
            {Object.entries(colors).map(([key, value]) => (
              <View key={key} style={styles.swatch}>
                <View style={[styles.color, { backgroundColor: value }]} />
                <AppText variant="caption">{value}</AppText>
              </View>
            ))}
          </View>
        </Section>
        <Section title="03. Кнопки">
          <Button
            label="Знайти свій смак"
            leftIcon={
              <Icon name="search" color={colors.background} size="md" />
            }
            onPress={() => toast.show('Знайдемо щось цікаве')}
          />
          <Button
            label="Обрати магазин"
            variant="secondary"
            onPress={() => setModal(true)}
          />
          <Button
            label="Продовжити"
            variant="outline"
            rightIcon={<Icon name="arrow-right" size="md" />}
            onPress={() => toast.show('Продовжуємо')}
          />
          <Button
            label="Дивитися всі"
            variant="ghost"
            onPress={() => toast.show('Приклад дії')}
          />
          <Button
            label="Видалити"
            variant="danger"
            onPress={() => toast.show('Приклад видалення')}
          />
          <View style={styles.row}>
            <Button
              label="Компактна"
              size="compact"
              onPress={() => toast.show('Готово')}
            />
            <Button label="Недоступно" disabled />
          </View>
          <Button label="Додаємо…" loading fullWidth />
        </Section>
        <Section title="04. Вибір і фільтри">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {['lager', 'ipa', 'stout', 'wheat'].map((style) => (
              <FilterChip
                key={style}
                label={getBeerStyleTheme(style).label}
                selected={selected === style}
                onPress={() => setSelected(style)}
              />
            ))}
          </ScrollView>
          <FilterChip
            label="Лише доступні"
            leftIcon={<Icon name="check" size="sm" />}
          />
        </Section>
        <Section title="05. Поля">
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Назва, стиль або броварня"
            onSearch={(value) =>
              toast.show(
                value ? `Шукаємо: ${value}` : 'Введіть назву або стиль',
              )
            }
          />
          <TextInput
            label="Ваше ім’я"
            value={name}
            onChangeText={setName}
            placeholder="Як до вас звертатися?"
            helperText="Так ми підпишемо ваше замовлення."
          />
          <TextInput
            label="Телефон"
            placeholder="+380"
            keyboardType="phone-pad"
            errorText="Вкажіть номер повністю."
            leadingIcon={<Icon name="phone" size="md" />}
          />
          <TextInput
            label="Місто"
            value="Київ"
            disabled
            helperText="Поле тимчасово недоступне."
          />
        </Section>
        <Section title="06. Позначки">
          <View style={styles.row}>
            {(['new', 'popular', 'ownBrewery', 'promotion'] as const).map(
              (kind) => (
                <Badge key={kind} kind={kind} />
              ),
            )}
            <Badge label="Безалкогольне" />
          </View>
          <Card>
            <AppText variant="title">Проста картка</AppText>
            <AppText variant="bodySmall">
              М’яка межа, чиста поверхня, достатньо простору.
            </AppText>
          </Card>
        </Section>
        <Section title="07. Кольори смаку">
          <View style={styles.row}>
            {['ipa', 'amber', 'stout', 'wheat', 'lager'].map((style) => {
              const theme = getBeerStyleTheme(style);
              return (
                <View
                  key={style}
                  style={[styles.styleChip, { backgroundColor: theme.tint }]}
                >
                  <View
                    style={[styles.dot, { backgroundColor: theme.accent }]}
                  />
                  <AppText variant="label">{theme.label}</AppText>
                </View>
              );
            })}
          </View>
        </Section>
        <Section
          title="08. Картки товарів"
          subtitle="Фото — головне. За його відсутності — нейтральний контур склянки."
        >
          {query.isPending ? (
            <ProductCardSkeleton />
          ) : query.isError ? (
            <ErrorState
              onRetry={() => {
                void query.refetch();
              }}
            />
          ) : (
            <>
              <View style={styles.products}>
                {query.data?.slice(0, 2).map((product) => (
                  <View style={styles.product} key={product.id}>
                    <ProductCard
                      product={product}
                      isFavorited={favorites.includes(product.id)}
                      onFavorite={favorite}
                      onAddToCart={add}
                    />
                  </View>
                ))}
              </View>
              {query.data?.[2] && (
                <ProductCard
                  product={query.data[2]}
                  variant="compact"
                  isFavorited={favorites.includes(query.data[2].id)}
                  onFavorite={favorite}
                  onAddToCart={add}
                />
              )}
            </>
          )}
        </Section>
        <Section title="09. Характер смаку">
          <Card>
            <AppText variant="label">Відчуття гіркоти</AppText>
            {(['low', 'medium', 'high'] as const).map((level) => (
              <BitternessIndicator key={level} level={level} />
            ))}
            <AppText variant="caption" color="textSubtle">
              Це опис смаку, а не рейтинг. IBU показуємо окремо.
            </AppText>
            <Divider />
            <FlavorProfile
              values={{ bitterness: 3, sweetness: 2, acidity: 1, fullness: 4 }}
            />
          </Card>
        </Section>
        <Section title="10. Ціна та кількість">
          <Card>
            <Price
              currentPrice={{ amount: 9500, currency: 'UAH' }}
              volume={{ value: 500, unit: 'ml' }}
              size="large"
            />
            <Price
              currentPrice={{ amount: 12000, currency: 'UAH' }}
              discountPrice={{ amount: 9500, currency: 'UAH' }}
            />
            <QuantityControl
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={6}
            />
            <AppText variant="caption" color="textSubtle">
              Від 1 до 6 у цьому прикладі.
            </AppText>
          </Card>
        </Section>
        <Section title="11. Порожні стани">
          <View style={styles.row}>
            {(
              [
                ['cart', 'Кошик'],
                ['favorites', 'Обране'],
                ['orders', 'Замовлення'],
                ['search', 'Пошук'],
              ] as const
            ).map(([value, label]) => (
              <FilterChip
                key={value}
                label={label}
                selected={emptyVariant === value}
                onPress={() => setEmptyVariant(value)}
              />
            ))}
          </View>
          <Card>
            <EmptyState
              variant={emptyVariant}
              action={{
                onPress: () => toast.show('Приклад дії порожнього стану'),
              }}
            />
          </Card>
        </Section>
        <Section title="12. Завантаження">
          <ProductCardSkeleton />
          <ProductCardSkeleton variant="compact" />
          <ListSkeleton count={2} />
          <LoadingIndicator />
          <AppText variant="caption" color="textSubtle">
            Скелетони — для вмісту. Індикатор — для коротких дій.
          </AppText>
        </Section>
        <Section title="13. Зворотний зв’язок">
          <Card>
            <ErrorState onRetry={() => toast.show('Повторюємо завантаження')} />
          </Card>
          <OfflineBanner />
          <Button
            label="Показати повідомлення"
            variant="outline"
            onPress={() => toast.show('Додано в кошик')}
          />
          <Button label="Відкрити вікно" onPress={() => setModal(true)} />
        </Section>
        <Section title="14. Іконки й акценти">
          <View style={styles.row}>
            {(
              [
                'home',
                'grid',
                'map-pin',
                'shopping-bag',
                'user',
                'heart',
                'search',
                'plus',
                'minus',
                'x',
                'droplet',
                'check',
              ] as IconName[]
            ).map((name) => (
              <View key={name} style={styles.icon}>
                <Icon name={name} />
              </View>
            ))}
            <CraftAccent />
            <CraftAccent kind="wheat" color={colors.warning} />
          </View>
        </Section>
        <AppText variant="caption" color="textSubtle">
          Beerland · Бібліотека компонентів · Фаза 2.1
        </AppText>
      </Container>
      <Modal
        visible={modal}
        title="Знайомство зі смаком"
        description="Приклад простого вікна для майбутніх дій."
        onClose={() => setModal(false)}
        footer={
          <Button
            label="Зрозуміло"
            fullWidth
            onPress={() => {
              setModal(false);
              toast.show('Домовилися');
            }}
          />
        }
      >
        <AppText>Тут можуть бути пояснення, вибір або коротка форма.</AppText>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { gap: spacing.xxxl, paddingBottom: spacing.giant },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hero: { gap: spacing.lg },
  section: { gap: spacing.lg },
  sample: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { flexBasis: '29%', flexGrow: 1, gap: spacing.xs },
  color: {
    height: spacing.giant,
    borderRadius: radius.sm,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  dot: { width: spacing.md, height: spacing.md, borderRadius: radius.pill },
  products: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  product: { flexGrow: 1, flexBasis: layout.productCardMinWidth, minWidth: 0 },
  icon: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
});
