import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { shopPalette } from '@/theme/tokens';

const palettes = [
  { backdrop: '#E8662D', label: '#FFF2C5', accent: '#F8BD41' },
  { backdrop: '#1D82A4', label: '#FFF0C7', accent: '#EB5945' },
  { backdrop: '#B52343', label: '#FEE9B6', accent: '#FFBE43' },
  { backdrop: '#11876E', label: '#FFF0C5', accent: '#E6B24B' },
  { backdrop: '#F1A90A', label: '#13234E', accent: '#FFF1C7' },
];

export function ShopProductArtwork({
  seed,
  styleName,
}: {
  seed: string;
  styleName?: string;
}) {
  const isSnack = styleName === 'snacks';
  const index =
    Array.from(seed).reduce(
      (value, character) => value + character.charCodeAt(0),
      0,
    ) % palettes.length;
  const palette = palettes[index];
  return (
    <View style={[styles.root, { backgroundColor: palette.backdrop }]}>
      <Svg
        viewBox="0 0 320 240"
        width="100%"
        height="100%"
        accessibilityElementsHidden
      >
        <Circle cx="277" cy="40" r="31" fill={palette.accent} opacity="0.8" />
        <Circle cx="44" cy="183" r="22" fill={palette.accent} opacity="0.75" />
        <Circle cx="85" cy="41" r="4" fill={shopPalette.white} />
        <Circle cx="291" cy="172" r="5" fill={shopPalette.white} />
        <Path
          d="M13 123c21-28 43-36 63-33M240 198c23-24 43-31 70-18"
          stroke={palette.label}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <Ellipse
          cx="166"
          cy="221"
          rx="82"
          ry="9"
          fill={shopPalette.navy}
          opacity="0.2"
        />
        {isSnack ? (
          <G>
            <Path
              d="M98 70h112l-11 141H108L98 70Z"
              fill={palette.label}
              stroke={shopPalette.navy}
              strokeWidth="4"
            />
            <Path
              d="M102 80h104M111 199h84"
              stroke={shopPalette.navy}
              strokeWidth="5"
            />
            <Path d="M118 106h72l-6 66h-60l-6-66Z" fill={palette.accent} />
            <Circle cx="154" cy="140" r="22" fill={shopPalette.navy} />
            <Path
              d="M139 141c10-14 21-12 31 0M142 149c9-5 18-4 26 1"
              stroke={palette.label}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <Circle
              cx="70"
              cy="170"
              r="12"
              fill={palette.label}
              stroke={shopPalette.navy}
              strokeWidth="3"
            />
            <Circle
              cx="234"
              cy="182"
              r="13"
              fill={palette.label}
              stroke={shopPalette.navy}
              strokeWidth="3"
            />
          </G>
        ) : (
          <>
            <G rotation="-15" origin="110,126">
              <Rect
                x="78"
                y="67"
                width="66"
                height="140"
                rx="11"
                fill={palette.label}
                stroke={shopPalette.navy}
                strokeWidth="3"
              />
              <Rect
                x="83"
                y="76"
                width="56"
                height="10"
                rx="4"
                fill={shopPalette.navy}
              />
              <Rect
                x="83"
                y="108"
                width="56"
                height="64"
                fill={palette.accent}
              />
              <Circle cx="111" cy="140" r="16" fill={shopPalette.navy} />
              <Path
                d="M104 139l5 7 10-14"
                stroke={palette.label}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </G>
            <G rotation="12" origin="204,126">
              <Rect
                x="168"
                y="52"
                width="72"
                height="155"
                rx="12"
                fill={shopPalette.navy}
                stroke={palette.label}
                strokeWidth="3"
              />
              <Rect
                x="174"
                y="61"
                width="60"
                height="11"
                rx="4"
                fill={palette.label}
              />
              <Rect
                x="174"
                y="100"
                width="60"
                height="70"
                fill={palette.accent}
              />
              <Circle cx="204" cy="135" r="21" fill={palette.label} />
              <Path
                d="M195 142c1-16 8-24 18-23M199 147c6-3 12-4 20-2"
                stroke={shopPalette.navy}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </G>
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', aspectRatio: 1.2, overflow: 'hidden' },
});
