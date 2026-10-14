import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
const cases = [
  {
    "attempt": "v58/captures/v58/consumers/v5-security-float-first-function-v1/default/attempt-v1",
    "source": "//@version=5\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => score(xs)\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<float>(1,0)),relay(array.new<int>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v5-security-float-first-function-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The 'xs' argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-float-first-method-v1/default/attempt-v1",
    "source": "//@version=5\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => xs.score()\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<float>(1,0)),relay(array.new<int>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v5-security-float-first-method-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The 'xs' argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-int-first-function-v1/default/attempt-v1",
    "source": "//@version=5\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => score(xs)\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<int>(1,0)),relay(array.new<float>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v5-security-int-first-function-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The 'xs' argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v5-security-int-first-method-v1/default/attempt-v1",
    "source": "//@version=5\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => xs.score()\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<int>(1,0)),relay(array.new<float>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v5-security-int-first-method-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The 'xs' argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": null,
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-float-first-function-v1/default/attempt-v1",
    "source": "//@version=6\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => score(xs)\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<float>(1,0)),relay(array.new<int>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v6-security-float-first-function-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The \"xs\" argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": "CE10236",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-float-first-method-v1/default/attempt-v1",
    "source": "//@version=6\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => xs.score()\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<float>(1,0)),relay(array.new<int>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v6-security-float-first-method-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The \"xs\" argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": "CE10236",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-int-first-function-v1/default/attempt-v1",
    "source": "//@version=6\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => score(xs)\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<int>(1,0)),relay(array.new<float>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v6-security-int-first-function-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The \"xs\" argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": "CE10236",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/v6-security-int-first-method-v1/default/attempt-v1",
    "source": "//@version=6\nindicator(\"Mixed collection call scopes\")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => 20\nrelay(xs) => xs.score()\n[x,y] = request.security(\"REMOTE:ALT\",\"1\",[relay(array.new<int>(1,0)),relay(array.new<float>(1,0))])\nplot(x)\nplot(y)",
    "observation": "v58/captures/v58/consumers/v6-security-int-first-method-v1/default/attempt-v1/observation-v1.json",
    "native": {
      "text": "The \"xs\" argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 13,
      "code": "CE10236",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/prerequisites/root2-library-0c3e7d5d2afc-v58-v1/attempt-v1",
    "source": "//@version=6\nlibrary(\"R2Ns0c3e7d5d2afc\")\nexport method pick(int self)=>200\nexport method pick(float self)=>100\n",
    "observation": "v58/captures/v58/prerequisites/root2-library-0c3e7d5d2afc-v58-v1/attempt-v1/observation-v1.json",
    "native": {
      "text": "The \"self\" argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 19,
      "code": "CE10236",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/prerequisites/root2-library-547eb85fa13d-v58-v1/attempt-v1",
    "source": "//@version=6\nlibrary(\"R2Ns547eb85fa13d\")\nexport method pick(float self)=>100\nexport method pick(int self)=>200\n",
    "observation": "v58/captures/v58/prerequisites/root2-library-547eb85fa13d-v58-v1/attempt-v1/observation-v1.json",
    "native": {
      "text": "The \"self\" argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 19,
      "code": "CE10236",
      "class": "error"
    }
  },
  {
    "attempt": "v58/captures/v58/prerequisites/root2-library-b4dddfb489fd-v58-v1/attempt-v1",
    "source": "//@version=6\nlibrary(\"R2Nsb4dddfb489fd\")\nexport method pick(int self)=>200\n",
    "observation": "v58/captures/v58/prerequisites/root2-library-b4dddfb489fd-v58-v1/attempt-v1/observation-v1.json",
    "native": {
      "text": "The \"self\" argument is not used. The first method argument should be used.",
      "line": 3,
      "column": 19,
      "code": "CE10236",
      "class": "error"
    }
  }
];
describe('native unused typed and exported receiver diagnostics', () => {
  for (const entry of cases) it(entry.attempt, () => {
    const observation = JSON.parse(readFileSync(new URL(`../../oracle-probes/${entry.observation}`, import.meta.url), 'utf8'));
    expect(observation.executedSource).toBe(entry.source);
    const errors = checkProgram(parse(entry.source)).diagnostics.filter(d => d.severity === 'error');
    expect(errors[0]).toMatchObject({ message: entry.native.text, line: entry.native.line, column: entry.native.column, severity: 'error' });
    if (entry.native.code) expect(errors[0]!.code).toBe(entry.native.code);
  });
});

it('preserves the unwitnessed v4 receiver diagnostic', () => {
  const source = `//@version=4
indicator("boundary")
method score(array<int> xs)=>10
plot(close)`;
  expect(checkProgram(parse(source)).diagnostics).toContainEqual(expect.objectContaining({
    code: 'unused-method-receiver', severity: 'error', line: 3, column: 25,
    message: "The 'xs' argument is not used. The first method argument should be used.",
  }));
});
