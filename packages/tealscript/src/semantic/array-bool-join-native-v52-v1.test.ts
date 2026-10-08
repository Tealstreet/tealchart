import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const cases = [
  {
    "id": "array-bool-join-method",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-method\", calc_bars_count=32)\nvalues = array.from(true, false, true)\nstring joined = values.join(\"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": true
  },
  {
    "id": "array-bool-join-method-string",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-method\", calc_bars_count=32)\nvalues = array.from(\"a\", \"b\", \"a\")\nstring joined = values.join(\"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  },
  {
    "id": "array-bool-join-method-int",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-method\", calc_bars_count=32)\nvalues = array.from(1, 2, 3)\nstring joined = values.join(\"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  },
  {
    "id": "array-bool-join-method-float",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-method\", calc_bars_count=32)\nvalues = array.from(1.5, 2.5, 3.5)\nstring joined = values.join(\"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  },
  {
    "id": "array-bool-join-method-v5",
    "source": "//@version=5\nindicator(\"V52 array-bool-join-method\", calc_bars_count=32)\nvalues = array.from(true, false, true)\nstring joined = values.join(\"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  },
  {
    "id": "array-bool-join-namespace",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-namespace\", calc_bars_count=32)\nvalues = array.from(true, false, true)\nstring joined = array.join(values, \"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": true
  },
  {
    "id": "array-bool-join-namespace-string",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-namespace\", calc_bars_count=32)\nvalues = array.from(\"a\", \"b\", \"a\")\nstring joined = array.join(values, \"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  },
  {
    "id": "array-bool-join-namespace-int",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-namespace\", calc_bars_count=32)\nvalues = array.from(1, 2, 3)\nstring joined = array.join(values, \"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  },
  {
    "id": "array-bool-join-namespace-float",
    "source": "//@version=6\nindicator(\"V52 array-bool-join-namespace\", calc_bars_count=32)\nvalues = array.from(1.5, 2.5, 3.5)\nstring joined = array.join(values, \"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  },
  {
    "id": "array-bool-join-namespace-v5",
    "source": "//@version=5\nindicator(\"V52 array-bool-join-namespace\", calc_bars_count=32)\nvalues = array.from(true, false, true)\nstring joined = array.join(values, \"|\")\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(str.length(joined), \"TEXT_LENGTH\", display=display.data_window)\nplot(joined == \"true|false|true\" ? 1 : 0, \"MATCH_LITERAL\", display=display.data_window)\nif barstate.islastconfirmedhistory\n    log.info(\"JOIN_TEXT={0}\", joined)\n",
    "refused": false
  }
];

describe('v52 bool array join refusal', () => {
  for (const example of cases) {
    it(example.id, () => {
      const errors = checkProgram(parse(example.source)).diagnostics.filter(d => d.severity === 'error');
      expect(errors.length > 0, JSON.stringify(errors)).toBe(example.refused);
    });
  }
});
