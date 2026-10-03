import { router } from 'expo-router';
import { Button, Container, Screen, Text } from '@/components/ui';
export default function NotFoundScreen() {
  return (
    <Screen includeBottomInset>
      <Container>
        <Text variant="h1">Сторінку не знайдено</Text>
        <Button title="На головну" onPress={() => router.replace('/')} />
      </Container>
    </Screen>
  );
}
