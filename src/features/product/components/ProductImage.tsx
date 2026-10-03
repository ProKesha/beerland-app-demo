import { useEffect, useState } from 'react';
import {
  Image,
  View,
  StyleSheet,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, layout, radius, spacing } from '@/theme/tokens';
import { getBeerStyleTheme } from '@/theme/beerStyles';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShopProductArtwork } from './ShopProductArtwork';
export interface ProductImageProps {
  source?: ImageSourcePropType | null;
  styleName?: string;
  label: string;
  compact?: boolean;
  shop?: boolean;
}
export function ProductImage(props: ProductImageProps) {
  return <ImageContent key={JSON.stringify(props.source ?? null)} {...props} />;
}
function ImageContent({
  source,
  styleName,
  label,
  compact = false,
  shop = false,
}: ProductImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    source ? 'loading' : 'error',
  );
  const theme = getBeerStyleTheme(styleName);
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), 12_000);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.tint },
        compact && styles.compact,
        shop && styles.shop,
      ]}
    >
      {source && status !== 'error' && (
        <Image
          source={source}
          accessible={status === 'loaded'}
          accessibilityElementsHidden={status !== 'loaded'}
          importantForAccessibility={
            status === 'loaded' ? 'auto' : 'no-hide-descendants'
          }
          resizeMode="contain"
          accessibilityLabel={label}
          style={[styles.image, status === 'loading' && { opacity: 0 }]}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'loading' && (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Завантаження фото: ${label}`}
          style={styles.fallback}
        >
          <Skeleton width="60%" height="70%" />
        </View>
      )}
      {status === 'error' && (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            shop ? `Ілюстрація товару: ${label}` : `${label}: фото поки немає`
          }
          style={styles.fallback}
        >
          {shop ? (
            <ShopProductArtwork seed={label} styleName={styleName} />
          ) : (
            <Svg
              width={spacing.giant}
              height={spacing.giant}
              viewBox="0 0 48 48"
              stroke={colors.textSubtle}
              strokeWidth="1.5"
              fill="none"
            >
              <Path d="M13 7h22l-3 34H16L13 7ZM15 17h18M20 22v13M26 22v13" />
            </Svg>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    aspectRatio: layout.productAspectRatio,
    borderRadius: radius.md,
    overflow: 'hidden',
    width: '100%',
  },
  compact: {
    width: layout.compactImageWidth,
    aspectRatio: 0.8,
    alignSelf: 'flex-start',
  },
  shop: { borderRadius: 0, aspectRatio: 1.2 },
  image: { width: '100%', height: '100%' },
  fallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
