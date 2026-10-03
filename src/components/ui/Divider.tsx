import { View, StyleSheet } from 'react-native';
import { colors, layout } from '@/theme/tokens';
export function Divider() {
  return <View style={styles.root} />;
}
const styles = StyleSheet.create({
  root: {
    height: layout.borderWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
});
