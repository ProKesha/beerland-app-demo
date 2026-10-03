import { forwardRef, useId, useState, type ReactNode } from 'react';
import {
  TextInput as NativeInput,
  View,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import {
  colors,
  componentHeights,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme/tokens';
import { AppText } from './AppText';
export interface InputProps extends TextInputProps {
  label: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
}
export const TextInput = forwardRef<NativeInput, InputProps>(function TextInput(
  {
    label,
    helperText,
    errorText,
    disabled = false,
    leadingIcon,
    trailingAction,
    style,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const inactive = disabled || props.editable === false;
  return (
    <View style={styles.root}>
      <AppText nativeID={id} variant="label">
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          !!errorText && styles.error,
          inactive && styles.disabled,
          focused && !inactive && styles.focused,
          focused && !!errorText && styles.focusedError,
        ]}
      >
        {leadingIcon}
        <NativeInput
          {...props}
          ref={ref}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={errorText ?? helperText ?? props.accessibilityHint}
          accessibilityState={{
            ...props.accessibilityState,
            disabled: inactive,
          }}
          aria-invalid={!!errorText}
          aria-describedby={
            errorText || helperText ? `${id}-feedback` : undefined
          }
          editable={!inactive}
          placeholderTextColor={colors.textSubtle}
          style={[
            styles.input,
            inactive && { color: colors.disabledText },
            style,
          ]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {trailingAction}
      </View>
      {(errorText || helperText) && (
        <AppText
          nativeID={`${id}-feedback`}
          variant="caption"
          color={errorText ? 'error' : 'textSubtle'}
          accessibilityRole={errorText ? 'alert' : undefined}
        >
          {errorText ?? helperText}
        </AppText>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: componentHeights.input,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    minHeight: componentHeights.input,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  focused: {
    borderBottomWidth: layout.focusWidth,
    borderBottomColor: colors.focus,
  },
  focusedError: { borderBottomColor: colors.error },
  error: { borderColor: colors.error, backgroundColor: colors.errorTint },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.border },
});
