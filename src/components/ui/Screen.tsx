import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShopChrome } from '@/components/common/ShopChrome';
import { colors, layout } from '@/theme/tokens';
interface ScreenProps extends ViewProps {
  scroll?: boolean;
  keyboardAware?: boolean;
  includeBottomInset?: boolean;
  chrome?: 'full' | 'minimal' | 'none';
}
export function Screen({
  children,
  scroll = true,
  keyboardAware = false,
  includeBottomInset = false,
  chrome = 'full',
  style,
  ...props
}: ScreenProps) {
  const shopRoute = chrome === 'none';
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );
  return (
    <SafeAreaView
      edges={
        includeBottomInset
          ? ['top', 'left', 'right', 'bottom']
          : ['top', 'left', 'right']
      }
      style={styles.root}
    >
      {!shopRoute && <ShopChrome minimal={chrome === 'minimal'} />}
      {keyboardAware ? (
        <KeyboardAvoidingView
          {...props}
          style={[styles.flex, !shopRoute && styles.detail, style]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View
          {...props}
          style={[styles.flex, !shopRoute && styles.detail, style]}
        >
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  flex: { flex: 1, minHeight: 0 },
  detail: {
    width: '100%',
    maxWidth: layout.maxDetailWidth,
    alignSelf: 'center',
  },
  content: { flexGrow: 1 },
});
