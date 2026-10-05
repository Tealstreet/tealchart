import { describe, expect, it } from "vitest";

import { parse } from "../../src/parser";
import { checkProgram } from "../../src/semantic/checker";

function check(body: string) {
  return checkProgram(
    parse(`//@version=6
indicator("Collection contracts24")
simple int simpleSize = 2
simple color simpleColor = #123456
${body}`),
  );
}

const errors = (body: string) =>
  check(body).diagnostics.filter((item) => item.severity === "error");

describe("color array parameter and return contracts", () => {
  it("returns a series color-array reference", () => {
    const result = check("a = array.new_color()");
    expect(result.diagnostics).toEqual([]);
    expect(
      result.symbols.find((item) => item.name === "a")?.type,
    ).toMatchObject({
      kind: "array",
      qualifier: "series",
      elementType: { kind: "color" },
    });
  });

  for (const [qualifier, size, color] of [
    ["const", "2", "#123456"],
    ["input", "input.int(2)", "input.color(#123456)"],
    ["simple", "simpleSize", "simpleColor"],
    ["series", "bar_index", "bar_index == 0 ? #123456 : #abcdef"],
  ]) {
    it(`accepts ${qualifier} int size and color seed`, () => {
      expect(
        errors(`a = array.new_color(size=${size}, initial_value=${color})`),
      ).toEqual([]);
    });
  }

  for (const value of ["2.5", '"2"', "true"]) {
    it(`refuses non-int size ${value}`, () => {
      expect(errors(`a = array.new_color(size=${value})`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "type-mismatch" }),
        ]),
      );
    });
  }

  for (const value of ["2", "2.5", '"red"', "true"]) {
    it(`refuses non-color seed ${value}`, () => {
      expect(errors(`a = array.new_color(2, initial_value=${value})`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "type-mismatch" }),
        ]),
      );
    });
  }
});

describe("column insertion void return", () => {
  for (const call of ["matrix.add_col(m, 0, a)", "m.add_col(0, a)"]) {
    it(`${call} cannot initialize a value`, () => {
      expect(
        errors(`m = matrix.new<int>(2, 1, 7)
a = array.from(11, 13)
value = ${call}`),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "type-mismatch" }),
        ]),
      );
    });
  }
});

describe("matrix sum numeric return overloads", () => {
  for (const receiver of [false, true]) {
    for (const kind of ["int", "float"]) {
      for (const scalar of [false, true]) {
        const right = scalar
          ? kind === "int"
            ? "3"
            : "3.5"
          : `matrix.new<${kind}>(1, 1, 3)`;
        const call = receiver ? "m.sum(n)" : "matrix.sum(m, n)";
        it(`${call} returns matrix<${kind}> for ${scalar ? "scalar" : "matrix"} addition`, () => {
          const result = check(`m = matrix.new<${kind}>(1, 1, 7)
n = ${right}
value = ${call}`);
          expect(result.diagnostics).toEqual([]);
          expect(
            result.symbols.find((item) => item.name === "value")?.type,
          ).toMatchObject({
            kind: "matrix",
            qualifier: "series",
            elementType: { kind },
          });
        });
      }
    }
  }
});
