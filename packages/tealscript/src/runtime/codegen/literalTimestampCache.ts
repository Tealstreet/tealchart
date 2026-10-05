export type LiteralTimestampCache = Map<string, { timezone: string; value: number }>;

export function createLiteralTimestampCache(): LiteralTimestampCache {
  return new Map();
}
