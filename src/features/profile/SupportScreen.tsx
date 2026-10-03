import { useState } from 'react';
import { Linking } from 'react-native';
import { AppText, Button, Card, Icon, useToast } from '@/components/ui';
import { customerSupport, helpQuestions } from '@/config/customerSupport';
import { AccountPage } from './AccountPage';
export function FAQ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Button
        label={question}
        rightIcon={<Icon name={open ? 'minus' : 'plus'} size="sm" />}
        variant="ghost"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
      />
      {open && <AppText>{answer}</AppText>}
    </Card>
  );
}
export function SupportScreen() {
  const toast = useToast();
  return (
    <AccountPage title="Допомога">
      <AppText variant="h2">Часті питання</AppText>
      {helpQuestions.map((item) => (
        <FAQ key={item.question} {...item} />
      ))}
      <Card>
        <AppText variant="h2">Зв’язатися з нами</AppText>
        <AppText color="textSubtle">
          Контакти підтримки з’являться після підтвердження Beerland.
        </AppText>
        <Button
          label="Написати підтримці"
          disabled={!customerSupport.email}
          onPress={() => {
            if (customerSupport.email)
              void Linking.openURL(`mailto:${customerSupport.email}`).catch(
                () => toast.show('Не вдалося відкрити пошту'),
              );
          }}
        />
      </Card>
    </AccountPage>
  );
}
