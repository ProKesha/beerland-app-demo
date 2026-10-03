import { AppText } from '@/components/ui';
import { AddressBook } from '@/features/checkout/components/AddressBook';
import { AccountPage } from './AccountPage';
export function AddressesScreen() {
  return (
    <AccountPage title="Адреси">
      <AppText color="textSubtle">
        Збережені адреси доступні під час оформлення доставки.
      </AppText>
      <AddressBook />
    </AccountPage>
  );
}
