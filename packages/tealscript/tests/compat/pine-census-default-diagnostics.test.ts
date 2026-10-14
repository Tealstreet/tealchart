import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#corpus1-matrix-sum-omitted-id2-namespace-float-v1.pine/attempt-1",
    "sourcePath": "v4/corpus1-matrix-sum-omitted-id2-namespace-float-v1.pine",
    "observationPath": "v4/captures/v4/outcomes-v4.json",
    "sourceSha256": "648a40f61bd4fa0dd8ad8fb77c9cf158334291e7258f658e79b790fccd836a79",
    "category": "argument-count",
    "native": {
      "text": "No value assigned to the \"id2\" parameter in matrix.sum()",
      "line": 8,
      "column": 10,
      "code": "CE10165",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#corpus1-matrix-sum-omitted-id2-receiver-int-v1.pine/attempt-1",
    "sourcePath": "v4/corpus1-matrix-sum-omitted-id2-receiver-int-v1.pine",
    "observationPath": "v4/captures/v4/outcomes-v4.json",
    "sourceSha256": "7a9b43ead84e059ec1f2e1a9b5b1b124a02c6419ce2971ab2c0d2059207340e1",
    "category": "argument-count",
    "native": {
      "text": "No value assigned to the \"id2\" parameter in matrix.sum()",
      "line": 8,
      "column": 16,
      "code": "CE10165",
      "class": "error"
    }
  },
  {
    "attempt": "v4/captures/v4/outcomes-v4.json#corpus1-matrix-sum-omitted-id2-returned-receiver-float-v1.pine/attempt-1",
    "sourcePath": "v4/corpus1-matrix-sum-omitted-id2-returned-receiver-float-v1.pine",
    "observationPath": "v4/captures/v4/outcomes-v4.json",
    "sourceSha256": "0574e171678061e4cb07a809c988a101d326d55d4f7998e3016f2964f6bf3c1f",
    "category": "argument-count",
    "native": {
      "text": "No value assigned to the \"id2\" parameter in matrix.sum()",
      "line": 8,
      "column": 29,
      "code": "CE10165",
      "class": "error"
    }
  },
  {
    "attempt": "v2/captures/v2/outcomes-v2.json#conflicts-batch-9-v1.pine/attempt-1",
    "sourcePath": "v2/outcome-only/conflicts-batch-9-v1.pine",
    "observationPath": "v2/captures/v2/outcomes-v2.json",
    "sourceSha256": "6e0661830f562bcfff957ed6e4d0128c9b4fe7c8697768d37412acc379b63c37",
    "category": "argument-count",
    "native": {
      "text": "No value assigned to the \"text_formatting\" parameter in box.set_text_formatting()",
      "line": 18,
      "column": 1,
      "code": "CE10165",
      "class": "error"
    }
  },
  {
    "attempt": "v2/captures/v2/outcomes-v2.json#conflicts-batch-10-v1.pine/attempt-1",
    "sourcePath": "v2/outcome-only/conflicts-batch-10-v1.pine",
    "observationPath": "v2/captures/v2/outcomes-v2.json",
    "sourceSha256": "7bbc808b459a4aa41c58831f5258aa087e662c03479debc4659b5fcc1b8e0887",
    "category": "argument-count",
    "native": {
      "text": "No value assigned to the \"text_formatting\" parameter in label.set_text_formatting()",
      "line": 18,
      "column": 1,
      "code": "CE10165",
      "class": "error"
    }
  },
  {
    "attempt": "v2/captures/v2/outcomes-v2.json#conflicts-batch-11-v1.pine/attempt-1",
    "sourcePath": "v2/outcome-only/conflicts-batch-11-v1.pine",
    "observationPath": "v2/captures/v2/outcomes-v2.json",
    "sourceSha256": "465fd6e56987c0b591a315fd7fd982c2ae63265e000b20b0ee5ac0cfe1a55a75",
    "category": "argument-count",
    "native": {
      "text": "No value assigned to the \"text_formatting\" parameter in table.cell_set_text_formatting()",
      "line": 19,
      "column": 1,
      "code": "CE10165",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-nested-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-nested-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-nested-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "87cc9fe0fc0ca548558d0b3210780694b8b7d033dd2c770c421403d4e0889da3",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-nested-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-nested-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "b3ad8b85f77170de0fe19465f3305d70e8a7367bb122da3b70aed9d2c7c1fcb5",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-nested-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-nested-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-nested-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "621a4e69482e49063e44d4427b4f94bebfa08996b036eb9a6813cc304a99e58f",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-nested-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-nested-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "6e1f3a198e3ad985b7de8e077b3b7fb38d16977a19a8aeff9fadc6a40fa107af",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-root-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-root-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-root-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "44ab6279954c1659fcad8dd5d35dc06f49dbb56a95a2d5f59fb81a7ca6a5f0cd",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-root-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-root-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-root-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "e5b25ef54bb51e01f6c6aa492f7dff33830c95aee8c22662c4b078bdc1dd1d49",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-root-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-root-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-root-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "e3620243112069a3eae3c511f205d991f7126ba38df0be674b853a066d87be68",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-direct-root-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-direct-root-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-direct-root-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "7382a6363510174e61ac9c3f698fdfdef0adae278f469113b0cdb705143f6a3b",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-nested-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-nested-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-nested-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "e8b20281f6a83799f0362898759eda2a2f7de3c0a6df9a34507ed593a302f1e1",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-nested-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-nested-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "ca409b00d3bd971300894710bcc0248b5892bea33ab8a391c9216adef39c78e7",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-nested-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-nested-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-nested-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "031f7ba901228250f88f542dd679aba78d86e6bc2908ce11f316397d9acfcf0f",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-nested-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-nested-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "a442d63f7990c56a63e32659744258c517efefa1dcf4c2240f91a0fb4c01fd33",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-root-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-root-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-root-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "f50866828608f3bf327ec0de9a244fa7a53dfbef6c458bafa5530b060dd0440b",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-root-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-root-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-root-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "823e0421ee0dc794a7d17926176afc9ad25bf287fd4daa0766ad16bbd06724d5",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 6,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-root-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-root-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-root-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "56b72d3ba3f87a7b517fe82f0c9bdd2f02d888163662328f2d3537adc2259863",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-root-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v5-security-root-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v5-security-root-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "4631f238a60131de733cd8c6647cd50f8c3b791ffe41e847a53a5fa7c3b4ac0b",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).",
      "line": 5,
      "column": 34,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-nested-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-nested-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-nested-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "48e1d5d78d28e1c31479553aac555760a8235144191d0e8c70b79314ae506554",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-nested-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-nested-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "d93b2505111384be51ca79379b9f64f755dc33ab670cbe8fa28b53615c73c46f",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-nested-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-nested-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-nested-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "9df2b165026f13e72cb9e2478c66ccfcf58f69696f0f9e24f5bd5a89359d1ae9",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-nested-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-nested-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "bdacdbd6459c9a3b211902f2f874f591b8250a34b5d3102ab0d0a2443ece1434",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-root-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-root-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-root-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "de4b0c3412b67ec4d3c1175167a7e163744483bc6366707ae6c161cded0bc1a3",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-root-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-root-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-root-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "5658f4c63deb976f47b3ce4920fb75635d4f747976d9c6c6178ce8c03d901371",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-root-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-root-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-root-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "3e17d9621bec36c83b63c42ff667a803229bc4cf067055c91537ce8212c16277",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-direct-root-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-direct-root-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-direct-root-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "ef53524db77c8263799996a1b84c2ed88ab616a39850d759734917e4d2da82e9",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-nested-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-nested-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-nested-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "3d7d4786329f05a7f780c5c6e257befefed0840f18c081d64ec4d9acac52ba4c",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-nested-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-nested-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-nested-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "c1008e30dde7c9dbf338a124eeaf8cf074c674d437a25af87978cbe59e911121",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-nested-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-nested-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-nested-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "c925feeb43fb850d0b6e5543ff236bdc9cd47eeb07fdc2801d5ad33d8c1a5269",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-nested-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-nested-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-nested-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "bd9d99f6b33fa84ad90041adb7260b807038b8465c4ef34f2516b7661f8bf6fd",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-root-function-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-root-function-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-root-function-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "830aec1f276f6e9f51c2afa4e23188b8cc908686555fc2317b8064f450c6fbe7",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-root-function-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-root-function-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-root-function-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "643d367262dd847279aa745e02047ff78795d63b83d0d53b2862e23c55d830f7",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 6,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-root-method-range-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-root-method-range-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-root-method-range-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "d7c80cf83216aa29066d8c21605492e1b41e17092bcb70c6c5cbfac5b1eca693",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-root-method-twice-omitted/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/v6-security-root-method-twice-omitted/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/v6-security-root-method-twice-omitted/default/attempt-v1/observation-v1.json",
    "sourceSha256": "8e75a5d1fbd5cf0323fb672fd3c2019ac75cb39cac7dc6130593baffdff34eb0",
    "category": "invalid-parameter-default",
    "native": {
      "text": "The default value assigned to a parameter must be either a literal value (e.g., \"5\") or a built-in variable (e.g., \"close\").",
      "line": 5,
      "column": 34,
      "code": "CE10134",
      "class": "error"
    }
  }
] as const;

