import { formatMoney, formatVolume } from '@/utils/format';
test('minor currency units are formatted as Ukrainian hryvnias', () => {
  expect(
    formatMoney({ amount: 5050, currency: 'UAH' }).replace(/\s/g, ' '),
  ).toBe('50,50 ₴');
});
test('volume and snack weight retain explicit units', () => {
  expect(formatVolume({ value: 500, unit: 'ml' })).toBe('500 мл');
  expect(formatVolume({ value: 100, unit: 'g' })).toBe('100 г');
});
test('UAH output does not depend on the runtime currency symbol', () => {
  const numberFormat = Intl.NumberFormat;
  const spy = jest
    .spyOn(Intl, 'NumberFormat')
    .mockImplementation((locale, options) => {
      const formatter = new numberFormat(locale, options);
      if (options?.style === 'currency' && options.currency === 'UAH') {
        return { ...formatter, format: () => '50,50 грн' } as Intl.NumberFormat;
      }
      return formatter;
    });
  try {
    expect(formatMoney({ amount: 5050, currency: 'UAH' })).toBe('50,50\u00a0₴');
  } finally {
    spy.mockRestore();
  }
});
