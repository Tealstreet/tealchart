export interface RuntimeSessionPeriod {
  readonly start: number;
  readonly end: number;
}

export interface RuntimeSessionDescriptor {
  readonly unrestricted: boolean;
  readonly days: string;
  readonly periods: readonly (RuntimeSessionPeriod | null)[];
}

const sessionDescriptors = new Map<string, RuntimeSessionDescriptor>();
const SESSION_DESCRIPTOR_LIMIT = 256;

export function parseRuntimeSessionDescriptor(session: string): RuntimeSessionDescriptor {
  const cached = sessionDescriptors.get(session);
  if (cached) return cached;

  const descriptor = parseUncachedSessionDescriptor(session);
  if (sessionDescriptors.size === SESSION_DESCRIPTOR_LIMIT) {
    sessionDescriptors.delete(sessionDescriptors.keys().next().value!);
  }
  sessionDescriptors.set(session, descriptor);
  return descriptor;
}

function parseUncachedSessionDescriptor(session: string): RuntimeSessionDescriptor {
  const normalized = session.trim().toLowerCase();
  if (
    normalized === '' ||
    normalized === 'regular' ||
    normalized === 'extended' ||
    normalized === 'session.regular' ||
    normalized === 'session.extended' ||
    normalized === '24x7'
  ) {
    return Object.freeze({ unrestricted: true, days: '', periods: Object.freeze([]) });
  }

  const [periods, days = '1234567'] = session.split(':', 2);
  const parsed =
    !periods || !/^[1-7]+$/.test(days) ? [] : periods.split(',').map((period) => parseSessionPeriod(period.trim()));
  return Object.freeze({ unrestricted: false, days, periods: Object.freeze(parsed) });
}

function parseSessionPeriod(period: string): RuntimeSessionPeriod | null {
  const match = /^(\d{4})-(\d{4})$/.exec(period);
  if (!match) return null;
  const start = parseRuntimeSessionMinute(match[1]);
  const end = parseRuntimeSessionMinute(match[2]);
  return start === null || end === null ? null : Object.freeze({ start, end });
}

export function parseRuntimeSessionMinute(value: string): number | null {
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(2, 4));
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}
