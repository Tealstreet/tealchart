const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function padNativeMinute(value: number): string {
  'worklet';
  return value < 10 ? `0${value}` : `${value}`;
}

export function formatNativeTimeAxisLabelWorklet(time: number, step: number, showMonthLabel = false): string {
  'worklet';
  const date = new Date(time);
  const month = MONTH_NAMES[date.getMonth()] ?? '';
  const yearShort = date.getFullYear().toString().slice(-2);

  if (step >= 31_536_000_000) return date.getFullYear().toString();
  if (step >= 2_592_000_000) return `${month} '${yearShort}`;
  if (step >= 86_400_000) return showMonthLabel ? `${month} '${yearShort}` : date.getDate().toString();
  if (step >= 3_600_000) return showMonthLabel ? `${date.getDate()} ${month}` : `${date.getHours()}:00`;
  return `${date.getHours()}:${padNativeMinute(date.getMinutes())}`;
}
