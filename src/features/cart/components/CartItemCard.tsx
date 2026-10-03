import { getBeerStyleTheme } from '@/theme/beerStyles';
import { View, StyleSheet } from 'react-native';
import { useLayoutEffect, useRef } from 'react';
import { AppText, Button, Card, Price, QuantityControl } from '@/components/ui';
import { ProductImage } from '@/features/product/components/ProductImage';
import { resolveProductImage } from '@/assets/images';
import { useCartStore } from '@/stores/cart';
import { cartKey, type CartLine } from '../pricing';
import { formatMoney } from '@/utils/format';
import {
  productVariants,
  variantLabel,
  variantOffer,
} from '@/features/product/variants';
import { spacing } from '@/theme/tokens';
import { ServingControl } from './ServingControl';
import {
  formatProductQuantity,
  priceUnit,
} from '@/features/product/quantityFormat';
import { stepCartPortionCount } from '@/features/product/cartActions';
export function CartItemCard({
  line,
  canOrder = true,
}: {
  line: CartLine;
  canOrder?: boolean;
}) {
  const { item, product } = line;
  const liveVariant = useRef(item.variantId ?? 'default');
  useLayoutEffect(() => {
    liveVariant.current = item.variantId ?? 'default';
  }, [item.variantId]);
  const remove = useCartStore((s) => s.removeItem);
  const replaceVariant = useCartStore((s) => s.replaceVariant);
  const name = product?.name ?? 'Товар недоступний';
  const variant =
    product &&
    productVariants(product).find(
      (v) => v.id === (item.variantId ?? 'default'),
    );
  return (
    <Card testID={`cart-line-${cartKey(item)}`}>
      <View style={styles.row}>
        <ProductImage
          compact
          shop
          source={product ? resolveProductImage(product.image) : null}
          label={name}
          styleName={product?.beerStyle}
        />
        <View style={styles.info}>
          <AppText variant="title">{name}</AppText>
          {product?.beerStyle && (
            <AppText variant="caption" color="textSubtle">
              {getBeerStyleTheme(product.beerStyle).label}
            </AppText>
          )}
          {variant?.servingType !== 'draft' && (
            <AppText variant="bodySmall">{line.variantLabel}</AppText>
          )}
          <AppText variant="caption" color="textSubtle">
            {line.servingLabel}
          </AppText>
          {line.priceKnown ? (
            <Price
              currentPrice={line.unitPrice}
              unit={
                product && variant ? priceUnit(product, variant) : undefined
              }
            />
          ) : (
            <AppText>Ціна недоступна</AppText>
          )}
        </View>
      </View>
      {!line.available && line.issue !== 'Немає в обраному магазині' && (
        <AppText color="error" variant="bodySmall" accessibilityRole="alert">
          Немає в обраному магазині
        </AppText>
      )}
      {line.issue && (
        <AppText color="error" variant="bodySmall" accessibilityRole="alert">
          {line.issue}
        </AppText>
      )}
      {!line.available &&
        product &&
        productVariants(product)
          .filter(
            (variant) =>
              variant.id !== (item.variantId ?? 'default') &&
              variantOffer(product, variant, item.storeId).availability ===
                'available',
          )
          .map((variant) => (
            <Button
              key={variant.id}
              label={`Замінити на ${variantLabel(variant)}`}
              variant="outline"
              onPress={() =>
                replaceVariant(
                  item.productId,
                  item.storeId,
                  variant.id,
                  item.variantId,
                )
              }
            />
          ))}
      {product && variant?.servingType === 'draft' && (
        <>
          <AppText variant="caption" color="textSubtle">
            Об’єм порції
          </AppText>
          <ServingControl
            product={product}
            item={item}
            canOrder={canOrder}
            onVariantChange={(variantId) => {
              liveVariant.current = variantId;
            }}
          />
          <AppText variant="caption" color="textSubtle">
            Кількість порцій
          </AppText>
        </>
      )}
      <View style={styles.controls}>
        <QuantityControl
          label={`${name}, ${line.variantLabel}`}
          value={item.quantity}
          displayValue={
            product && variant && variant.servingType !== 'draft'
              ? formatProductQuantity(product, variant, item.quantity)
              : undefined
          }
          min={1}
          max={
            line.available && canOrder
              ? Math.max(item.quantity, line.maxQuantity)
              : item.quantity
          }
          onStep={(direction) =>
            stepCartPortionCount(
              product,
              item,
              direction,
              canOrder,
              liveVariant.current,
            )
          }
        />
        <AppText
          variant="price"
          accessibilityLabel={`Сума: ${name}, ${line.priceKnown ? formatMoney(line.lineTotal) : 'не враховано в сумі'}`}
        >
          {line.priceKnown
            ? formatMoney(line.lineTotal)
            : 'Не враховано в сумі'}
        </AppText>
      </View>
      <Button
        label="Видалити"
        accessibilityLabel={`Видалити: ${name}, ${line.variantLabel}`}
        variant="ghost"
        size="compact"
        onPress={() => remove(item.productId, item.storeId, item.variantId)}
      />
    </Card>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, minWidth: 0, gap: spacing.xs },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
