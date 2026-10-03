import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()+-]/g, ''))
  .pipe(
    z
      .string()
      .regex(
        /^(?:0\d{9}|380\d{9}|8?0\d{9})$/,
        'Вкажіть український номер у форматі +380 XX XXX XX XX',
      ),
  )
  .transform((digits) =>
    digits.startsWith('380')
      ? `+${digits}`
      : digits.startsWith('80')
        ? `+3${digits}`
        : `+38${digits}`,
  );

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Введіть шестизначний код');

export const profileSchema = z.object({
  name: z.string().trim().max(80, 'Не більше 80 символів'),
  email: z.union([z.literal(''), z.email('Перевірте електронну пошту')]),
});

export type AuthErrorCode =
  | 'unavailable'
  | 'invalidPhone'
  | 'invalidCode'
  | 'expired'
  | 'attempts'
  | 'resendWait'
  | 'resendLimit'
  | 'invalidChallenge'
  | 'service';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
  }
}

export const authMessages: Record<AuthErrorCode, string> = {
  unavailable: 'Вхід за номером зараз недоступний.',
  invalidPhone: 'Перевірте номер телефону.',
  invalidCode: 'Неправильний код. Спробуйте ще раз.',
  expired: 'Термін дії коду минув. Запросіть новий код.',
  attempts: 'Забагато спроб. Запросіть новий код пізніше.',
  resendWait: 'Повторне надсилання ще недоступне.',
  resendLimit: 'Ліміт повторних запитів вичерпано. Спробуйте пізніше.',
  invalidChallenge: 'Запит коду більше не активний. Почніть ще раз.',
  service: 'Не вдалося виконати дію. Спробуйте ще раз.',
};

export function authMessage(error: unknown): string {
  return error instanceof AuthError
    ? authMessages[error.code]
    : authMessages.service;
}

export function formatPhone(phone: string): string {
  return `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`.trim();
}

export function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
