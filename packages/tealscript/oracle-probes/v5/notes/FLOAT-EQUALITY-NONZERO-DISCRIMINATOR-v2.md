# Float equality nonzero discriminator v2

Capture the unchanged source for at least32 bars, all8 plots, on BINANCE:BTCUSDT /2-minute/standard/UTC. Preserve raw CSV, source hash and compile/runtime diagnostics. Native outcomes remain unobserved.

Phases0–2 repeat the captured zero boundary. Phases3–5 shift differences9e-11,1.1e-10,4.9e-10 to base1. Nine-digit rounding predicts equality for all three; pairwise absolute tolerance1e-10 predicts only phase3 equal. Phase6 straddles the rounding boundary1.00000000049/1.00000000051: rounding predicts unequal, tolerance predicts equal. Phases7–8 repeat this boundary with negative values and base2. Phases9–10 are exact-equal/opposite-sign controls; phase11 compares a large base and one representable increment. Separate relational plots avoid hiding mixed comparator mechanisms inside a combined mask. Scaled differences preserve magnitude in CSV.

These are competing predictions, not expected assertions or native observations. Reference reconciliation: pynecore-voter-v1/integration-6eb839695e-v1/REFERENCE-RECONCILIATION-v1.md. Existing synthetic VI captures settle only recorded zero-reset outputs; owner thkwwp282973b08164c9427dd57c0cc866bcfb363397dd already corrects that bounded case. No nonzero tolerance implementation follows from those captures.

Revision v2 adds phases12–15 for zero comparisons with +1e-10,+2e-10,-1e-10,-2e-10, explicitly testing the threshold and the overseer counterexample. Sixteen phases per cycle. It supersedes v1 for capture without changing the original nonzero cases.
