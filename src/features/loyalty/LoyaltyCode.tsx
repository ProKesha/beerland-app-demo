import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import createQRCode from 'qrcode-generator';
import { colors } from '@/theme/tokens';
export function loyaltyMatrix(value: string) {
  const qr = createQRCode(0, 'M');
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  let path = '';
  for (let row = 0; row < count; row++)
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col + 4},${row + 4}h1v1h-1z`;
    }
  return { path, size: count + 8 };
}
export function LoyaltyCode({
  value,
  size = 200,
}: {
  value: string;
  size?: number;
}) {
  const matrix = useMemo(() => loyaltyMatrix(value), [value]);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="QR-код демонстраційної клубної картки"
      testID="loyalty-code"
      style={{
        width: '100%',
        maxWidth: size,
        aspectRatio: 1,
        alignSelf: 'center',
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${matrix.size} ${matrix.size}`}
      >
        <Rect width={matrix.size} height={matrix.size} fill={colors.surface} />
        <Path d={matrix.path} fill={colors.brandBlack} />
      </Svg>
    </View>
  );
}