describe('native census default and missing-argument diagnostics', () => {
  it.each(cases)('$attempt', ({ attempt, sourcePath, observationPath, sourceSha256, category, native }) => {
    const root = new URL('../../oracle-probes/', import.meta.url);
    const source = readFileSync(new URL(sourcePath, root), 'utf8');
    const observation = JSON.parse(readFileSync(new URL(observationPath, root), 'utf8'));
    expect(createHash('sha256').update(source).digest('hex')).toBe(sourceSha256);
    if (Array.isArray(observation) || observation.outcomes) {
      const script = attempt.split('#')[1].split('/attempt-')[0];
      const records = Array.isArray(observation) ? observation : observation.outcomes;
      const record = records.find((entry: { script?: string; probe?: string }) => (entry.script ?? entry.probe) === script);
      if (record.source_sha256) expect(record.source_sha256).toBe(sourceSha256);
      if (record.diagnostic) {
        expect(record.diagnostic).toEqual(expect.objectContaining({
          text: native.text, line: native.line, column: native.column, code: native.code,
        }));
      } else {
        expect(record.runtime.status).toBe('COMPILE-ERROR');
        const marker = record.runtime.error.compiler_markers.find((entry: { severity: number }) => entry.severity === 8);
        expect(marker).toEqual(expect.objectContaining({
          message: native.text, startLineNumber: native.line, startColumn: native.column, code: native.code,
        }));
      }
    } else {
      expect(observation.executedSha256).toBe(sourceSha256);
      const marker = observation.markers.find((entry: { severity: number }) => entry.severity === 8);
      expect(marker).toEqual(expect.objectContaining({
        message: native.text, startLineNumber: native.line, startColumn: native.column,
      }));
      if (native.code) expect(marker.code).toBe(native.code);
    }
    const errors = checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
    expect(errors.length, attempt).toBeGreaterThan(0);
    const target = errors.filter((entry) => entry.code === category);
    expect(target.map((entry) => ({
      text: entry.message, line: entry.line, column: entry.column,
      code: 'nativeCode' in entry ? entry.nativeCode : null,
    })), attempt).toEqual([{
      text: native.text, line: native.line, column: native.column, code: native.code,
    }]);
  });
});
