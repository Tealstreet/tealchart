import { pineVersionRules } from './pineVersionRules';

const COLOR_CONSTANTS: Readonly<Record<string, string>> = {
  aqua: '#00BCD4',
  black: '#363A45',
  blue: '#2962FF',
  fuchsia: '#E040FB',
  gray: '#787B86',
  grey: '#787B86',
  green: '#4CAF50',
  lime: '#00E676',
  maroon: '#880E4F',
  navy: '#311B92',
  olive: '#808000',
  orange: '#FF9800',
  purple: '#9C27B0',
  red: '#F23645',
  silver: '#B2B5BE',
  teal: '#089981',
  white: '#FFFFFF',
  yellow: '#FDD835',
};

const PRE_V6_COLORS: Readonly<Record<string, string>> = {
  blue: '#2196F3',
  red: '#FF5252',
  teal: '#00897B',
  yellow: '#FFEB3B',
};

export function pineColorConstant(name: string, version = 6): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(COLOR_CONSTANTS, name)) return undefined;
  const color = COLOR_CONSTANTS[name];
  const rules = pineVersionRules(version);
  return rules.usesV6DefaultColors || (rules.version === 5 && name === 'blue') ? color : (PRE_V6_COLORS[name] ?? color);
}
