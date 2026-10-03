import { Button, LoadingIndicator, Text } from '@/components/ui';
interface QuerySummaryProps {
  pending: boolean;
  error: boolean;
  count?: number;
  label: string;
  onRetry: () => void;
}
export function QuerySummary({
  pending,
  error,
  count,
  label,
  onRetry,
}: QuerySummaryProps) {
  if (pending) return <LoadingIndicator />;
  if (error)
    return (
      <>
        <Text accessibilityRole="alert">Не вдалося завантажити дані.</Text>
        <Button title="Спробувати ще раз" onPress={onRetry} />
      </>
    );
  if (!count) return <Text>Поки що нічого немає.</Text>;
  return (
    <Text>
      {label}: {count}
    </Text>
  );
}
