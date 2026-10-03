import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors, shopPalette } from '@/theme/tokens';

/** Original, quiet vector compositions sized for the existing 430 px app shell. */
export function WelcomeIllustration({ slide }: { slide: 0 | 1 | 2 }) {
  return (
    <Svg width="100%" height={176} viewBox="0 0 320 176">
      <Rect
        x={8}
        y={8}
        width={304}
        height={160}
        rx={22}
        fill={shopPalette.gold}
      />
      {slide === 0 ? (
        <>
          <Path
            d="M53 106 C103 31 195 36 267 102"
            stroke={colors.secondaryBorder}
            strokeWidth={3}
            strokeDasharray="5 8"
            fill="none"
          />
          {[56, 160, 264].map((x) => (
            <Circle
              key={x}
              cx={x}
              cy={x === 160 ? 56 : 112}
              r={18}
              fill={colors.surface}
              stroke={colors.primary}
              strokeWidth={2}
            />
          ))}
          <Path
            d="M49 113 L49 107 L56 101 L63 107 L63 113 M53 113 V108 H59 V113"
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M153 59 L153 53 L160 47 L167 53 L167 59 M157 59 V54 H163 V59"
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M257 113 L257 107 L264 101 L271 107 L271 113 M261 113 V108 H267 V113"
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
          />
        </>
      ) : slide === 1 ? (
        <>
          <Circle cx={91} cy={76} r={38} fill={colors.ipaTint} />
          <Circle cx={218} cy={94} r={44} fill={colors.wheatTint} />
          <Path
            d="M76 50 H106 L102 126 Q91 135 80 126 Z"
            fill={colors.surface}
            stroke={colors.primary}
            strokeWidth={3}
          />
          <Path
            d="M78 76 H104 L102 120 Q91 128 80 120 Z"
            fill={colors.ipa}
            opacity={0.75}
          />
          <Path
            d="M194 46 H236 L232 130 Q215 140 198 130 Z"
            fill={colors.surface}
            stroke={colors.primary}
            strokeWidth={3}
          />
          <Path
            d="M198 86 H232 L230 126 Q215 134 200 126 Z"
            fill={colors.amber}
            opacity={0.7}
          />
          <Line
            x1={70}
            y1={137}
            x2={247}
            y2={137}
            stroke={colors.secondaryBorder}
            strokeWidth={2}
          />
        </>
      ) : (
        <>
          <Rect
            x={74}
            y={36}
            width={172}
            height={106}
            rx={14}
            fill={colors.surface}
            stroke={colors.primary}
            strokeWidth={2}
          />
          <Circle
            cx={111}
            cy={78}
            r={19}
            fill={colors.wheatTint}
            stroke={colors.amber}
            strokeWidth={2}
          />
          <Path
            d="M102 78 L109 85 L121 70"
            fill="none"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Line
            x1={142}
            y1={70}
            x2={220}
            y2={70}
            stroke={colors.secondaryBorder}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Line
            x1={142}
            y1={89}
            x2={203}
            y2={89}
            stroke={colors.secondaryBorder}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Line
            x1={97}
            y1={115}
            x2={223}
            y2={115}
            stroke={colors.secondaryBorder}
            strokeWidth={2}
          />
        </>
      )}
    </Svg>
  );
}

export function AgeIllustration() {
  return (
    <Svg width={78} height={94} viewBox="0 0 78 94">
      <Path
        d="M39 86 C40 62 39 37 40 10"
        stroke={colors.primary}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M40 58 C25 49 19 40 20 31 C30 32 38 41 40 58 Z"
        fill={colors.wheat}
        stroke={colors.primary}
        strokeWidth={1.5}
      />
      <Path
        d="M39 46 C53 37 59 27 58 18 C48 20 40 31 39 46 Z"
        fill={colors.amberTint}
        stroke={colors.primary}
        strokeWidth={1.5}
      />
      <Path
        d="M40 27 C31 21 28 14 30 7 C37 9 41 16 40 27 Z"
        fill={colors.wheat}
        stroke={colors.primary}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
