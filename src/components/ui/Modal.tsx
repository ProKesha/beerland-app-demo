import type { PropsWithChildren, ReactNode } from 'react';
import {
  Modal as NativeModal,
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { colors, layout, radius, shopPalette, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { Icon } from './Icon';
export type ModalProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
}>;
export function Modal({
  visible,
  title,
  description,
  onClose,
  children,
  footer,
}: ModalProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxSheetHeight = Math.max(0, height - Math.max(insets.top, spacing.lg));

  return (
    <NativeModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          testID="modal-sheet"
          style={[styles.sheet, { maxHeight: maxSheetHeight }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safe}>
            <View testID="modal-header" style={styles.header}>
              <AppText
                variant="title"
                accessibilityRole="header"
                style={styles.title}
              >
                {title}
              </AppText>
              <IconButton
                accessibilityLabel="Закрити вікно"
                onPress={onClose}
                icon={<Icon name="x" />}
              />
            </View>
            <ScrollView
              testID="modal-scroll"
              keyboardShouldPersistTaps="handled"
              // KeyboardAvoidingView owns the iOS keyboard inset.
              automaticallyAdjustKeyboardInsets={false}
              keyboardDismissMode="on-drag"
              contentInsetAdjustmentBehavior="never"
              contentContainerStyle={styles.content}
              style={styles.scroll}
            >
              {description && (
                <AppText variant="bodySmall" color="textSubtle">
                  {description}
                </AppText>
              )}
              {children}
            </ScrollView>
            {footer && (
              <View testID="modal-footer" style={styles.footer}>
                {footer}
              </View>
            )}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </NativeModal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: layout.maxAppWidth,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  content: { padding: spacing.xl, gap: spacing.lg },
  safe: { flexShrink: 1, minHeight: 0 },
  scroll: { flexShrink: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: shopPalette.gold,
  },
  title: { flex: 1, minWidth: 0, color: shopPalette.navy },
  footer: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
