import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  Skeleton,
  TextInput,
} from '@/components/ui';
import { customerSchema } from '@/features/checkout/model';
import { useRepositories } from '@/repositories/RepositoryProvider';
import type { User } from '@/types/domain';
import { AccountPage } from './AccountPage';
import { accountKeys, useUser } from './queries';
import { sessionOwner, useSessionStore } from '@/stores/session';
type Fields = { name: string; phone: string; email: string };
function PersonalForm({ user }: { user: User | null }) {
  const r = useRepositories();
  const authenticated = useSessionStore(
    (state) => state.status === 'authenticated',
  );
  const owner = useSessionStore(sessionOwner);
  const client = useQueryClient();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Fields>({
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (values: Fields) => r.users.updateCurrent(values),
    onSuccess: (data) => client.setQueryData(accountKeys.userFor(owner), data),
  });
  const submit = handleSubmit((values) => {
    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((i) =>
        setError(i.path[0] as keyof Fields, { message: i.message }),
      );
      return;
    }
    save.mutate({ ...parsed.data, email: parsed.data.email ?? '' });
  });
  return (
    <Card>
      {(['name', 'phone', 'email'] as const).map((name) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field }) => (
            <TextInput
              label={
                { name: 'Ім’я', phone: 'Телефон', email: 'Електронна пошта' }[
                  name
                ]
              }
              testID={`personal-${name}`}
              value={field.value}
              onChangeText={(value) => {
                save.reset();
                field.onChange(value);
              }}
              onBlur={field.onBlur}
              errorText={errors[name]?.message}
              maxLength={name === 'name' ? 80 : name === 'phone' ? 30 : 160}
              keyboardType={
                name === 'phone'
                  ? 'phone-pad'
                  : name === 'email'
                    ? 'email-address'
                    : 'default'
              }
              editable={!authenticated || name !== 'phone'}
              autoCapitalize={name === 'email' ? 'none' : 'sentences'}
            />
          )}
        />
      ))}
      {save.isError && (
        <AppText accessibilityRole="alert" color="error">
          Не вдалося зберегти. Спробуйте ще раз.
        </AppText>
      )}
      {save.isSuccess && (
        <AppText accessibilityRole="alert" color="success">
          Дані збережено
        </AppText>
      )}
      <Button
        label="Зберегти дані"
        loading={save.isPending}
        onPress={() => {
          void submit();
        }}
      />
    </Card>
  );
}
export function PersonalScreen() {
  const query = useUser();
  const owner = useSessionStore(sessionOwner);
  const authenticated = useSessionStore(
    (state) => state.status === 'authenticated',
  );
  return (
    <AccountPage title="Особисті дані">
      <AppText color="textSubtle">
        {authenticated
          ? 'Це локальний демоакаунт. Підтверджений демономер не можна змінити тут.'
          : 'Дані зберігаються локально на цьому пристрої. Справжню авторизацію ще не підключено.'}
      </AppText>
      {query.isPending ? (
        <Skeleton height={240} />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <PersonalForm key={owner} user={query.data ?? null} />
      )}
    </AccountPage>
  );
}
