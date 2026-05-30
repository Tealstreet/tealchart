import type { ExecutionContext } from '../context';
import type { Scope } from '../scope';

/**
 * Built-in function signature used by TealScript runtime namespaces.
 */
export type BuiltinFunction = (
  args: unknown[],
  namedArgs: Map<string, unknown>,
  ctx: ExecutionContext,
  scope: Scope,
  callId: string,
) => unknown;

export type BuiltinRegistry = Map<string, BuiltinFunction>;
