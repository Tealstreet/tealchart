# Deterministic binary64 power v1

`nativePow` rounds the real power of its exact binary64 inputs to nearest,
ties to even. Positional, named and legacy Pine power calls use this shared
runtime evaluator; the emitter must not bypass it with `Math.pow`.
The v95 native fixtures require exact scalar equality, including `2 ** -2.5`.
V8 in Node 22 returns the lower adjacent float for that input; Node 24 does not.

The implementation uses no host transcendental approximation for finite,
nontrivial powers. It retains the existing host special-value rules for zero,
NaN, infinities and unit bases. Exponents 1, -1, 2 and 0.5 use binary64 identity,
division, multiplication and square root, respectively. Powers of two are
constructed from their IEEE bits rather than evaluated with exponentiation.

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
