import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { colors, motion, radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

type ToastApi = {
  message: string | null;
  show: (message: string) => void;
  dismiss: () => void;
};
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  const dismiss = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setMessage(null);
  }, []);

  const show = useCallback(
    (text: string) => {
      const current = ++generation.current;
      if (timer.current) clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(dismiss, motion.toastDuration);

      // The visible notice is brief; native screen readers also receive a
      // spoken announcement so the message is not lost while reading the page.
      if (Platform.OS !== 'web') {
        void AccessibilityInfo.isScreenReaderEnabled()
          .then((enabled) => {
            if (enabled && generation.current === current) {
              AccessibilityInfo.announceForAccessibility(text);
            }
          })
          .catch(() => undefined);
      }
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ message, show, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function ToastRegion() {
  const toast = useContext(ToastContext);
  if (!toast?.message) return null;

  const success = toast.message.startsWith('Додано');
  return (
    <View style={styles.region}>
      <View
        testID="app-toast"
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={styles.toast}
      >
        {success && (
          <View style={styles.successIcon}>
            <Icon name="check" size="sm" color={colors.success} />
          </View>
        )}
        <AppText color="background" variant="bodySmall" style={styles.message}>
          {toast.message}
        </AppText>
      </View>
    </View>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('ToastProvider is required');
  return value;
}

const styles = StyleSheet.create({
  region: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  toast: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  successIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successTint,
  },
  message: { flexShrink: 1 },
});
