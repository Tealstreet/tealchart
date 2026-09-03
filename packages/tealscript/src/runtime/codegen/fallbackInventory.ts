export type CompiledFallbackSourceFile =
  | 'analyzer.ts'
  | 'compile.ts'
  | 'execute.ts'
  | 'sourceClassifier.ts';

export interface CompiledFallbackInventoryEntry {
  id: string;
  sourceFile: CompiledFallbackSourceFile;
  sourceEvidence: string;
  construct: string;
  validPineV6: boolean;
  plausiblePublicIndicator: boolean;
  rank: number | null;
  status: 'planned-provider-gap' | 'diagnostic-gap' | 'implementation-gap' | 'internal-guard';
  action: string;
}

export const COMPILED_FALLBACK_INVENTORY = [
  {
    id: 'missing-host-library-registry-entry',
    sourceFile: 'analyzer.ts',
    sourceEvidence: "addUnsupported('Import declarations not yet supported by transpiler')",
    construct: 'An import path is syntactically valid but no host-provided library AST is registered for that path.',
    validPineV6: true,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'diagnostic-gap',
    action: 'Cannot be compiled without host-provided library source; checker and fallback inventory tests emit a precise unresolved-import diagnostic naming the import path and alias before compile.',
  },
  {
    id: 'unregistered-imported-function',
    sourceFile: 'analyzer.ts',
    sourceEvidence: 'Imported library function ${fullName} not yet supported by transpiler',
    construct: 'A script calls an imported alias member that was not registered as an exported function, method, constructor, constant, or enum.',
    validPineV6: false,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'diagnostic-gap',
    action: 'Not a runnable Pine v6 public-indicator fallback: checker and fallback inventory tests report missing or non-exported imported functions as precise semantic diagnostics before compile.',
  },
  {
    id: 'unsupported-request-function',
    sourceFile: 'analyzer.ts',
    sourceEvidence: '${fullName} not yet supported by transpiler',
    construct: 'A request namespace call is intentionally present in the unsupported request set.',
    validPineV6: true,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Implemented for the current v6 request surface: request.footprint now compiles and resolves through the request datafeed, and fallbackInventory.test.ts keeps UNSUPPORTED_REQUEST_FUNCS empty.',
  },
  {
    id: 'unsupported-ta-function',
    sourceFile: 'analyzer.ts',
    sourceEvidence: '${taFullName} not yet supported by transpiler',
    construct: 'A ta.* call reaches the defensive unsupported branch after reference coverage has already proven every current Pine v6 ta.* name has compiled support.',
    validPineV6: true,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Not a current public-indicator fallback: fallbackInventory.test.ts diffs the v6 ta.* reference list against TA_CLASS_MAP, TA_VAR_CLASS_MAP, and DIRECT_TA_FUNCS and keeps the missing set empty.',
  },
  {
    id: 'dynamic-ta-constructor-parameter-missing',
    sourceFile: 'analyzer.ts',
    sourceEvidence: '${taFullName} with dynamic constructor parameters not yet supported by transpiler',
    construct: 'A stateful ta.* call has required constructor parameters that cannot be extracted as literals or runtime expressions.',
    validPineV6: true,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Not a current public-indicator fallback: fallbackInventory.test.ts compiles representative dynamic constructor expressions across the v6 stateful TA surface; the remaining guard catches invalid or incomplete calls before semantic diagnostics run.',
  },
  {
    id: 'unregistered-imported-member',
    sourceFile: 'analyzer.ts',
    sourceEvidence: 'Imported library member ${fullName} not yet supported by transpiler',
    construct: 'A script reads an imported alias member that was not registered as an exported constant, function, UDT, or enum prefix.',
    validPineV6: false,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'diagnostic-gap',
    action: 'Not a runnable Pine v6 public-indicator fallback: exported constants, functions, UDTs, and enum prefixes compile; checker and fallback inventory tests report missing or non-exported imported member reads precisely.',
  },
  {
    id: 'root-library-declaration',
    sourceFile: 'analyzer.ts',
    sourceEvidence: "const msg = 'Library declarations not yet supported by transpiler'",
    construct: 'The root script is a library() declaration rather than an indicator() or strategy() declaration.',
    validPineV6: true,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Do not rank for pasted indicator fallback rate; libraries are compiled as host-provided imports, not executed as chart scripts.',
  },
  {
    id: 'security-subprogram-compile-failure',
    sourceFile: 'compile.ts',
    sourceEvidence: '${site.kind} expression subprogram ${site.id} could not be compiled',
    construct: 'A request.security/request.seed expression subprogram cannot compile even though the parent script compiles.',
    validPineV6: true,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Computed request.security/security_lower_tf/seed expressions now require a compiled subprogram; compile.test.ts covers those common public-wrapper shapes, and any remaining child compiler miss fails explicitly instead of degrading to source extraction.',
  },
  {
    id: 'generated-code-construction-error',
    sourceFile: 'compile.ts',
    sourceEvidence: 'Compilation error: ${error instanceof Error ? error.message : String(error)}',
    construct: 'The generated JavaScript class fails to construct.',
    validPineV6: false,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Treat as compiler bug evidence, not a Pine construct category.',
  },
  {
    id: 'execute-compiled-without-required-request-datafeed',
    sourceFile: 'execute.ts',
    sourceEvidence: "options?.onFallback?.('missing-request-datafeed')",
    construct: 'Compiled execution of a script with compiled request subprograms is attempted without a request datafeed.',
    validPineV6: false,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Host integration must provide a request datafeed; this is not a Pine language construct.',
  },
  {
    id: 'compat-compiled-output-error',
    sourceFile: 'sourceClassifier.ts',
    sourceEvidence: "createErrorStage(error, 'output', 'compiled_fallback')",
    construct: 'Compiled execution throws while the compatibility classifier is comparing interpreter and compiled output.',
    validPineV6: false,
    plausiblePublicIndicator: false,
    rank: null,
    status: 'internal-guard',
    action: 'Treat as compiler/runtime bug evidence surfaced by the classifier.',
  },
] as const satisfies readonly CompiledFallbackInventoryEntry[];

export const RANKED_PLAUSIBLE_COMPILED_FALLBACKS = COMPILED_FALLBACK_INVENTORY
  .filter((entry) => entry.validPineV6 && entry.plausiblePublicIndicator)
  .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER));
