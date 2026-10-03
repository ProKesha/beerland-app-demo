import { sessionOwner, useSessionStore } from '@/stores/session';
import { Fragment, type PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { Button, Container, ListSkeleton, Screen } from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { ShopPageBanner } from '@/components/common/ShopPageBanner';
export function AccountHeader({
  title,
  back = true,
}: {
  title: string;
  back?: boolean;
}) {
  return (
    <>
      {back && (
        <Button
          label="Назад"
          variant="ghost"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/profile')
          }
        />
      )}
      <ShopPageBanner title={title} label="BEERLAND / ОСОБИСТЕ" />
    </>
  );
}
export function AccountPage({
  title,
  children,
  back = true,
}: PropsWithChildren<{ title: string; back?: boolean }>) {
  const hydrated = useSessionStore((s) => s.hydrated);
  const owner = useSessionStore(sessionOwner);
  return (
    <Screen includeBottomInset keyboardAware>
      <Container style={{ paddingBottom: spacing.huge, gap: spacing.xl }}>
        <AccountHeader title={title} back={back} />
        {hydrated ? (
          <Fragment key={owner}>{children}</Fragment>
        ) : (
          <ListSkeleton />
        )}
      </Container>
    </Screen>
  );
}
