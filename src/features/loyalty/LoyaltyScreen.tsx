import { useState } from 'react';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  Modal,
  Skeleton,
} from '@/components/ui';
import { AccountPage } from '@/features/profile/AccountPage';
import { useLoyalty } from '@/features/profile/queries';
import { ClubCard } from './ClubCard';
import { LoyaltyCode } from './LoyaltyCode';
export function LoyaltyScreen() {
  const query = useLoyalty();
  const [expanded, setExpanded] = useState(false);
  const account = query.data;
  return (
    <AccountPage title="Beerland Club">
      {query.isPending ? (
        <Skeleton height={240} />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : account ? (
        <>
          <ClubCard account={account} />
          <Card>
            <AppText variant="h2">Ваша клубна картка</AppText>
            <LoyaltyCode value={account.qrPayload} />
            <AppText style={{ textAlign: 'center' }}>
              {account.membershipNumber}
            </AppText>
            <Button label="Збільшити код" onPress={() => setExpanded(true)} />
          </Card>
          <AppText variant="bodySmall" color="textSubtle">
            Це демонстраційна картка. Бонуси та рівні ілюструють роботу клубу;
            вони не є чинними умовами Beerland. Оплата бонусами поки недоступна.
          </AppText>
          {!!account.activity.length && (
            <AppText variant="h2">Історія бонусів</AppText>
          )}
          {account.activity.map((item) => (
            <Card key={item.id}>
              <AppText variant="price">
                {item.points > 0 ? '+' : '−'}
                {Math.abs(item.points)} бонусів
              </AppText>
              <AppText>{item.description}</AppText>
              <AppText variant="caption">
                {new Date(item.createdAt).toLocaleDateString('uk-UA', {
                  timeZone: 'Europe/Kyiv',
                })}
              </AppText>
            </Card>
          ))}
          <Modal
            visible={expanded}
            title="Покажіть код на касі"
            onClose={() => setExpanded(false)}
          >
            <LoyaltyCode value={account.qrPayload} size={340} />
            <AppText>{account.membershipNumber}</AppText>
            <AppText variant="caption">
              Демонстраційний код — не для оплати.
            </AppText>
          </Modal>
        </>
      ) : (
        <AppText>Клубна картка поки недоступна.</AppText>
      )}
    </AccountPage>
  );
}
