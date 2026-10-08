import { parse } from '../../src/parser';

export function createSemanticFixture(header: string, setup: string) {
  const prefix = parse(header + setup + '\n');
  // Blank setup retains source spans; cloned prefix nodes isolate semantic mutations.
  const padding = setup.replace(/[^\n]/g, ' ');
  return (source: string) => {
    const program = parse(header + padding + '\n' + source);
    program.body = [...structuredClone(prefix.body), ...program.body.slice(1)];
    return program;
  };
}
