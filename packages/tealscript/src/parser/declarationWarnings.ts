import type { IndicatorDeclaration, SourceLocation } from './ast';

export interface PineShortTitleWarning {
  code: 'SHORT_TITLE_TOO_LONG';
  message: string;
  severity: 'warning';
  line?: number;
  column?: number;
}

export function indicatorShortTitleWarning(declaration: IndicatorDeclaration, version: number | undefined): {
  diagnostic: PineShortTitleWarning; location?: SourceLocation;
} | undefined {
  const shorttitle = declaration.shorttitle;
  if (declaration.declarationKind !== 'indicator' || (version !== 5 && version !== 6)
    || shorttitle?.type !== 'StringLiteral' || shorttitle.value.length <= 10) return undefined;
  const location = shorttitle.loc && {
    ...shorttitle.loc,
    start: { ...shorttitle.loc.start, column: shorttitle.loc.start.column + 1 },
  };
  return {
    location,
    diagnostic: {
      code: 'SHORT_TITLE_TOO_LONG', severity: 'warning',
      message: `The shorttitle is too long (${shorttitle.value.length} characters). It should be 10 characters or less.`,
      line: location?.start.line, column: location?.start.column,
    },
  };
}
