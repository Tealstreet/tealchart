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

## Floating-point certification: analytical bounds

This section bounds the operations in `nativePowFast.ts`, rather than inferring
an error budget from finite numerical tests. It deliberately uses wider radii
than the first fast-path revision. Write `RN` for one binary64 round-to-nearest,
`u=2^-53`, `eta=2^-1075`, and **`E=2^-88=262144 u²`** (the code's `ERROR`).
All inequalities concern real values of stored floats; sums without `RN` below
are exact real sums. Strict rounding-bin exclusion, not a numeric tolerance,
determines whether a result can bypass the exact evaluator.

### 1. Arithmetic rules and guarded domain

For an ordinary operation, including gradual underflow,
`|RN(z)-z| <= u|z|+eta`. For at most `j<=64` successive rounded sums/products,
`gamma_j=ju/(1-ju) <= 2ju`; in particular, the error in summing `j+1` stored
terms is at most `gamma_j * sum(abs(terms))`, plus underflow errors. The bounds
below display the normal terms. All omitted underflow contributions together
are less than one `u²` in the units of their containing error budget:

- Integer/half product magnitudes are above `1e-200/2` whenever a DD product is
  used. Even 128 underflow errors divided by this magnitude are below `2^-400`.
- Log calculations use absolute units: `128 eta < u²`. The final correction is
  divided by a candidate above `1e-210`, so `eta/candidate < 2^-376 < u²`.
- A reciprocal that reaches `certify` is above `1e-250`; an underflow error in
  its low word, relative to that value, is below `2^-240 < u²`.

`sumError(a,b,RN(a+b))` is Knuth TwoSum's exact residual. `productError` is
Dekker TwoProduct's exact residual, with Split at `2^27+1`; the specialized
`squareLow` expression combines its two equal, exact cross products. The
expansions and their hypotheses are given in
[Joldes, Muller and Popescu](https://doi.org/10.1145/3121432).
Here those exact-transform hypotheses are instantiated as follows:

| Call sites              | Split/product preconditions in this code                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integer DD products     | Base in `(1e-30,1e30)`; every generic product is guarded in `(1e-200,1e200)` before TwoProduct. Renormalized factors lie in `(1e-200/2,2e200)`. Cube intermediates lie in `(1e-90/2,2e90)`.    |
| Sqrt/half products      | Exponent magnitude is explicitly restricted to `0.5,1.5,2.5`; base has the same bound. Roots are in `(1e-15,1e15)`, other products in `(1e-75/2,2e75)`.                                        |
| Reciprocal residual     | Both operands are normal, their product is near 1, and their exponents sum to at least -1.                                                                                                     |
| Log polynomial products | Reduction gives either `r=0` or `2^-55 < abs(r) < 2^-11`. Squares, cubes, fourth powers and the product by 3 have exact low-bit exponents above -440.                                          |
| `k*LN2_HI`              | Integer `abs(k)<=700`, with the `k=±1` products exact; no splitting overflow/underflow is possible.                                                                                            |
| `logarithm*exponent`    | The new guard requires `abs(th)>1e-200` **before** calling TwoProduct; `abs(logarithm)<512` and `abs(exponent)<2^20`. A failed/tiny/nonfinite product returns NaN to request exact evaluation. |

For two binary64 operands whose product is in `(1e-200/2,2e200)`, the least
possible bit of their exact product is above -800: each significand has at most
53 bits, so at most 106 bits follow the product's leading exponent. Thus the
split products and nonzero residuals do not underflow. No split operand exceeds
`2e200`, so multiplying it by `2^27+1` cannot overflow. These observations
apply to the integer/half/reciprocal rows; the last three rows have still tighter
bounds. TwoSum's additions stay finite. Scaling by 2, 1/2, 1/4 and the tabulated
powers of two is exact in these domains.

`fastIntegerPow` also guards integral `1<=abs(exponent)<=64` itself; it does
not rely on its caller for that hypothesis. `certify` additionally requires a
normal result in `(1e-250,1e250)` and `abs(low)<=2^-45*high`, ensuring the
FastTwoSum residual used there has its dominant-input hypothesis. Special
values, identities, squares and positive sqrt in `nativePow` use their separate
IEEE rules. None of the lemmas here extends a fast helper's admitted domain.

### 2. DD multiplication and the integer recurrence

A normalized pair `(a,al)` satisfies `abs(al)<=2u abs(a)`; likewise `(b,bl)`.
Let `P=abs(ab)`, `p=RN(ab)` and `e0=ab-p`, obtained exactly by TwoProduct.
The generic sequence computes
`e=RN(RN(e0+RN(a*bl))+RN(al*b))`, then renormalizes `(p,e)`.

| Operation/loss         |                Absolute error in units of `u² P` |
| ---------------------- | -----------------------------------------------: |
| `RN(a*bl)`, `RN(al*b)` |   At most 2 each, from `abs(al/a),abs(bl/b)<=2u` |
| Two sums forming `e`   | `gamma_2*(abs(e0)+abs(a*bl)+abs(al*b)) <= 24u²P` |
| Omitted `al*bl`        |                                        At most 4 |
| Renormalization        |        Zero: `abs(e)<6uP`, so FastTwoSum applies |

The total is below `64u²P`, including the underflow allowance above.
`p+e` differs from `p` by less than `6uP`; its renormalized low word is at most
`u*abs(p+e) <= 2u*abs(newHigh)`. Thus the normalized invariant is preserved.
Dividing the local error by `abs((a+al)(b+bl)) >= (1-2u)^2 P` gives the
convenient local relative bound `128u²`. For a square the actual sequence
`RN(e0+RN((2*a)*al))` costs at most `4+6+4=14` units (cross-product rounding,
addition, omitted `al²`); the same 128-unit relative bound covers it.

Expand the repeated-squaring DAG into its multiplication tree. An exponent
`n` has `n` exact base leaves and at most `2n` multiplication nodes including
multiplications by the initial 1. Sharing a squared factor simply repeats its
local error in this expanded tree. Therefore
`abs(relativeError) <= (1+128u²)^(2n)-1 < 512n u²`, for `1<=n<=64`.
The last inequality follows from `2n*128u² < 2^-90` and
`(1+t)^m-1 <= mt/(1-mt)` for positive `mt<1`.

For the cube specialization, `s+sl=x²` is exact, and
`high+low = RN(s*x) + RN(productError(s,x)+RN(sl*x))`.
Here `abs(sl*x)<=2u*x³`; the product and low-word sum contribute at most
`2+4=6` units of `u²*x³`. Hence its relative error is below `8u²` and its
unnormalized low word is below `4u*high`. This branch does not feed another
DD multiplication.

### 3. Corrected reciprocal and half-integer powers

For the reciprocal used by either helper, assume `h>0` and
`t=l/h`, `abs(t)<=16u`; this includes all their exit pairs. Set
`q=RN(1/h)`, `s=RN(h*q)`, and obtain `h*q-s` exactly by TwoProduct.
`1-s` is exact by Sterbenz. The code's remaining low-word sequence is
`RN(RN(RN((1-s)-productError(h,q))-RN(l*q))/h)`.

| Rounded operation             | Error bound                                       |
| ----------------------------- | ------------------------------------------------- |
| Subtract the product residual | At most `4u²` in numerator units (`abs(1-hq)<=u`) |
| `RN(l*q)`                     | At most `17u²`                                    |
| Subtract that product         | At most `20u²`                                    |
| Divide the numerator by `h`   | At most `20u²/h`                                  |

Their sum is below `64u²/h`. The unrounded expression equals
`(1/h)*(1-t*h*q)`. Compared with `1/(h+l)`, its error is bounded by
`(t²/(1-abs(t)) + abs(t)*u)/h < 288u²/h`. Including arithmetic, scaling
from `1/h` to `1/(h+l)`, and underflow gives the conservative **`1024u²`
relative bound**. Its low word is below `21u*q`, within the certification
guard. Inverting an existing relative error `e` changes it to at most
`abs(e)/(1-abs(e)) < 2abs(e)`. The integer bound including this step is thus
below `(1024n+1024)u² <= 2048n²u²`. The code uses `n² E`, a factor of at
least 128 larger; floating formation of that radius cannot consume this slack.

For sqrt let `h=RN(sqrt(x))`, `s=RN(h²)`, `sl=h²-s` exactly.
`x-s` is exact by Sterbenz. With `d=x-h²`, `abs(d)<3ux`, the two operations
`RN((x-s)-sl)` and division by exact `2h` give
`abs(rootLow-d/(2h)) < 4u²h`: numerator rounding costs at most `3u²x`,
and quotient rounding at most `2u²h`, using `x/h²` within `1±3u`.
The exact Newton correction differs from sqrt by
`(h-sqrt(x))²/(2h) < u²h`. Therefore the root pair's relative error is
below `8u²`, and `abs(rootLow)<4uh`.

For powers 1.5/2.5 the factor pair is exactly `x` or `x²`. In its product
with the root pair, cross-product magnitudes are bounded by `4uP` and `2uP`.
Their rounding costs at most `6u²P`; two low-word sums cost at most
`gamma_2*8uP <= 32u²P`; the omitted low-by-low product costs at most
`8u²P`. Thus the product's local error is below `64u²P`, or `128u²`
relative. With the root error this is below `256u²`; its low word is below
`16u*high`. Optional reciprocal raises the relative error to at most
`2*256u²+1024u² < 2048u²`. This establishes the **half-integer E budget**
with the same factor-128 slack, including negative powers.

### 4. Constant data and exact range reduction

Write `v=m*2^k`, `1/sqrt(2)<=m<sqrt(2)`, and `K=1+abs(k)<=701`.
This reduction is exact. `m*2048` is exact and rounding its index selects
`c=j/2048`, `1448<=j<=2896`, with `abs(m-c)<=2^-12`.
The three constants at each center satisfy

`abs((tableHi+tableLo)-log(c)) <= u²`, `abs(tableLo)<=u`,
`abs(c*reciprocal-1)<=u`.

The two ln2 words similarly have sum error below `u²` and low word below `u`.
These are facts about the complete, finite coefficient set, not assumptions
about user data. The following reproducible certificate checks every coefficient
using exact Fractions and an outward interval around Decimal's correctly rounded
`ln` ([Decimal.ln contract](https://docs.python.org/3/library/decimal.html#decimal.Decimal.ln)).
The interval reserves a full decimal ULP, exceeding its half-ULP rounding error;
no agreement-between-precisions argument is needed. Run from this directory:

```python
import re
from decimal import Decimal as D, localcontext
from fractions import Fraction as F
from pathlib import Path

u = F(1, 2**53)
source = Path('nativePowFast.ts').read_text()
def constant(name):
    return F(float(re.search(r'const ' + name + r' = ([^;]+);', source)[1]))
assert constant('ERROR') == F(1, 2**88)
body = Path('nativePowTables.ts').read_text().split('new Float64Array([')[1].split(']);')[0]
values = [F(float(s)) for s in re.findall(r'[-+]?\d+(?:\.\d*)?(?:e[-+]?\d+)?', body, re.I)]
assert len(values) == 3 * (2896 - 1448 + 1)
with localcontext() as ctx:
    ctx.prec = 220
    def check_log(c, hi, lo):
        z = c.ln()
        if not z:
            assert hi == lo == 0
        else:
            radius = F(D(1).scaleb(z.adjusted() - ctx.prec + 1))
            assert abs(F(z) - hi - lo) + radius < u*u
        assert abs(lo) <= u
    for j in range(1448, 2897):
        hi, lo, reciprocal = values[3*(j-1448):3*(j-1448)+3]
        check_log(D(j)/2048, hi, lo)
        assert abs(hi) < F(1, 2)
        assert abs(F(j, 2048)*reciprocal - 1) <= u
    check_log(D(2), constant('LN2_HI'), constant('LN2_LO'))
print('1449 coefficient rows and split ln2 certified')
```

Let `d=m-c`, `t=d/c`. Sterbenz gives `d` exactly, and
`abs(t)<=1/2896<2^-11`. The stored reciprocal and its multiplication give
`abs(q-t)<3u*abs(t)`. Split at `2^12+1` gives at most 41 significant bits in
`r` and `abs(q-r)<=2^-40*abs(q)`. The center has at most 12 significant
bits, so `r*c` is exactly representable (at most 53 bits). Moreover `r*c` and
`d` have the same sign and are within a factor two, so `d-r*c` is exact.
For `epsilon=t-r` these facts imply

`abs(epsilon)<2^-39*abs(t)<2^-50`, `R=abs(r)<2^-11`,
`abs(rl-epsilon)<=3u*abs(epsilon)<32u²`, `abs(rl)<16u`.

When `d!=0`, its binary64 spacing here is at least `2^-53`; consequently
`abs(r)>2^-55`, as used in the EFT precondition table. The zero case performs
only exact zero polynomial operations.

The stored `W=RN(rl/RN(1+r))` has magnitude below `32u`. Relative denominator
and quotient rounding, plus the preceding rl error, bound its error against
`epsilon/(1+r)` by
`32u²/(1-R) + gamma_2*16u/(1-R) < 128u²`.
Also `abs(epsilon/(1+r))<16u`; replacing its log1p by its linear term costs
at most `(16u)²/(2*(1-16u)) < 256u²`. Therefore W approximates the entire
additional logarithm `log(1+t)-log(1+r)` with **absolute error below `384u²`**.

### 5. Provisional polynomial: operation-by-operation

Set `s=RN(r²)`. The TwoSum residual makes `a+e = r-s/2` exact, where
`a=RN(r-s/2)` and `abs(e)<=2uR`. The tail is computed as
`T=RN(RN(r*s)*H)`, with the degree-3 Horner expression H starting at 1/3.
Its rounded rational constants and six evaluation operations are covered by
`gamma_9*sum(R^j/(j+3),j=0..3) < 7u`. Including `s`, the multiplication by r
and the final multiplication therefore gives tail error at most `10uR³`.
The exact degree-7-and-higher remainder is below
`R^7/(7*(1-R)) < uR²/16` (divide by `uR²` and use `R^5<2^-55`).

The following table bounds the pair `(a,reducedLow)` in the actual order
`reducedLow=RN(RN(e+W)+T)`:

| Loss                             | Absolute upper bound                      |
| -------------------------------- | ----------------------------------------- |
| Square rounding in `-s/2`        | `uR²/2`                                   |
| Rounded cubic-to-sixth tail      | `10uR³`                                   |
| Taylor remainder                 | `uR²/16`                                  |
| W's full quotient/log correction | `384u²`                                   |
| Two low-word additions           | `gamma_2*(2uR+32u+R³) <= 8u²R+128u²+4uR³` |

Their sum is below **`1024u²+uR²`**. The stored low word is bounded by
`R³+35u`. The cubic tail is explicitly included in this magnitude: the
provisional low word is not assumed to be O(u).

Adding the table high word uses TwoSum, without error in the represented high
sum. The two additions forming its low word cost at most
`gamma_2*(u+u+R³+35u) <= 4uR³+148u²`; table truncation costs at most `u²`.
Before adding k*ln2 the log error is below `2048u²+2uR²`, the high word has
magnitude below 1, and the low word is below `2R³+64u`.

For nonzero k the coarse pair costs at most `8abs(k)u²`: at most `abs(k)u²`
each for ln2 truncation and `RN(k*LN2_LO)`, and at most `3abs(k)u²` for its
low addition. TwoProduct keeps the high product exact as a pair. Its low word
is bounded by `3u abs(k)`. The subsequent TwoSum high addition is exact as a
pair; the two low additions cost at most
`gamma_2*(2R³+64u+uK+3u abs(k)) <= 8uR³+260u²+16abs(k)u²`.
Consequently the final provisional log pair `(H,L)` satisfies

`abs(H+L-log(v)) < 4096u² K + 4uR²`,
`abs(H)<=K`, `abs(L)<=2R³+128uK`.

More specifically, the pre-coarse high word is below 1 and the rounded coarse
word has magnitude below `0.7 abs(k)`. Thus `abs(H)<1+0.7 abs(k)<512`,
which establishes the high-word bounds used by the product guard and section 7.

The implemented radius is
`A0=RN(E*K + 16u*RN(r²))`. Its positive arithmetic underestimates the real
expression by at most `(1-u)^2`. Since `E=262144u²`, the established error is
strictly below **A0/2**, including that formation error. This derives, and
widens, the former undischarged constant pad and square term.

### 6. Refined polynomial: operation-by-operation

The refined path retains the square residual exactly. The next computations
have the following absolute errors against their indicated exact powers:

| Sequence                                                         | Error and intermediate magnitude                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cube pair: `C=RN(s*r)`; `Cl=RN(productError(s,r)+RN(sl*r))`      | Product rounding at most `2u²R³`, low sum at most `4u²R³`; error `<8u²R³`, `abs(Cl)<=6uR³`                                                                                                                                |
| Fourth pair: `F=RN(s*s)`; `Fl=RN(productError(s,s)+RN((2s)*sl))` | Cross rounding `<4u²R^4`, sum `<6u²R^4`, omitted `sl² <=4u²R^4`; error `<16u²R^4`, `abs(Fl)<=6uR^4`                                                                                                                       |
| Divide cube pair by 3                                            | `C-RN(3*RN(C/3))` exact by Sterbenz; subtracting its exact product residual costs `u² abs(C)`, adding Cl at most `8u² abs(C)`, final /3 rounding at most `3u² abs(C)`; with cube error, total `<32u²R³`, low word `<8uR³` |
| `(a,al)` for `r-s/2` with `-sl/2` in al                          | One rounded low subtraction costs `<3u²R`; `abs(al)<=3uR`                                                                                                                                                                 |
| `(b,bl)` after adding the third pair                             | Two rounded low additions cost `<24u²R`; with previous errors, total `<32u²R`, `abs(bl)<=8uR`                                                                                                                             |
| Degree-5-to-8 tail `RN(RN(r*F)*H5)`                              | Horner error `<4u`, `abs(H5)<1/4`; fourth-high and product errors give `<16uR^5 <=4u²`                                                                                                                                    |
| Degree-9-and-higher remainder                                    | `R^9/(9*(1-R)) <2^-102=16u²`                                                                                                                                                                                              |

The final reduced high word is `RN(b-F/4)`, with exact TwoSum residual.
Its low word sums that residual, bl, -Fl/4, tail, W, in that order. The sum
of their magnitudes is below
`2uR+8uR+2uR^4+R^5+32u <34u`; four additions therefore cost at most
`gamma_4*34u <=272u²`. Combining the table entries above, the W error,
and the b/fourth errors gives
`32u²R+4u²R^4+4u²+16u²+272u²+384u² <1024u²`.

Attaching the table and coarse pair uses exactly the summations in section 5,
now with a reduced low magnitude below 34u and no cubic low tail. Those same
inequalities give a final error below `8192u²K` and `abs(L)<=128uK`.
The implemented **`A1=4E*K`** is exact (integer times power of two), so the
refined log error is below **A1/2** with substantial slack. The radius is
intentionally wider than the displayed operation error budget.

### 7. Log-residual arithmetic, including its uncertainty

Apply the preceding lemmas to x and candidate h, giving `(H,L,Ax)` and
`(J,M,Ah)`. Let `T=RN(H*y)` (code `th`), `e1=H*y-T` exactly, and
`tl=RN(e1+RN(L*y))`. Write `a=abs(y)`. Its error against `e1+L*y` is at most
`2u² abs(T)+3ua abs(L)+2eta`.

Next `d=RN(T-J)`, `e0=T-J-d` exactly, and the code forms
`z=RN(RN(e0+tl)-M)`, `delta=RN(d+z)`.
Here `abs(J)<512`, `abs(e0)<=u*(abs(T)+512)`, and
`abs(tl)<=2u abs(T)+2a abs(L)`. The two operations forming z contribute at most
`12u² abs(T)+2048u²+8ua abs(L)+4u abs(M)`.
The accepted `abs(delta)<2^-50` implies `abs(d+z)<2^-49`, so its final rounding
costs at most `16u²`; it is not bounded using the large pre-cancellation terms.
Thus total arithmetic error in delta, in addition to log-approximation errors,
is below

`14u² abs(T)+2064u²+11ua abs(L)+4u abs(M)`.

For provisional logs, use `abs(L)<=2R³+128uK` and A0's definition:
`11u abs(L) <=22uR³+1408u²K < Ax/128`.
The analogous `4u abs(M) < Ah/256`. Both inequalities also hold for refined
logs, whose low word has no cubic tail and whose radius is larger. The first
two terms above, including underflow, are below `E*(1+abs(T))/32`.
Since each log's true error is below its reported radius/2, the exact log
residual **`D=y*log(x)-log(h)`** satisfies

`abs(D-delta) < (1/2+1/128)*a*Ax + (1/2+1/256)*Ah + E*(1+abs(T))/32`.

Let `S` be the floating sum `a*Ax+Ah+E*(1+abs(T))`. Its four positive rounded
operations lose at most `gamma_4` relatively. The displayed bound is below
`3/4` of the corresponding real sum, hence strictly **below S** after its
formation error. This is the uncertainty that must be carried through exp;
delta is not treated as the exact log residual.

The domain implies `K<=701`, `R<2^-11`, `a<2^20`, `abs(T)<2^29`.
Consequently `Ax,Ah<2^-70` and `S<2^-49` for the provisional path (the
refined bound is smaller). Therefore `abs(D)<=abs(delta)+S<2^-48`.
These domain bounds establish the small-argument hypotheses in the next step.

### 8. Propagating through exp and the actual correction product

The exact value is `z=x^y=h*exp(D)`. On `abs(D),abs(delta)<2^-48`, the mean
value theorem gives
`abs(exp(D)-exp(delta)) <= exp(2^-48)*abs(D-delta) <2S`.
The Taylor remainder for delta is at most
`exp(abs(delta))*delta²/2 < delta²`.
Thus `abs(exp(D)-(1+delta)) <2S+delta²`.

The stored correction `c=RN(h*delta)` adds, in units of h,
`abs(c/h-delta)<=u abs(delta)+eta/h <16u² <=S/16384`.
It follows that the **actual stored pair** `(h,c)` has absolute error below
`h*(3S+delta²)` against z. The code now computes
`B=RN(4*RN(S+RN(delta²)))`, spelled as one positive expression without a
separate S variable. Even allowing its positive-sum/product formation error,
`3S+delta² <0.76B`. Thus

**`abs(z-(h+c)) <0.76 h B`.**

This derives the final radius for the real exponential of an uncertain log
residual, including correction rounding. It replaces the former unsupported
single `E*(1+abs(th))` assertion; the E term is now discharged by the
operation bounds in section 7 and the explicit factor 4 above.

### 9. Rounding-bin implication and the factor-two guard

For `q=RN(high+low)`, the new low-word guard guarantees `abs(high)>=abs(low)`;
FastTwoSum gives the exact stored-pair residual
`rho=(high-q)+low`, so `high+low=q+rho` exactly. At a power of two the code
now uses the **smaller spacing in both directions**, regardless of rho's sign;
at other normal doubles both spacings agree. Let b be this minimum half-ULP.
Then `b-abs(rho)` is a conservative distance to either rounding boundary.
The candidate-only shortcut uses `high=h`, `rho=c` and the same minimum-spacing
rule; it does not require adding c first.

For general powers, `abs(c/h)<2^-49` and `q/h` is within `1±2^-48`.
Section 8 therefore bounds error of the represented pair by `0.77 q B`.
For integer/half powers the proved relative errors (`2048n²u²` or `2048u²`)
are at least 128 times smaller than the supplied radius; conversion from the
true value to q still leaves pair error below `q*radius/64`.
Thus in every case the actual pair error is strictly below `q*radius`, with
room for the floating formation of this comparison.

The code accepts only when `RN(b-abs(rho)) > RN(q*(2*radius))` (or the h/c
candidate counterpart). A positive normal subtraction may round up by at most
`1+u`; if the margin is subnormal the subtraction is exact by Sterbenz.
The positive guard is normal here and may round down by at most `1-u`. Acceptance implies
the true margin exceeds `2q*radius*(1-u)/(1+u) >q*radius`, and hence exceeds
the established pair error. Both midpoint boundaries are excluded. q is
therefore the unique correctly rounded result. Exact ties and inconclusive
cases fail the strict test and reach the unchanged exact stage.

The proof uses no assumption about the accuracy of host Math.pow. Its candidate
must pass the range, residual and rounding-bin tests; otherwise it is corrected
by a certified adjacent result, refined, or rejected for exact evaluation.

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
