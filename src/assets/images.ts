import type { ImageSourcePropType } from 'react-native';
const placeholder: ImageSourcePropType = require('./product-placeholder.png');
export function resolveProductImage(image: string): ImageSourcePropType | undefined {
  if (image.startsWith('https://')) {
    try {
      const url = new URL(image);
      if (url.protocol === 'https:' && !url.username && !url.password) return { uri: url.href };
    } catch { /* An invalid remote image uses the intentional fallback. */ }
    return undefined;
  }
  // An explicit local illustration key; missing photos retain the neutral fallback.
  return image === 'local-product-illustration' ? placeholder : undefined;
}
