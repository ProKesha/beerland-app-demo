import { View } from 'react-native';
import { TextInput, type InputProps } from './TextInput';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
export type SearchInputProps = Omit<
  InputProps,
  'label' | 'value' | 'onChangeText' | 'leadingIcon' | 'trailingAction'
> & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: (text: string) => void;
};
export function SearchInput({
  label = 'Пошук',
  value,
  onChangeText,
  onSearch,
  disabled,
  onSubmitEditing,
  ...props
}: SearchInputProps) {
  return (
    <TextInput
      {...props}
      label={label}
      value={value}
      onChangeText={onChangeText}
      disabled={disabled}
      returnKeyType="search"
      leadingIcon={<Icon name="search" size="md" />}
      onSubmitEditing={(event) => {
        onSubmitEditing?.(event);
        if (!disabled) onSearch?.(value);
      }}
      trailingAction={
        <View style={{ flexDirection: 'row' }}>
          {!!value && (
            <IconButton
              accessibilityLabel="Очистити пошук"
              disabled={disabled}
              icon={<Icon name="x" size="md" />}
              onPress={() => onChangeText('')}
            />
          )}
          {onSearch && (
            <IconButton
              accessibilityLabel="Виконати пошук"
              disabled={disabled}
              icon={<Icon name="arrow-right" size="md" />}
              onPress={() => onSearch(value)}
            />
          )}
        </View>
      }
    />
  );
}
