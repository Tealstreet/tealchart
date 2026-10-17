# Deterministic binary64 power v1

`nativePow` rounds the real power of its exact binary64 inputs to nearest,
ties to even. Positional, named and legacy Pine power calls use this shared
runtime evaluator; the emitter must not bypass it with `Math.pow`.
The v95 native fixtures require exact scalar equality, including `2 ** -2.5`.
V8 in Node 22 returns the lower adjacent float for that input; Node 24 does not.

The implementation first certifies a floating-point approximation, using exact
BigInt arithmetic only when certification fails. A host power is a candidate,
never an unconditional answer. Special-value rules remain unchanged. Exponents
1, -1, 2 and 0.5 use binary64 identity, division, multiplication and square root.
The host intrinsic is bound once; no user argument or answer is cached.

## Floating-point certification

The fast stage has a provisional enclosure and a DD refinement. The provisional
enclosure avoids computing the tighter bound when it already excludes both
rounding boundaries. This is an extra rejection filter within the floating-point
stage; ambiguous DD results still reach the unchanged exact stage below.

`sumError` is Knuth TwoSum's residual; `productError` is Dekker TwoProduct using
the binary64 splitter `2^27+1`. Their exact-transform assumptions and double-word
error analysis are described in [Joldes, Muller and Popescu](https://doi.org/10.1145/3121432).
The bounds below use `u=2^-53` and `E=2^-100`. Guards keep accepted results and
operands normal and away from split overflow. A vanishing exponent can underflow
an intermediate product; that absolute error is below the constant `E` pad.

### Integer and half-integer cases

Integer exponents through magnitude 64 use DD repeated squaring/multiplication,
with a cube specialization retaining both product residuals. The relative
enclosure is `n² E`, including reciprocal correction for negative exponents.
This is at least 64 times `n² u²`, covering the accumulated DD cross-product
and low-word rounding errors. Exact midpoint ties are rejected by the strict
certificate and reach exact integer arithmetic.

Half-integer exponents of magnitude 0.5, 1.5 or 2.5 start with correctly rounded
sqrt. Its low word comes from `(x - h²)/(2h)`, retaining the exact square residual.
DD products and an optional corrected reciprocal give relative error below `E`.
The omitted root correction, low-by-low products and low-word rounding contribute
less than 32 `u²`; the enclosure reserves 64 `u²`.

### General-power logarithm residual

For a positive normal `v`, reduce exactly to `m*2^k`, with
`1/sqrt(2) <= m < sqrt(2)`. Pick the uniform center `c=j/2048`. The table contains
`log(c)` high/low pairs and nearest reciprocals, for `j=1448..2896`. Pairs were
computed from exact dyadic centers at 220 decimal digits; their relative error
is below `2^-106`. The tables describe a uniform numerical domain, not observed
Pine input values. The coefficient audit independently regenerates every entry.

Let `d=m-c`, exactly by Sterbenz. Split the approximate quotient `d/c` at 41
significand bits using `2^12+1`. Since `c` has at most 12 bits, `r*c` is exact;
`rl=(d-r*c)*reciprocal(c)` supplies the low word. For `|r|<2^-11`, its residual
error is below `2^-103`. Applying `rl/(1+r)` to log1p accounts for the low word;
the omitted quadratic in `rl` is below `2^-103` too.

The provisional polynomial uses `r-r²/2+r³/3-...-r⁶/6`. Its absolute enclosure is
`A0 = E*(1+|k|) + 8*u*r²`. The second term covers rounding of the square/tail and
the degree-7 geometric tail: `|r|^7/(7*(1-|r|)) < u*r²/8` throughout this domain.
Table errors, quotient refinement, summation and `k*log(2)` use the constant pad.

If that enclosure cannot certify the answer, the DD refinement retains exact
square/cube/fourth-power residuals, corrected division by 3, and terms through
degree 8. Its absolute enclosure is `A1 = 4*E*(1+|k|)`: quotient and low-word
corrections are below `2^-103`; the degree-9 tail is below `2^-102`; the remaining
DD/table errors are below `32*u²*(1+|k|)`. The two logarithm reductions are inlined
to keep temporaries local and avoid allocating DD pairs on every bar.

For the host candidate `h`, compute the DD residual `delta = y*log(x)-log(h)`.
Reject nonfinite, extreme or inconsistent candidates. For `|delta|<2^-50`,
`h*(1+delta)` has relative enclosure
`B = |y|*Ax + Ah + E*(1+|y*log(x)|) + delta²`.
The extra terms cover DD multiplication/subtraction and the discarded exp tail,
since `|exp(delta)-1-delta| < delta²`. This bound includes the final correction
product's rounding. Both Node versions may supply an adjacent wrong candidate;
the certificate can choose its neighbor or reject it for exact evaluation.

### Rounding-bin exclusion

Round the high/low sum and retain its residual. Compute the actual half-ULP,
including the smaller lower spacing at an exact power of two. Accept only when
the distance from that residual to the nearer boundary exceeds **twice** the
enclosure bound. The factor two covers floating formation of the guard itself;
subtraction at a close boundary is exact by Sterbenz. All accepted fast results
are thus the unique nearest binary64 value. No tolerance is used for output
equality. Values at a boundary, including exact ties, fall through to BigInt.

## Exact algebraic rounding

Decompose each positive input as an odd integer coefficient times a power of
two. For a reduced dyadic exponent `p / 2^q` with `|p| <= 64` and `q <= 5`,
form the exact rational radicand with BigInt arithmetic. Determine its binary
binade by exact comparisons, then its binary64 unit (at least `2^-1074`).
Integer Newton iteration finds the floor of the scaled root. Compare the
unrounded root against the midpoint by raising the midpoint to `2^q` and
cross-multiplying integers; choose the even coefficient on exact equality.
This includes negative exponents without reciprocal or square-root double
rounding. The bounds are algorithmic fast-path bounds, not native-value cases.

An integral power of a power-of-two base is also exact, including overflow,
subnormal powers and the `2^-1075` tie to zero.

These paths cover all possible rational midpoint cases. For a dyadic base
raised to a reduced dyadic exponent to produce a dyadic value, its odd
coefficient must have an exact `2^q`-th root. If that root is greater than one,
its `2^q`-th power fits within the input's 53-bit coefficient only for `q <= 5`.
A binary64 rounding midpoint has an odd coefficient of at most 54 bits, so
the positive numerator of the exponent must be less than 64. A negative
numerator produces a non-dyadic reciprocal unless the odd coefficient is one;
the exact power-of-two path handles that case. Thus a midpoint cannot stall
the adaptive transcendental path.

## Enclosed transcendental rounding

For the remaining positive magnitudes compute `exp(y * log(x))` using BigInt
fixed-point lower and upper bounds, starting at 192 fractional bits:

1. Reduce `x` to `m * 2^k`, with `1 <= m < 2`. Enclose `log(m)` via
   `2 * atanh((m-1)/(m+1))`; enclose `log(2)` with the same series at `1/3`.
   Every multiplication and division rounds outward. Once the next power is
   at most one fixed-point unit, four units bound the doubled geometric tail.
2. Multiply by the exact dyadic exponent, reversing interval endpoints for
   negative factors. Only bounds strictly above 710 or below -746 shortcut to
   infinity or zero; the rounding boundaries themselves take the full path.
3. Reduce the exponential by an integral multiple of the enclosed `log(2)`.
   Require the residual interval to lie in `[0,2]`. Enclose its positive Taylor
   series with outward rounding. After term 8, a term of at most one unit leaves
   a tail smaller than two units, using the decreasing term-ratio bound.
4. Round both endpoints to binary64, including gradual underflow and the
   overflow midpoint. Return only if their bit results agree. Otherwise double
   the fixed-point precision and repeat. Unsafe residual bounds also retry.

Precision is an enclosure width, never a test tolerance. The only shared cache
contains precision-specific bounds for `log(2)`, not user arguments or results.
Signed bases retain odd-integer signs and reject fractional exponents.

Regression checks include native CSV equality, independently computed
250-digit Decimal vectors, exact integer midpoint ties, subnormal and overflow
boundaries, host-approximation poisoning and all three Pine call spellings.
