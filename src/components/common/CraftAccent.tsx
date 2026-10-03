import Svg, { Path, Ellipse } from 'react-native-svg';
import { colors, spacing } from '@/theme/tokens';
// Original compact line drawings. Decorative only, never a substitute for a label.
export function CraftAccent({
  kind = 'hop',
  size = spacing.giant,
  color = colors.ipa,
}: {
  kind?: 'hop' | 'wheat';
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {kind === 'hop' ? (
        <>
          <Path d="M24 3v6M24 8C8 11 7 30 24 43C41 30 40 11 24 8Z" />
          <Path d="M13 17l11 7 11-7M11 25l13 8 13-8M17 35l7 8 7-8M24 9v30" />
        </>
      ) : (
        <>
          <Path d="M24 43V7" />
          {[13, 23, 33].map((y) => (
            <Ellipse
              key={y}
              cx="18"
              cy={y}
              rx="4"
              ry="8"
              transform={`rotate(-40 18 ${y})`}
            />
          ))}
          {[13, 23, 33].map((y) => (
            <Ellipse
              key={y}
              cx="30"
              cy={y}
              rx="4"
              ry="8"
              transform={`rotate(40 30 ${y})`}
            />
          ))}
        </>
      )}
    </Svg>
  );
}
