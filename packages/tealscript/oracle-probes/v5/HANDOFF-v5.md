# TradingView capture handoff v5

Frozen release v2. Use the SHA-pinned sources and this single manifest; do not use older working manifests or superseded comparison probes.

Capture counts: 20 numeric, 14 screenshot, 96 outcome; 130 distinct Pine sources.

## Instructions applying to every probe

Run each untouched file independently. Default chart: BINANCE:BTCUSDT, 2-minute standard candles, UTC; use default inputs unless the individual instructions below request a separate run. Record symbol, timeframe, timezone, input settings, source SHA, attempt timestamp and last confirmed-bar cutoff. Start from script bar_index 0 where requested; never substitute CSV row number.

For every refusal save exact compile/runtime diagnostic, exposed code, line/column, first failing bar, and a screenshot. Do not repair a source, insert casts, rename parameters, or let one refusal suppress sibling controls. For every accepted probe export all plots with original headers, timestamps and empty NA cells, excluding the unconfirmed bar from numerical comparisons. Preserve warnings. Screenshots are additionally required for visual probes; CSV does not settle geometry, colors or placement. Local predictions are not capture verdicts.

Save outputs under captures/v5/ as <source-stem>-attempt1.csv and/or evidence/<source-stem>-attempt1-error.txt and .png. Increment attempt numbers on retries; retain earlier attempts.

## collection-ranked01-from-empty-v1.pine

SHA256: `e8c9e59218139b25d4600cc5410f29eda76d38dd1e8b0f2d73ebac1988892dda`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Capture unchanged source and all diagnostics;2-minute standard BINANCE:BTCUSDT UTC, at least20historicalbars.
No source repairs; preserve CSV when compilation succeeds.
Question or prediction to discriminate (not a native verdict): Observe compile acceptance/refusal of zero-argument array.from; if accepted, exact empty size. Variadic required flag does not establish a native minimum.
Stimulus: Observe compile acceptance/refusal of zero-argument array.from; if accepted, exact empty size. Variadic required flag does not establish a native minimum.

## collection-ranked01-from-single-control-v1.pine

SHA256: `e03432c9962a83a8bcd718e11060cebb3264b9bbe6282559462c40b664148672`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Capture unchanged source and all diagnostics;2-minute standard BINANCE:BTCUSDT UTC, at least20historicalbars.
No source repairs; preserve CSV when compilation succeeds.
Question or prediction to discriminate (not a native verdict): Positive singleton control; expected size1/value17 is documented, native not observed here.
Stimulus: Positive singleton control; expected size1/value17 is documented, native not observed here.

## collection-ranked22-mode-outcomes-v1.pine

SHA256: `2ab22b09a0224db80cc8bea242b1d58238b5a2e5210fe912bbd0e0cbf5e54d24`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 3 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: int_unique, int_tie, int_single, int_distinct_namespace, int_distinct_method, int_empty, float_unique, float_tie, float_single, float_distinct_namespace, float_distinct_method, float_empty.
Record complete native diagnostic or all 12 CSV columns unchanged.
No archive candidate is native authority.
Question or prediction to discriminate (not a native verdict): Observe native unique/tied/singleton/all-distinct/empty mode outcomes. Reference smallest fallback conflicts with arrays manual no-mode NA. No native verdict inferred from engine or prediction.
Stimulus: Observe native unique/tied/singleton/all-distinct/empty mode outcomes. Reference smallest fallback conflicts with arrays manual no-mode NA. No native verdict inferred from engine or prediction.
Probe-specific operator notes: [COLLECTION-RANKED22-MODE-PROBES-v1.md](notes/COLLECTION-RANKED22-MODE-PROBES-v1.md).

## collection11-symmetric-eigenvectors-integer-pinv-v1.pine

SHA256: `e8a6fe4efd7b7adf7528ab218e63375b60fae5d094a5c47e9dcc836240bbb20f`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Exact CSV columns and source hash
First diagnostic and bar if refused
No LIVE ticks or screenshots required
Question or prediction to discriminate (not a native verdict): Real eigenvector columns predicted; signs/order and integer pseudoinverse rounding/representation unobserved. Generic Moore-Penrose arithmetic predicts 0.5/0.25 but integer overload interpretation remains unanswered.
Stimulus: Finite symmetric 3x3 matrix with real opposite-sign roots, then integer nonsingular diagonal pseudoinverse. Capture exact vector columns/sign/order and fractional integer overload content; no native values assumed.
Probe-specific operator notes: [COLLECTION11-PROBES-v1.md](notes/COLLECTION11-PROBES-v1.md).

## compound-additive-grouping-v1.pine

SHA256: `58150e75dd6ced3e5320eceb78fd7186b54db89fcae8801a751d0b4a05eb8596`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: input_time, input_bar_index, root_plain, root_grouped, control_left, control_right, udf_plain, udf_grouped.
Question or prediction to discriminate (not a native verdict): Captured mfi-flat-flows-v2 plain += src - removed equals add-then-subtract all24134rows. Whether explicit RHS parentheses alter compound grouping remains unspecified; record both plain/grouped root and UDF outputs independently.
Stimulus: Eight constant-color plots; finite float arithmetic; no requests, history lookbacks, or inputs. Independent left/right controls distinguish grouping with integer outcomes1/0.

## compound-operator-association-pine-v5-v1.pine

SHA256: `c46298afc7724a0cb2c2d856b8c08c48196f57379912fb7d03927456dde8ff46`. Capture group: **numeric**. Declared Pine version: 5.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Stimulus: Finite phase-driven arithmetic with explicit left/grouped controls; no assumed compound association. Complements existing plain/grouped root/UDF probe.

## compound-operator-association-pine-v6-v1.pine

SHA256: `53fe243fb89dba8831789ea290ba9977b25532749053ddccf492cc8c4107e737`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Stimulus: Finite phase-driven arithmetic with explicit left/grouped controls; no assumed compound association. Complements existing plain/grouped root/UDF probe.

## corpus-array-get-division-v5-v1.pine

SHA256: `0c3ecc9c55dc5280f24310dddebbdbc5a7a5f947076f48e006081889d25ab090`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: division.
First native diagnostic/phase; if admitted export all plot columns.
Negative -0.5 distinguishes floor(-1,wrappedlast) from trunc(0,first); do not infer from positive-only control.
Question or prediction to discriminate (not a native verdict): Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.
Stimulus: Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.

## corpus-array-get-division-v6-v1.pine

SHA256: `994df1d5ab2444fc59e4316dd992785e5be66a0e732f9fb30e9696977de0aaf3`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: division.
First native diagnostic/phase; if admitted export all plot columns.
Negative -0.5 distinguishes floor(-1,wrappedlast) from trunc(0,first); do not infer from positive-only control.
Question or prediction to discriminate (not a native verdict): Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.
Stimulus: Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.

## corpus-array-get-fraction-v5-v1.pine

SHA256: `54e0c2b81f1ff2ab0da213d8cef336b87fb3c721d45c49b052834b45aa1911ef`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: fraction.
First native diagnostic/phase; if admitted export all plot columns.
Negative -0.5 distinguishes floor(-1,wrappedlast) from trunc(0,first); do not infer from positive-only control.
Question or prediction to discriminate (not a native verdict): Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.
Stimulus: Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.

## corpus-array-get-fraction-v6-v1.pine

SHA256: `330b1c7c87a00212c355d74bc2668446f06b8294ba46f1ae4d752592841ade66`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: fraction.
First native diagnostic/phase; if admitted export all plot columns.
Negative -0.5 distinguishes floor(-1,wrappedlast) from trunc(0,first); do not infer from positive-only control.
Question or prediction to discriminate (not a native verdict): Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.
Stimulus: Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.

## corpus-array-get-integer-controls-v6-v1.pine

SHA256: `929476ce0c26364f3aee28063647c635701aca5deca3164d0f3eb6374c502c6c`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: floor_control, ceil_control, negative_floor_control, negative_trunc_control.
First native diagnostic/phase; if admitted export all plot columns.
Negative -0.5 distinguishes floor(-1,wrappedlast) from trunc(0,first); do not infer from positive-only control.
Question or prediction to discriminate (not a native verdict): Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.
Stimulus: Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.

## corpus-array-get-loop-int-controls-v5-v1.pine

SHA256: `ca0eb1ff42fd6570245f8353582e52729bea83890e1ea91bd856f89905519290`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: loop_explicit_int, const_int_division.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Same revision13 float-index class; exact v56:1270 v5 loop-counter i divided by var integer divisor=2. Separate const-int division and explicit-intcast controls. Native admission and coercion unobserved; do not generalize all v5 int/int division.
Stimulus: Same revision13 float-index class; exact v56:1270 v5 loop-counter i divided by var integer divisor=2. Separate const-int division and explicit-intcast controls. Native admission and coercion unobserved; do not generalize all v5 int/int division.

## corpus-array-get-loop-var-division-v5-v1.pine

SHA256: `fd43b9d746244f30ee28e2fb4d784ac033523d22c5b83327b4761465b6234e3e`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: loop_var_division.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Same revision13 float-index class; exact v56:1270 v5 loop-counter i divided by var integer divisor=2. Separate const-int division and explicit-intcast controls. Native admission and coercion unobserved; do not generalize all v5 int/int division.
Stimulus: Same revision13 float-index class; exact v56:1270 v5 loop-counter i divided by var integer divisor=2. Separate const-int division and explicit-intcast controls. Native admission and coercion unobserved; do not generalize all v5 int/int division.

## corpus-array-get-negative-fraction-v6-v1.pine

SHA256: `ac6f2f8782e5d77259a5e1a387e88e255ac5e124b734064e7c036a80a0c07fc6`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: negative_fraction.
First native diagnostic/phase; if admitted export all plot columns.
Negative -0.5 distinguishes floor(-1,wrappedlast) from trunc(0,first); do not infer from positive-only control.
Question or prediction to discriminate (not a native verdict): Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.
Stimulus: Resolve float-index admission and floor/truncation independently. Current manual division-index example conflicts with int-only reference signature; do not preselect native acceptance.

## corpus-array-get-series-division-v5-v1.pine

SHA256: `f5d6cb3020a0278375d5d6cf18fe3316d96f5cdeee29b98104390e428db403d9`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: series_division.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Same revision13 float-index class; exact size/2 v6 witnesses93/1108 and i/k_nwe v5 witness1270. Independent integer controls; native admission and coercion unobserved.
Stimulus: Same revision13 float-index class; exact size/2 v6 witnesses93/1108 and i/k_nwe v5 witness1270. Independent integer controls; native admission and coercion unobserved.

## corpus-array-get-size-division-v6-v1.pine

SHA256: `96fbd243384b8d19225a33f7a46ca3fe32fdcfb24393ca44ad058382d8a60324`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: size_division.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Same revision13 float-index class; exact size/2 v6 witnesses93/1108 and i/k_nwe v5 witness1270. Independent integer controls; native admission and coercion unobserved.
Stimulus: Same revision13 float-index class; exact size/2 v6 witnesses93/1108 and i/k_nwe v5 witness1270. Independent integer controls; native admission and coercion unobserved.

## corpus-array-get-size-series-controls-v6-v1.pine

SHA256: `0f13f6c9bfb6c616eba2e2ec8111db5be41adc20753d5c713c3c8eedb8221283`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: size_floor, size_ceil, series_floor, series_ceil.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Same revision13 float-index class; exact size/2 v6 witnesses93/1108 and i/k_nwe v5 witness1270. Independent integer controls; native admission and coercion unobserved.
Stimulus: Same revision13 float-index class; exact size/2 v6 witnesses93/1108 and i/k_nwe v5 witness1270. Independent integer controls; native admission and coercion unobserved.

## corpus-array-median-float-control-v1.pine

SHA256: `e45cfd7872034f55036909961988b43dd505931522e0d684cd64b69e4bbe7f5a`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: median_0, median_1, median_2.
First native diagnostic and phase.
If admitted export all3plot columns; preserve negative even-array discriminator.
Question or prediction to discriminate (not a native verdict): Documented integer return overload; actual even-array numerical selection is unobserved. Record admission and raw values without preselecting rounding.
Stimulus: Odd and even positive/negative arrays; constant plots; no requests or history. If admitted export all3plots to distinguish integer median selection from float control.

## corpus-array-median-integer-v1.pine

SHA256: `d51a120fcbd99c95bb12e3eca309cbfa137974aa4799e972ee3817e8ce097bd4`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: median_0, median_1, median_2.
First native diagnostic and phase.
If admitted export all3plot columns; preserve negative even-array discriminator.
Question or prediction to discriminate (not a native verdict): Documented integer return overload; actual even-array numerical selection is unobserved. Record admission and raw values without preselecting rounding.
Stimulus: Odd and even positive/negative arrays; constant plots; no requests or history. If admitted export all3plots to distinguish integer median selection from float control.

## corpus-array-standardize-float-control-v1.pine

SHA256: `cf553cf4388957021450dda513aa646a173a94f55ef41719e798c1e644969f79`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: first, middle, last.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Reference has an array<int> standardize return overload, but fractional conversion and native admission are unobserved. Compare inferred int receiver, explicitly typed int method result and float control; no arithmetic rule guessed.
Stimulus: Reference has an array<int> standardize return overload, but fractional conversion and native admission are unobserved. Compare inferred int receiver, explicitly typed int method result and float control; no arithmetic rule guessed.

## corpus-array-standardize-int-inferred-v1.pine

SHA256: `25129e5f6c4a9100f8fa99bd906629fd55f09bf8454669de7bc6d0595c0926b8`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: size, first, middle, last.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Reference has an array<int> standardize return overload, but fractional conversion and native admission are unobserved. Compare inferred int receiver, explicitly typed int method result and float control; no arithmetic rule guessed.
Stimulus: Reference has an array<int> standardize return overload, but fractional conversion and native admission are unobserved. Compare inferred int receiver, explicitly typed int method result and float control; no arithmetic rule guessed.

## corpus-array-standardize-int-typed-v1.pine

SHA256: `70b808427a5139ecbbaeba70bcdfa056f878a7f257370101f0fb3631bd7824df`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: first, middle, last.
First native diagnostic/phase; if admitted export all plots.
Read alongside the original6revision13 scripts; this is one class, not competing probes.
Question or prediction to discriminate (not a native verdict): Reference has an array<int> standardize return overload, but fractional conversion and native admission are unobserved. Compare inferred int receiver, explicitly typed int method result and float control; no arithmetic rule guessed.
Stimulus: Reference has an array<int> standardize return overload, but fractional conversion and native admission are unobserved. Compare inferred int receiver, explicitly typed int method result and float control; no arithmetic rule guessed.

## corpus-array-standardize-mixed-na-v1.pine

SHA256: `9873aad7f160e77962c1159d0aa72efc7e5467c12d476a52fa22768c1e34bd12`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Capture unchanged source and all20 columns.
No engine/test behavior pin until native adjudication.
Question or prediction to discriminate (not a native verdict): Native mixed-NA slot behavior not observed. No inferred compaction or preservation verdict.
Stimulus: All reads guarded by size; finite and all-missing controls. Observe mixed-NA slot cardinality/order without assumed verdict.

## corpus-color-new-linewidth-control-v6-v1.pine

SHA256: `43a06b69c6e7fe0c5aa529066c6c3855cf312ef11a65dd53abc52586d7e32cfc`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: close.
First native diagnostic and phase; if admitted capture plot and table screenshot.
Control admission does not establish target admission.
Question or prediction to discriminate (not a native verdict): Positive control keeps linewidth on outer plot.
Stimulus: Positive control keeps linewidth on outer plot.

## corpus-color-new-linewidth-v6-v1.pine

SHA256: `0a8d7255ba7e9f8f045e10fea725f870c4bc98b2eda3ec8b56e10d3da5c0f2e8`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: close.
First native diagnostic and phase; if admitted capture plot and table screenshot.
Control admission does not establish target admission.
Question or prediction to discriminate (not a native verdict): Raw corpus v56:69; unknown nested linewidth plus duplicate color. Official signature has only color/transp; capture native phase.
Stimulus: Raw corpus v56:69; unknown nested linewidth plus duplicate color. Official signature has only color/transp; capture native phase.

## corpus-compile-third-v5-ascii-comment-control-v1.pine

SHA256: `a6175aa9b22381c5d1cd0074501e35acc3d2c410b92c93dedaa869a3f112552d`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: PRICE_CONTROL, STRING_LENGTH_CONTROL.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v5-comma-imports-v1.pine

SHA256: `8c0c2ad05d2ef21f829a80d83dd889410979e5ed6b8261e95d943c4fa9dee311`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v5-fill-modern-title-control-v1.pine

SHA256: `8e2d7e4aa8ee8394aad3b4329a16139ee43717ced257118c37777f2943d278c3`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: UPPER, LOWER.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md).

## corpus-compile-third-v5-fill-named-title-transp-control-v1.pine

SHA256: `127b6195e40b0656a7d0f377bf292bff6b3e343b7e338b126b5abeb16ce0f519`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: UPPER, LOWER.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md).

## corpus-compile-third-v5-fill-positional-title-named-transp-v1.pine

SHA256: `7b37a2b022153916638e32327b52953b512b6ab4ef11501cda80d1934c93fa4a`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: UPPER, LOWER.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md).

## corpus-compile-third-v5-fill-positional-transp-named-title-v1.pine

SHA256: `736e2369f4f6a0e8b45c21be4efe1f91ba90a88ea39a5b461206928d38f25628`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: UPPER, LOWER.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-FILL-PROBES-v1.md).

## corpus-compile-third-v5-fullwidth-comment-layout-v1.pine

SHA256: `5446685af1e58e9eb41bb2cf1289e3378c2371e1f01a8ca5c050982df43616b8`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v5-polyline-existing-id-cast-v1.pine

SHA256: `14be2fd85b121dabe14fe44fd2c70d3d42b86d79f83768956c23d61a0818359d`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET_MISSING.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-POLYLINE-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-POLYLINE-PROBES-v1.md).

## corpus-compile-third-v5-polyline-missing-id-cast-v1.pine

SHA256: `c0d5271b41c1c33d4a914a9b05e7e77bdadad2a14914c63a50c38452e69b36fb`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET_MISSING.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-POLYLINE-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-POLYLINE-PROBES-v1.md).

## corpus-compile-third-v5-polyline-typed-na-control-v1.pine

SHA256: `a249bc44f77eb3a8e9dc40f193b361b5ad2314b9a5305dbb2ac5e1ef2e0a18a0`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TYPED_MISSING_CONTROL.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-POLYLINE-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-POLYLINE-PROBES-v1.md).

## corpus-compile-third-v5-separate-import-controls-v1.pine

SHA256: `3960bb61afaf44ef108a5952e899a2d030a9bd9f2f166cebb62119483c8db1d6`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v6-color-linewidth-v1.pine

SHA256: `6e4574a1ae16ffdd28029c4cc7400b0e950483927b996684000cb87794fd8522`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v6-duplicate-plot-color-v1.pine

SHA256: `1fb9bd0f467011415066faf5fef14daf1d881daba9a4bf3f7526c3d5fb570c08`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v6-forward-global-v1.pine

SHA256: `05645b64f7e8c91d2fbef3e6b1da19d323914127bf537ac5980be8e44f825326`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v6-leading-comma-declaration-v1.pine

SHA256: `3a00966b52082a5ab6821304a05bdb6f324774efd94d774c03b15a57fda288c0`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v6-name-binding-controls-v1.pine

SHA256: `fe6e581e1981d20b3567856d2e0021f025744663321148eb37cbd277bd843756`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: EARLIER_GLOBAL_CONTROL, DECLARED_VALUE_CONTROL, COLOR_CONTROL, SINGLE_COLOR_CONTROL.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-third-v6-undeclared-global-v1.pine

SHA256: `b1e319d2214f4fa0bedca748e46ed20744c489ff6cc9933e3ac3076b005fc60a`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: TARGET.
Preserve source hash and first native diagnostic/phase/bar.
If admitted, export every output column; controls cannot prove target admission.
Question or prediction to discriminate (not a native verdict): Documentation prediction only; ambiguous layout/import targets have no predicted native phase. No native outcome has been captured.
Stimulus: Isolated corpus construct or independent control. Preserve native admission/refusal and diagnostics; do not edit the source to obtain admission.
Probe-specific operator notes: [CORPUS-COMPILE-THIRD-PROBES-v1.md](notes/CORPUS-COMPILE-THIRD-PROBES-v1.md).

## corpus-compile-v5-series-int-division-v1.pine

SHA256: `d0b0d478d19b7a548d3589e64f2489a34154f58401b5cf66a0bdf484ec8cc944`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: target, explicit_int_control, floor_control, unannotated_control.
Preserve first native diagnostic and phase/bar
If admitted capture all four outputs; controls cannot prove target admission
Question or prediction to discriminate (not a native verdict): Qualified v5 division preserves fractional remainder, but current migration guide also shows int seriesOffset=bar_index/2. Capture native assignment admission/phase without guessing coercion.
Stimulus: Isolated v5 integer declaration receiving qualified integer division; explicit int/floor/unannotated controls. Native admission and phase unobserved.

## corpus-compile-v5-simple-int-division-v1.pine

SHA256: `5067f0f8566a91a6e8b55d79ab9441c6b7264acfcf330c1b19679127631b0ebd`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: target, explicit_int_control, floor_control, unannotated_control.
Preserve first native diagnostic and phase/bar
If admitted capture all four outputs; controls cannot prove target admission
Question or prediction to discriminate (not a native verdict): Qualified v5 division preserves fractional remainder, but current migration guide also shows int seriesOffset=bar_index/2. Capture native assignment admission/phase without guessing coercion.
Stimulus: Isolated v5 integer declaration receiving qualified integer division; explicit int/floor/unannotated controls. Native admission and phase unobserved.

## corpus-continuous-session-boundaries-v5-v1.pine

SHA256: `95d590453f730366a7a29bed3c78e1079062e68f46f3c5f006c851e8ec5307c5`. Capture group: **numeric**. Declared Pine version: 5.

Load at least 3000 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: INDEX, CLOSE, TIME, DAY_OPEN, FIRST, FIRST_REGULAR, LAST, LAST_REGULAR, PREVIOUS_HIGH, PREVIOUS_LOW.
BINANCE:BTCUSDT standard2m UTC with at least3000 historical bars and INDEX0.
Preserve TIME/DAY_OPEN, all four flags and prior range including leading missing values.
Record syminfo timezone/session and chart regular/extended configuration; native outcome settles calendar root independently of synthetic provider.
Question or prediction to discriminate (not a native verdict): Observe exact native first/last flags across multiple continuous daily sessions; no numerical native outcome claimed.
Stimulus: Observe contiguous crypto daily session first/last flags and exact corpus852 prior-range logic. No assumed native daily cutpoint or last-bar verdict. Preserve full native CSV and source unchanged.

## corpus-continuous-session-boundaries-v6-v1.pine

SHA256: `29ecf55c61423cbf6cba97f1f986c8d91e2aa926bec26774435f040ace6228b9`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 3000 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: INDEX, CLOSE, TIME, DAY_OPEN, FIRST, FIRST_REGULAR, LAST, LAST_REGULAR, PREVIOUS_HIGH, PREVIOUS_LOW.
BINANCE:BTCUSDT standard2m UTC with at least3000 historical bars and INDEX0.
Preserve TIME/DAY_OPEN, all four flags and prior range including leading missing values.
Record syminfo timezone/session and chart regular/extended configuration; native outcome settles calendar root independently of synthetic provider.
Question or prediction to discriminate (not a native verdict): Observe exact native first/last flags across multiple continuous daily sessions; no numerical native outcome claimed.
Stimulus: Observe contiguous crypto daily session first/last flags and exact corpus852 prior-range logic. No assumed native daily cutpoint or last-bar verdict. Preserve full native CSV and source unchanged.

## corpus-gaps43-duplicate-method-distinct-control-v5.pine

SHA256: `6a04067473aa5f1f9786f16138d1ec0b65e53574aa7f86b8237d162215d72b0c`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Preserve source hash and native compile diagnostic screenshot
Exact-source success also must be recorded; controls do not settle exact-source admissibility
Question or prediction to discriminate (not a native verdict): Current manual prediction only; exact native observation is required by overseer before declaring corpus source invalid.
Stimulus: Exact corpus source or isolated scope/signature control. Native not observed. Preserve original source and first native diagnostic; do not fix source to achieve admission.
Probe-specific operator notes: [GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md](notes/GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md).

## corpus-gaps43-duplicate-method-exact-v5.pine

SHA256: `7ba22e4d2286acb6d0c7a51ca15c0b0c94d0549f4c9977634bcfc31e48c04937`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Preserve source hash and native compile diagnostic screenshot
Exact-source success also must be recorded; controls do not settle exact-source admissibility
Question or prediction to discriminate (not a native verdict): Current manual prediction only; exact native observation is required by overseer before declaring corpus source invalid.
Stimulus: Exact corpus source or isolated scope/signature control. Native not observed. Preserve original source and first native diagnostic; do not fix source to achieve admission.
Probe-specific operator notes: [GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md](notes/GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md).

## corpus-gaps43-local-udf-exact-v6.pine

SHA256: `e8015eb9373e922265ecc5079f1d7c247c6ef799f4f89b94198b828269c74396`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Preserve source hash and native compile diagnostic screenshot
Exact-source success also must be recorded; controls do not settle exact-source admissibility
Question or prediction to discriminate (not a native verdict): Current manual prediction only; exact native observation is required by overseer before declaring corpus source invalid.
Stimulus: Exact corpus source or isolated scope/signature control. Native not observed. Preserve original source and first native diagnostic; do not fix source to achieve admission.
Probe-specific operator notes: [GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md](notes/GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md).

## corpus-gaps43-local-udf-global-control-v6.pine

SHA256: `2a1404c55f83e97183785cec82c15b91c6248f24237f279444f05f5da6a91c97`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Preserve source hash and native compile diagnostic screenshot
Exact-source success also must be recorded; controls do not settle exact-source admissibility
Question or prediction to discriminate (not a native verdict): Current manual prediction only; exact native observation is required by overseer before declaring corpus source invalid.
Stimulus: Exact corpus source or isolated scope/signature control. Native not observed. Preserve original source and first native diagnostic; do not fix source to achieve admission.
Probe-specific operator notes: [GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md](notes/GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md).

## corpus-gaps43-local-udf-minimal-v6.pine

SHA256: `4ffd885ebdbb49e348e042dc9d7b28d658890e9841b3149be3164e043f0e2233`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Preserve source hash and native compile diagnostic screenshot
Exact-source success also must be recorded; controls do not settle exact-source admissibility
Question or prediction to discriminate (not a native verdict): Current manual prediction only; exact native observation is required by overseer before declaring corpus source invalid.
Stimulus: Exact corpus source or isolated scope/signature control. Native not observed. Preserve original source and first native diagnostic; do not fix source to achieve admission.
Probe-specific operator notes: [GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md](notes/GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md).

## corpus-length-atr-series-float-v6-v1.pine

SHA256: `9d42991c109fb386fb0347a73a80319d6d0bdfde61c2126d79f29c49ab5c53b5`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 40 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Keep b04c842703 refusal until TV settles these exact arguments. v56:484 source uses series int, so requested series-float probe alone cannot settle its qualifier-only consequence.
Staged-spec instructions: ["Exact compiler diagnostic if refused", "Runtime error/code/bar if admitted then fails", "CSV including OUTCOME if accepted and executes"]
Stimulus: Positive14.0/10.0 length, series float from mutation; float-kind and qualifier checks both relevant.

## corpus-length-atr-series-int-v6-v1.pine

SHA256: `774cff0a875f5602f584a5fe59326628bb75149c294c0f284a329a6aa51c829d`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 40 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Keep b04c842703 refusal until TV settles these exact arguments. v56:484 source uses series int, so requested series-float probe alone cannot settle its qualifier-only consequence.
Staged-spec instructions: ["Exact compiler diagnostic if refused", "Runtime error/code/bar if admitted then fails", "CSV including OUTCOME if accepted and executes"]
Stimulus: Positive14/10 series int from mutation; isolates simple qualifier ceiling without float-kind mismatch.

## corpus-length-sma-simple-float-v6-v1.pine

SHA256: `d22e6f126e8128e2b5f274588e395dceaab3cf7e5e4616940a6effc79ab253ab`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 40 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Keep b04c842703 refusal until TV settles these exact arguments. v56:484 source uses series int, so requested series-float probe alone cannot settle its qualifier-only consequence.
Staged-spec instructions: ["Exact compiler diagnostic if refused", "Runtime error/code/bar if admitted then fails", "CSV including OUTCOME if accepted and executes"]
Stimulus: Simple float SMA length, default3 on2m; isolates integer-valued float kind from invalid numeric length.

## corpus-matrix-remove_col-missing-index-v1.pine

SHA256: `2a8b8faa130c55771ed1908ba7a7dea68638bde86b50ee264e281b687bbd8100`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Capture unchanged source; preserve diagnostic and first runtime bar, or successful CSV.
Question or prediction to discriminate (not a native verdict): Missing-index behavior is not inferred from array.get or matrix.get. Observe exact source outcome.
Stimulus: Exact missing-index operation; capture diagnostic and first runtime bar, or successful CSV unchanged.

## corpus-matrix-swap_columns-missing-index-v1.pine

SHA256: `0c35b64206521a4f6bbeced7dea44c81dd259b1acbc8f6f2be3af39e0ddde773`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Capture unchanged source; preserve diagnostic and first runtime bar, or successful CSV.
Question or prediction to discriminate (not a native verdict): Missing-index behavior is not inferred from array.get or matrix.get. Observe exact source outcome.
Stimulus: Exact missing-index operation; capture diagnostic and first runtime bar, or successful CSV unchanged.

## corpus-table-text-wrap-control-v5-v1.pine

SHA256: `7cb75b06da98169599e0e9712165430b4d33d796ef43f56f59b1a97110ec2982`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: close.
First native diagnostic and phase; if admitted capture plot and table screenshot.
Control admission does not establish target admission.
Question or prediction to discriminate (not a native verdict): Positive documented setter control; same table and coordinate.
Stimulus: Positive documented setter control; same table and coordinate.

## corpus-table-text-wrap-control-v6-v1.pine

SHA256: `66f2aab2638df7fead47ff1ffa40253f70fa607c21dfd53651e03b0c31b71090`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: close.
First native diagnostic and phase; if admitted capture plot and table screenshot.
Control admission does not establish target admission.
Question or prediction to discriminate (not a native verdict): Positive documented setter control; same table and coordinate.
Stimulus: Positive documented setter control; same table and coordinate.

## corpus-table-text-wrap-v5-v1.pine

SHA256: `5bb44856f338a56bff85df1df5b4d9c1994fbde0028c4c42af5c8b61b78cd0b6`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: close.
First native diagnostic and phase; if admitted capture plot and table screenshot.
Control admission does not establish target admission.
Question or prediction to discriminate (not a native verdict): Populated valid cell isolates function availability from coordinate and missing-cell rules. Native phase unobserved.
Stimulus: Populated valid cell isolates function availability from coordinate and missing-cell rules. Native phase unobserved.

## corpus-table-text-wrap-v6-v1.pine

SHA256: `50713ee238ad762544abda07edd1110f30e02815a77e4c441930380486ddcbe5`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 20 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: close.
First native diagnostic and phase; if admitted capture plot and table screenshot.
Control admission does not establish target admission.
Question or prediction to discriminate (not a native verdict): Populated valid cell isolates function availability from coordinate and missing-cell rules. Native phase unobserved.
Stimulus: Populated valid cell isolates function availability from coordinate and missing-cell rules. Native phase unobserved.

## corpus5-v5-bb-zero-v1.pine

SHA256: `10cc32ae5b828cf1c83a324d84ede19130d596ff0f312f5a386239cb26c9d608`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Question or prediction to discriminate (not a native verdict): Record native compilation/runtime outcome and complete available values. Warmup target: preserve bars0..1001; zero target: preserve exact refusal phase/message or target values. Local readiness is not native evidence.
Stimulus: Isolated target with valid integer controls. Zero length is intentional target, never silently rewritten. No requests or array indexing.

## corpus5-v5-extrema-warmup1000-v1.pine

SHA256: `4e71d6380325c068c408a274842f871d80a47332a1030a44b3f6d62cb6897309`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 1200 confirmed historical bars; retain every plotted column and actual source index.
Question or prediction to discriminate (not a native verdict): Record native compilation/runtime outcome and complete available values. Warmup target: preserve bars0..1001; zero target: preserve exact refusal phase/message or target values. Local readiness is not native evidence.
Stimulus: Isolated target with valid integer controls. Zero length is intentional target, never silently rewritten. No requests or array indexing.

## corpus5-v5-sma-zero-v1.pine

SHA256: `48e898e2b4540054263a88fef9df77e5c67609dc1f81216d31080b5b0461dc65`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Question or prediction to discriminate (not a native verdict): Record native compilation/runtime outcome and complete available values. Warmup target: preserve bars0..1001; zero target: preserve exact refusal phase/message or target values. Local readiness is not native evidence.
Stimulus: Isolated target with valid integer controls. Zero length is intentional target, never silently rewritten. No requests or array indexing.

## corpus5-v6-exp-price-overflow-v1.pine

SHA256: `ab253584ddae18ab3d2c002cf77ef95d3024c2de39ff9a7e211c4c1db30cf894`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 100 confirmed historical bars; retain every plotted column and actual source index.
Question or prediction to discriminate (not a native verdict): Record exact runtime outcome or full target/control CSV. Do not infer v6 overflow representation from a v5-only target or local Infinity.
Stimulus: Actual corpus160/162 are v6, older shipped exp target was v5. Large-price exponential intentionally isolates nonfinite outcome; finite exp1 and na flag are controls. No requests or arrays.

## currency-constant-literal-values-v1.pine

SHA256: `028304f62c24c56df10cbc732d001e3b083fbab67c25af5905b15b1c9e0b4fab`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 12 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Stimulus: Forty constant-string targets reversibly encoded as three uppercase base26 digits; three literal controls. Preserve first-bar Pine logs for raw values, including any non-three-letter native values. No requests, inputs or invalid arguments.
Probe-specific operator notes: [currency-constant-literal-values-v1.capture-v1.md](notes/currency-constant-literal-values-v1.capture-v1.md).

## drawing-coordinate-backquant-float-x-v1.pine

SHA256: `6a7537b70ad28ad819cc93aa17a6367f6b8f11d79d039f270a70b76ceca6cff0`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Retain original Pine versions and default inputs. Record native compile diagnostic, source location and phase or exported drawing/plot result. Compare a separate explicit int() cast control if needed. These minimal sources isolate slot admission; full original-source acceptance must be recorded independently.
Case question/purpose: Does the unchanged version-specific floating expression compile in the documented integer coordinate slot? Record exact compiler diagnostic or runtime output; no admission predicted.

## drawing-coordinate-point-index-active-v5-length50-v1.pine

SHA256: `ffa5628632bebdaba2a8e5c6eb53cfbdb220fd503e136226cd8757284d744531`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: POINT_INDEX, CHART_INDEX, INPUT_TIME.
Staged-spec instructions: Retain original Pine versions and default inputs. Record native compile diagnostic, source location and phase or exported drawing/plot result. Compare a separate explicit int() cast control if needed. These minimal sources isolate slot admission; full original-source acceptance must be recorded independently.
Case question/purpose: Active point index output avoids an unused constructor; retain int input qualifier. Observe compile refusal or actual POINT_INDEX/CHART_INDEX vector, including nonintegral51 control. No implicit conversion policy assumed.

## drawing-coordinate-point-index-active-v5-length51-v1.pine

SHA256: `e34138eb126b476e220cdfabe3f1551781d09ac35a99afdc6f7d1a0487d5e0ff`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: POINT_INDEX, CHART_INDEX, INPUT_TIME.
Staged-spec instructions: Retain original Pine versions and default inputs. Record native compile diagnostic, source location and phase or exported drawing/plot result. Compare a separate explicit int() cast control if needed. These minimal sources isolate slot admission; full original-source acceptance must be recorded independently.
Case question/purpose: Active point index output avoids an unused constructor; retain int input qualifier. Observe compile refusal or actual POINT_INDEX/CHART_INDEX vector, including nonintegral51 control. No implicit conversion policy assumed.

## drawing-coordinate-profile-float-right-v1.pine

SHA256: `26fcaadce0aebc1e20634f983e394bbd48dab6c2857d309dde8eb14a85167518`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Retain original Pine versions and default inputs. Record native compile diagnostic, source location and phase or exported drawing/plot result. Compare a separate explicit int() cast control if needed. These minimal sources isolate slot admission; full original-source acceptance must be recorded independently.
Case question/purpose: Does the unchanged version-specific floating expression compile in the documented integer coordinate slot? Record exact compiler diagnostic or runtime output; no admission predicted.

## drawing-coordinate-sabres-input-division-v1.pine

SHA256: `4cfcf8d804c92e16ca4b385f5dd684dafa761a2aeecaa217115da4181d831808`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Retain original Pine versions and default inputs. Record native compile diagnostic, source location and phase or exported drawing/plot result. Compare a separate explicit int() cast control if needed. These minimal sources isolate slot admission; full original-source acceptance must be recorded independently.
Case question/purpose: Does the unchanged version-specific floating expression compile in the documented integer coordinate slot? Record exact compiler diagnostic or runtime output; no admission predicted.

## drawing-default-blue-v5-v2.pine

SHA256: `b4bc6878af440096452e0a6576c9ff2d001af0a5054c71de75e76fa07d8c57c1`. Capture group: **screenshot**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: OUTCOME.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Retain unmodified source and exact compile/runtime outcome. Export OUTCOME close as anchor control.
Capture screenshot with all five rows and four columns visible: DEFAULT, color.blue, #2196F3, #2962FF. Do not derive drawing colors from OUTCOME; it is only an execution/price control.
Rows isolate coordinate/point box border and background defaults, plus polyline line_color. Record browser/theme/background and lossless screenshot. Exact pixel dimensions are not under test.
v2 is registered for v5 capture per overseer routing; identical constructor comparisons to immutable v4 originals, only indicator title version changes.
Question or prediction to discriminate (not a native verdict): Reference predicts omitted border_color/bgcolor/line_color match color.blue. Native explicit-v6 CF009 alone is not an omitted-default capture. Capture actual side-by-side colors without choosing either literal in advance.
Stimulus: 20 drawing references allocated once at last bar, 20 explicit text-only labels, finite last-bar close coordinates; one plot execution control. No requests, ID comparisons or per-bar allocation.

## drawing-default-blue-v6-v2.pine

SHA256: `eabb8499d58e33aa4f2d0f7158cb8d125fb30ca503a880555f927ec0cd3cbb27`. Capture group: **screenshot**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: OUTCOME.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Retain unmodified source and exact compile/runtime outcome. Export OUTCOME close as anchor control.
Capture screenshot with all five rows and four columns visible: DEFAULT, color.blue, #2196F3, #2962FF. Do not derive drawing colors from OUTCOME; it is only an execution/price control.
Rows isolate coordinate/point box border and background defaults, plus polyline line_color. Record browser/theme/background and lossless screenshot. Exact pixel dimensions are not under test.
v2 is registered for v5 capture per overseer routing; identical constructor comparisons to immutable v4 originals, only indicator title version changes.
Question or prediction to discriminate (not a native verdict): Reference predicts omitted border_color/bgcolor/line_color match color.blue. Native explicit-v6 CF009 alone is not an omitted-default capture. Capture actual side-by-side colors without choosing either literal in advance.
Stimulus: 20 drawing references allocated once at last bar, 20 explicit text-only labels, finite last-bar close coordinates; one plot execution control. No requests, ID comparisons or per-bar allocation.

## drawing-future-index-first-last-v1.pine

SHA256: `c63b8704de16e05496a105a47039335eafb836e9ce63dd4d2bc09563c664dde3`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 600 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Stimulus: One first-bar line only; preserve native outcome, error phase and exact failing bar. Distinguishes current-bar versus chart-last-bar future-limit reference and deferred validation; native v3 perbar501 failed only near last historical bar, while current docs say relative to drawing bar. No prediction of native verdict.

## drawing-future-index-first-local-v1.pine

SHA256: `3a4c0743e976160a9b6e352feea6522a5d33a5d44ff72f88dc4e531626e20825`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 600 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Stimulus: One first-bar line only; preserve native outcome, error phase and exact failing bar. Distinguishes current-bar versus chart-last-bar future-limit reference and deferred validation; native v3 perbar501 failed only near last historical bar, while current docs say relative to drawing bar. No prediction of native verdict.

## drawing-method-distinct-v5-control-v1.pine

SHA256: `db1fc63dee03de48f6b3e6a17a6053fa89182fa02a2a6dfcc8f99f3972b98c34`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "minimumConfirmedBars": 32}.
Staged-spec instructions: Paste unchanged sources separately into TV. Record exact compile/runtime diagnostic with location and phase, or export every plot. Compare invoked SELECTED_BODY=10 vs11 without preselecting either. Exact fixture acceptance alone does not settle invoked replacement.
Case question/purpose: Distinct arity control; manual permits this overload, columns distinguish both bodies.

## drawing-method-identical-v5-invoked-v1.pine

SHA256: `d4ecb67b99abd0fcc859f3b5133f2ef6f33e7755f827bd08fcbda8f9f55a21cd`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "minimumConfirmedBars": 32}.
Staged-spec instructions: Paste unchanged sources separately into TV. Record exact compile/runtime diagnostic with location and phase, or export every plot. Compare invoked SELECTED_BODY=10 vs11 without preselecting either. Exact fixture acceptance alone does not settle invoked replacement.
Case question/purpose: Same signatures with distinct bodies and an invocation; determine refusal versus selection without assuming first or last wins.

## drawing-method-identical-v56-1376-exact-v1.pine

SHA256: `7ba22e4d2286acb6d0c7a51ca15c0b0c94d0549f4c9977634bcfc31e48c04937`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "minimumConfirmedBars": 32}.
Staged-spec instructions: Paste unchanged sources separately into TV. Record exact compile/runtime diagnostic with location and phase, or export every plot. Compare invoked SELECTED_BODY=10 vs11 without preselecting either. Exact fixture acceptance alone does not settle invoked replacement.
Case question/purpose: Exact unchanged non-TV fixture; record native compile outcome, no call selection is observable.

## float-equality-nonzero-discriminator-v3.pine

SHA256: `9780d704a83e9ecf4b80724b5cc63ae49054fcec68b05949e971f86145bb09f3`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 112 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: PHASE, EQ, NE, LT, LE, GT, GE, ABS_DIFF_SCALED, input_time, input_bar_index, input_close, x_scaled_1e10, x_eq_zero, x_neq_zero, zero_eq_x, zero_neq_x, normalized_scaled_1e10, normalized_eq_zero, normalized_neq_zero, literal_eq_zero, literal_neq_zero, x_na.
Export all22 mapped columns from unchanged source, at least112 bars beginning index0. Preserve timestamps/source hash/compile-runtime diagnostics. This single probe supersedes the v2 discriminator and direct-boundary v1 registration.
Question or prediction to discriminate (not a native verdict): Native outputs unobserved. Compare manual nine-digit quantization and tolerance predictions independently for nonzero pairs, literal/normalized/dynamic zero operands, both operand orders and individual comparison operators. No local output is a native verdict.
Stimulus: Sixteen-phase zero/nonzero comparison controls plus exact direct x=close*2e-10, normalized (close/close)*2e-10, literal and either-order ==/!= controls.22 plots, no requests. Preserve input time/index/close/scaled operands and missing flag; native comparator outcomes unobserved.

## fractional-int-division-const-control-v1.pine

SHA256: `b11eaa62dcf9da3d2b150ac5f9b45d1c467d882d59454dbd1b6ceafdd29a394d`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: control: const qualifier

## fractional-int-division-explicit-cast-control-v1.pine

SHA256: `607325515ca02368831d1ee51c28b00af77c4ef58703deb45f7da0078184b65b`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: control: explicit conversion; keep separate from implicit assignment

## fractional-int-division-float-control-v1.pine

SHA256: `0599362b0f0e6f2b48cd9fdd051a6a277c9d9d48012f8205137ed88d17110ed0`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: control: float operand; supplied chart has nonzero close

## fractional-int-division-input-control-v1.pine

SHA256: `0be552431104ad91c6be4da8bceab266a3c2907710efe5dc948ab17848a30e89`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: control: input qualifier, preserve default5

## fractional-int-division-series-negative-v1.pine

SHA256: `5ccc81574d4cd8f5556d82d7133fc37ac1ae50fc67e2131c5f0dfc544629deaa`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: primary: series integer operands with negative half quotients

## fractional-int-division-series-positive-v1.pine

SHA256: `846ebaee826838aa88985f8e6fbc2f85f77bfbc65b7845d3787b658834f3a976`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: primary: series integer operands with positive half quotients

## fractional-int-division-simple-negative-v1.pine

SHA256: `33fa321ba02b132ae2efca8ce486858634896cc18b62f6b698d861b9ed94e3c3`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: primary: simple integer operands with negative half quotients

## fractional-int-division-simple-positive-v1.pine

SHA256: `447b38266dcdd6dd8ebe87b8c248a4d51621370026f753438edcef7e9a4c9369`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults only; no edited values or source repairs"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR, RAW, ASSIGNED, RESIDUAL.
Staged-spec instructions: ["Run each source independently and unchanged; a compile refusal in one case must not hide other contexts.", "Verify indicator title and SHA256. Record exact compile/runtime error text, code if exposed, line/column and screenshot when refused.", "When accepted, export all five columns and at least32 confirmed historical bars; retain raw CSV, blanks and live-bar cutoff. Numerator is recorded directly; do not infer Pine bar_index from CSV row number.", "Capture ASSIGNED and RAW independently, plus residual. Positive5/2 and negative-5/2 discriminate fraction preservation, truncation and signed rounding; the7/-7 alternatives retain distinct witnesses if phase/runtime context differs.", "Do not insert int() into primary cases to make them compile. The explicit-cast source is an independent control.", "Const/input/float cases are controls for qualifier/kind generalization, not assumed invalid or valid. Preserve their observed phase."]
Case question/purpose: primary: simple integer operands with positive half quotients

## ledger47-zero-div-v5-compound-zero-v1.pine

SHA256: `c5de25080e3ee41186414b4fa5e41be518045cf184b3ad9c5b32e3c378007728`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: Compound /= remains an independent target

## ledger47-zero-div-v5-dynamic-negative-zero-v1.pine

SHA256: `a805da2449743d9bf19e3d0c5e9d110cd5d8c3bceb651e1b5440da9ac46055cf`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: Negated runtime zero; retain unary minus

## ledger47-zero-div-v5-dynamic-positive-zero-v1.pine

SHA256: `4b3330d4f5920fa44d2ccf4f3fdb2e4b640d1e68487863f5cfbc6b1e827b3972`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: Runtime +0 from identical finite source values

## ledger47-zero-div-v5-finite-control-v1.pine

SHA256: `9771856344ebcf270c9f5542f7466c2d6e6f9002487eb590295555e6f0c5d59d`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: Independent admitted finite float division control

## ledger47-zero-div-v5-literal-negative-zero-v1.pine

SHA256: `667c51db28ae47d343148d07893bd217064ee982830cf7c48a30d6470a90a8e6`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: Runtime source divided by literal -0.0; retain spelling

## ledger47-zero-div-v5-literal-positive-zero-v1.pine

SHA256: `16ed7d48e7718f030245ff85b887edb29e5d69c8d66c7127dad1570d6f3c4af9`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: Runtime source divided by literal +0.0

## ledger47-zero-div-v5-missing-numerator-control-v1.pine

SHA256: `3a06ad2800003911fda5f13807c3225f0df7d34b3190eb9528c4b8cea212a3e6`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: Independent missing-numerator control; not zero-denominator evidence

## ledger47-zero-div-v5-udf-zero-v1.pine

SHA256: `ec2f93dbf2de2548fcc274ca69c86aea341e3a14a264725e3ebdbfc38392893c`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 32 confirmed historical bars; retain every plotted column and actual source index.
Specific chart/input settings: {"ticker": "BINANCE:BTCUSDT", "timeframe": "2", "chartType": "standard candles", "timezone": "Etc/UTC", "inputs": "Defaults; unchanged source"}.
Expected export headers to retain: INPUT_TIME, NUMERATOR_CLOSE, RAW, IS_NA, NZ_42.
Staged-spec instructions: ["Run every source independently and unchanged. A literal-zero compile or runtime refusal must not hide dynamic/UDF/compound targets.", "Verify source SHA256 and indicator title. If refused, retain exact error text, code, line/column, screenshot and execution phase. Do not repair the source.", "If it runs, export all five plots and at least32 confirmed historical bars. Preserve original headers, timestamps, blank masks and realtime cutoff.", "RAW blank alone does not discriminate na from an unplottable infinite result. IS_NA and NZ_42 are independent observable discriminators; preserve exact values.", "A na result would show IS_NA=1/NZ_42=42; another observed result or diagnostic must be recorded as-is. These are competing predictions, not native outcomes.", "Keep finite/missing-numerator controls separate. They do not settle a zero denominator.", "Pine may normalize signed zero; retain both literal spellings and runtime constructions without claiming a bit-level sign is observable."]
Case question/purpose: UDF runtime denominator, separate from root division

## percentile-hole-linear_interpolation-len14-p25-v1.pine

SHA256: `53072e3396c9f80a2dd2d4b91ae5e8d121070aad3ae727ab823c459c5b253f3f`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_bar_index, input_time, input_close, input_source, input_missing, percentile_linear_interpolation_len14_pct25_hole40_41, clean_control.
Staged-spec instructions: {"symbol": "BINANCE:BTCUSDT", "timeframe": "2 minutes", "chart": "standard candles, UTC", "minimumConfirmedHistoricalRows": 256, "start": "script input_bar_index0", "export": "all plots, raw CSV with timestamps, original headers and blank NA cells", "diagnostics": "retain complete compiler/runtime messages and first error bar if any", "calls": "every written builtin call executes unconditionally on every bar", "comparison": "exclude the last unconfirmed bar; compare finite/missing masks separately from decimal rounding", "historyMatching": "The four close-source targets require identical original source rows for a direct v2 comparison. Retain all new chart inputs if the original chart start cannot be reproduced."}
Case question/purpose: ['For every confirmed historical bar, does the target emit a finite number or NA? Preserve empty CSV cells; do not coerce them to zero.', 'What exact value is emitted on current missing-source bars, while missing slots remain in the physical window, and on the first recovery bars?', 'Does the finite/missing mask and each finite target value agree with the original v2 target after matching input_bar_index and close inputs? If the chart history differs, retain the new OHLC source and classify as a new stimulus, not disagreement.', 'Does the clean control remain finite after normal startup and follow the unchanged length/percentage contract?']
Save untouched source and full raw CSV, including empty NA cells.
Retain compiler/runtime diagnostics, input timestamps and chart start.
Inspect requested hole and recovery bars; do not infer missing results from local engine output.
Question or prediction to discriminate (not a native verdict): Native result unobserved. Capture exact finite/missing masks and values; clean control is a stimulus control, not a predicted native vector.
Stimulus: Unconditional fixed positive integer length and literal percentage25/75; deliberate two-bar missing source plus clean control. Seven constant-color plots, no requests or invalid argument domain. Preserve original chart start and full input columns.

## percentile-hole-linear_interpolation-len14-p75-v1.pine

SHA256: `75c0248f5e8cdc8ae4395cb6e504d911abe587e34b144949d735ed8e68da3414`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_bar_index, input_time, input_close, input_source, input_missing, percentile_linear_interpolation_len14_pct75_hole40_41, clean_control.
Staged-spec instructions: {"symbol": "BINANCE:BTCUSDT", "timeframe": "2 minutes", "chart": "standard candles, UTC", "minimumConfirmedHistoricalRows": 256, "start": "script input_bar_index0", "export": "all plots, raw CSV with timestamps, original headers and blank NA cells", "diagnostics": "retain complete compiler/runtime messages and first error bar if any", "calls": "every written builtin call executes unconditionally on every bar", "comparison": "exclude the last unconfirmed bar; compare finite/missing masks separately from decimal rounding", "historyMatching": "The four close-source targets require identical original source rows for a direct v2 comparison. Retain all new chart inputs if the original chart start cannot be reproduced."}
Case question/purpose: ['For every confirmed historical bar, does the target emit a finite number or NA? Preserve empty CSV cells; do not coerce them to zero.', 'What exact value is emitted on current missing-source bars, while missing slots remain in the physical window, and on the first recovery bars?', 'Does the finite/missing mask and each finite target value agree with the original v2 target after matching input_bar_index and close inputs? If the chart history differs, retain the new OHLC source and classify as a new stimulus, not disagreement.', 'Does the clean control remain finite after normal startup and follow the unchanged length/percentage contract?']
Save untouched source and full raw CSV, including empty NA cells.
Retain compiler/runtime diagnostics, input timestamps and chart start.
Inspect requested hole and recovery bars; do not infer missing results from local engine output.
Question or prediction to discriminate (not a native verdict): Native result unobserved. Capture exact finite/missing masks and values; clean control is a stimulus control, not a predicted native vector.
Stimulus: Unconditional fixed positive integer length and literal percentage25/75; deliberate two-bar missing source plus clean control. Seven constant-color plots, no requests or invalid argument domain. Preserve original chart start and full input columns.

## percentile-hole-linear_interpolation-len4-p75-v1.pine

SHA256: `53b257187796099d667dc44d2a33cc4d04a42d54be740695a314e86c7aa469b8`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_bar_index, input_time, input_close, input_source, input_missing, linear_hole_builtin, clean_control.
Staged-spec instructions: {"symbol": "BINANCE:BTCUSDT", "timeframe": "2 minutes", "chart": "standard candles, UTC", "minimumConfirmedHistoricalRows": 256, "start": "script input_bar_index0", "export": "all plots, raw CSV with timestamps, original headers and blank NA cells", "diagnostics": "retain complete compiler/runtime messages and first error bar if any", "calls": "every written builtin call executes unconditionally on every bar", "comparison": "exclude the last unconfirmed bar; compare finite/missing masks separately from decimal rounding", "historyMatching": "The four close-source targets require identical original source rows for a direct v2 comparison. Retain all new chart inputs if the original chart start cannot be reproduced."}
Case question/purpose: ['For every confirmed historical bar, does the target emit a finite number or NA? Preserve empty CSV cells; do not coerce them to zero.', 'What exact value is emitted on current missing-source bars, while missing slots remain in the physical window, and on the first recovery bars?', 'Does the finite/missing mask and each finite target value agree with the original v2 target after matching input_bar_index and close inputs? If the chart history differs, retain the new OHLC source and classify as a new stimulus, not disagreement.', 'Does the clean control remain finite after normal startup and follow the unchanged length/percentage contract?']
Save untouched source and full raw CSV, including empty NA cells.
Retain compiler/runtime diagnostics, input timestamps and chart start.
Inspect requested hole and recovery bars; do not infer missing results from local engine output.
Question or prediction to discriminate (not a native verdict): Native result unobserved. Capture exact finite/missing masks and values; clean control is a stimulus control, not a predicted native vector.
Stimulus: Unconditional fixed positive integer length and literal percentage25/75; deliberate two-bar missing source plus clean control. Seven constant-color plots, no requests or invalid argument domain. Preserve original chart start and full input columns.

## percentile-hole-nearest_rank-len14-p25-v1.pine

SHA256: `d778cd8fe30793bc831a1b1b6696482b7cd4e8834f28950f67d5d3046732b0f8`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_bar_index, input_time, input_close, input_source, input_missing, percentile_nearest_rank_len14_pct25_hole40_41, clean_control.
Staged-spec instructions: {"symbol": "BINANCE:BTCUSDT", "timeframe": "2 minutes", "chart": "standard candles, UTC", "minimumConfirmedHistoricalRows": 256, "start": "script input_bar_index0", "export": "all plots, raw CSV with timestamps, original headers and blank NA cells", "diagnostics": "retain complete compiler/runtime messages and first error bar if any", "calls": "every written builtin call executes unconditionally on every bar", "comparison": "exclude the last unconfirmed bar; compare finite/missing masks separately from decimal rounding", "historyMatching": "The four close-source targets require identical original source rows for a direct v2 comparison. Retain all new chart inputs if the original chart start cannot be reproduced."}
Case question/purpose: ['For every confirmed historical bar, does the target emit a finite number or NA? Preserve empty CSV cells; do not coerce them to zero.', 'What exact value is emitted on current missing-source bars, while missing slots remain in the physical window, and on the first recovery bars?', 'Does the finite/missing mask and each finite target value agree with the original v2 target after matching input_bar_index and close inputs? If the chart history differs, retain the new OHLC source and classify as a new stimulus, not disagreement.', 'Does the clean control remain finite after normal startup and follow the unchanged length/percentage contract?']
Save untouched source and full raw CSV, including empty NA cells.
Retain compiler/runtime diagnostics, input timestamps and chart start.
Inspect requested hole and recovery bars; do not infer missing results from local engine output.
Question or prediction to discriminate (not a native verdict): Native result unobserved. Capture exact finite/missing masks and values; clean control is a stimulus control, not a predicted native vector.
Stimulus: Unconditional fixed positive integer length and literal percentage25/75; deliberate two-bar missing source plus clean control. Seven constant-color plots, no requests or invalid argument domain. Preserve original chart start and full input columns.

## percentile-hole-nearest_rank-len14-p75-v1.pine

SHA256: `3feff77726fad1b5c5a6189b99b985659a173369099c0cec9e66a16a9d681280`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_bar_index, input_time, input_close, input_source, input_missing, percentile_nearest_rank_len14_pct75_hole40_41, clean_control.
Staged-spec instructions: {"symbol": "BINANCE:BTCUSDT", "timeframe": "2 minutes", "chart": "standard candles, UTC", "minimumConfirmedHistoricalRows": 256, "start": "script input_bar_index0", "export": "all plots, raw CSV with timestamps, original headers and blank NA cells", "diagnostics": "retain complete compiler/runtime messages and first error bar if any", "calls": "every written builtin call executes unconditionally on every bar", "comparison": "exclude the last unconfirmed bar; compare finite/missing masks separately from decimal rounding", "historyMatching": "The four close-source targets require identical original source rows for a direct v2 comparison. Retain all new chart inputs if the original chart start cannot be reproduced."}
Case question/purpose: ['For every confirmed historical bar, does the target emit a finite number or NA? Preserve empty CSV cells; do not coerce them to zero.', 'What exact value is emitted on current missing-source bars, while missing slots remain in the physical window, and on the first recovery bars?', 'Does the finite/missing mask and each finite target value agree with the original v2 target after matching input_bar_index and close inputs? If the chart history differs, retain the new OHLC source and classify as a new stimulus, not disagreement.', 'Does the clean control remain finite after normal startup and follow the unchanged length/percentage contract?']
Save untouched source and full raw CSV, including empty NA cells.
Retain compiler/runtime diagnostics, input timestamps and chart start.
Inspect requested hole and recovery bars; do not infer missing results from local engine output.
Question or prediction to discriminate (not a native verdict): Native result unobserved. Capture exact finite/missing masks and values; clean control is a stimulus control, not a predicted native vector.
Stimulus: Unconditional fixed positive integer length and literal percentage25/75; deliberate two-bar missing source plus clean control. Seven constant-color plots, no requests or invalid argument domain. Preserve original chart start and full input columns.

## percentile-rank-readout-v1.pine

SHA256: `ad748e178a99fa681eae9f00304d19bb793bdf09ab6dd4bb971a5ddfe78f15ad`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Staged-spec instructions: {"symbol": "BINANCE:BTCUSDT", "timeframe": "2 minutes", "chart": "standard candles, UTC", "minimumConfirmedHistoricalRows": 256, "start": "script input_bar_index0", "export": "all plots, raw CSV with timestamps, original headers and blank NA cells", "diagnostics": "retain complete compiler/runtime messages and first error bar if any", "calls": "every written builtin call executes unconditionally on every bar", "comparison": "exclude the last unconfirmed bar; compare finite/missing masks separately from decimal rounding", "historyMatching": "The four close-source targets require identical original source rows for a direct v2 comparison. Retain all new chart inputs if the original chart start cannot be reproduced."}
Case question/purpose: ['Read all fourteen nearest-rank positions on each phase20/21 hole and recovery bar, including the second repeating cycle. Which ranks contain NA, and how do their positions move on eviction?', 'Compare fourteen linear positions with nearest positions from the same source/window. Does each method hold the same rank order or a different one?', 'At p75 with length14 (zero interpolation fraction), does a missing adjacent rank poison linear output while nearest remains finite?', 'For leading missing slots, retain rank positions before and after the first full physical window; do not infer interior-hole policy from startup alone.']
Stimulus: Unconditional fixed length14 percentile calls, finite literal percentages strictly inside0..100. Clean, first-five-missing and recurring two-bar-hole synthetic sources; no requests, invalid arguments or dynamic lengths.
Probe-specific operator notes: [PERCENTILE-RANK-READOUT-v1.md](notes/PERCENTILE-RANK-READOUT-v1.md).

## rci-missing-sign-discriminator-v1.pine

SHA256: `555e8f46c934824e534d781da79e1a8ece78c00e19158b198658057ea48f788f`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Stimulus: Unconditional RCI with fixed positive integer lengths4/14; exact finite positive/negative/crossing sources, intentional missing variants; no requests or invalid arguments.
Probe-specific operator notes: [RCI-MISSING-SIGN-DISCRIMINATOR-v1.md](notes/RCI-MISSING-SIGN-DISCRIMINATOR-v1.md).

## row1654-explicit-int-control-v1.pine

SHA256: `b930c1143fa285a8ece85b54a31ab54a522266e5bb9705e5f258b7091a191984`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Explicit integer controls must compile in v5; establish API/control path without asserting the unchanged target kind.

## row1654-label-timeframe-division-v1.pine

SHA256: `70c812965639a6e8a70befdd635e29850b276243175f176db0233386c0de77fc`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Does v5 admit the original arithmetic as label.new x? Record exact diagnostic separately; do not generalize from line admission.

## row1654-line-timeframe-division-v1.pine

SHA256: `83022a368f0b48b4912cfebe7b5fe3653738b8a5e05ca26382fa744a93d49eed`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Does v5 admit the original loop/index arithmetic as line.new x1/x2? Record exact diagnostic independently from the TA call. Run two-minute and seven-minute charts if admitted; no glyph-position parity assertion.

## row1654-lowest-timeframe-division-v1.pine

SHA256: `daf522ddcb753a60cab9021fc3769aed70fafaa5a72d0f4d940a4331f94862c2`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Does v5 admit simple timeframe.multiplier integer division into ta.lowest length? Save exact diagnostic if rejected; if accepted export target/explicit_int_control/division_value on two-minute and seven-minute charts to distinguish truncation/fractional policy.

## row1654-original-v1.pine

SHA256: `114e422f2fff6c14a67c2d4ac39754ee34a9f38853f842a61de2d40e4bbae806`. Capture group: **outcome**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Capture exact unchanged whole-source native acceptance independently from all minimal variants; preserve complete diagnostics or all exported plots. Do not infer whole-source validity from a minimal control.
Probe-specific operator notes: [corpus390-1654-SPEC-v1.md](notes/corpus390-1654-SPEC-v1.md).

## row390-explicit-int-control-v1.pine

SHA256: `4e7127e3ef48f7d73403f0aaa115b8dbf256aa23b23e599f1e767fb64d453ec8`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Explicit int-cast positive control must compile; distinguish drawing API availability from inferred return kind.

## row390-label-new-midpoint-v1.pine

SHA256: `0d5a0a6829e11e6b086c8ebe054f575b7439326112c843ec1b5666832ebc23a1`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Does v6 accept the unchanged mixed-branch UDF result as label.new x? Record exact diagnostic if rejected. If accepted, record actual x for Left/Center/Right with two-minute bars (or label.get_x in a follow-up), not a whole-source validity ruling.

## row390-label-set-x-midpoint-v1.pine

SHA256: `1ea87e3c8987ddb2ce0e7ce4717d9a1c1154d1f648ec42044900889f9a5b081f`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Does v6 accept the same UDF result at label.set_x x? Record compiler diagnostic independently from label.new. Acceptance does not settle other original diagnostics.

## row390-original-v1.pine

SHA256: `5feaafffa8cc030d94161b47c821c8635cea9a5970830fb3a6411f996b61888c`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Staged-spec instructions: Run row390 independently with default Right, then Center and Left; retain each exact outcome. Run row1654 independently on 2-minute and 7-minute standard BTCUSDT charts with defaults. Save each refusal independently; controls cannot substitute for targets.
Case question/purpose: Capture exact unchanged whole-source native acceptance independently from all minimal variants; preserve complete diagnostics or all exported plots. Do not infer whole-source validity from a minimal control.
Probe-specific operator notes: [corpus390-1654-SPEC-v1.md](notes/corpus390-1654-SPEC-v1.md).

## supertrend-factor-alone-first3-v1.pine

SHA256: `cd4c4ee7b2d6f865fba61f52b360d0bfc68f23ab71bc8700827511f4e73dcb97`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_time_ms, input_bar_index, input_open, input_high, input_low, input_close, input_volume, input_factor, dynamic_line, dynamic_direction.
Question or prediction to discriminate (not a native verdict): Series numeric factor admission is documented; exact factor update/retention and cross-call sharing require native evidence. No numerical model is presumed.
Stimulus: Constant positive ATR period3; series factor alternates literal positive floats2/3; calls execute unconditionally each bar; no requests, input changes, NA holes or error probes.
Probe-specific operator notes: [SUPERTREND-FACTOR-PROBES-v1.md](notes/SUPERTREND-FACTOR-PROBES-v1.md).

## supertrend-factor-alone-v1.pine

SHA256: `ddcbaaee153d6f33693fdd3b2ee285e1422bd5fb71ce653620f80dedcd724885`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_time_ms, input_bar_index, input_open, input_high, input_low, input_close, input_volume, input_factor, dynamic_line, dynamic_direction.
Question or prediction to discriminate (not a native verdict): Series numeric factor admission is documented; exact factor update/retention and cross-call sharing require native evidence. No numerical model is presumed.
Stimulus: Constant positive ATR period3; series factor alternates literal positive floats2/3; calls execute unconditionally each bar; no requests, input changes, NA holes or error probes.
Probe-specific operator notes: [SUPERTREND-FACTOR-PROBES-v1.md](notes/SUPERTREND-FACTOR-PROBES-v1.md).

## supertrend-factor-paired-fixed2-v1.pine

SHA256: `d21cdc8ae28b7e646846c421c848b6d6795314827bf8641b901fe36eb302d879`. Capture group: **numeric**. Declared Pine version: 6.

Load at least 256 confirmed historical bars; retain every plotted column and actual source index.
The export must include script bar_index 0.
Expected export headers to retain: input_time_ms, input_bar_index, input_open, input_high, input_low, input_close, input_volume, input_factor, dynamic_line, dynamic_direction, fixed2_line, fixed2_direction.
Question or prediction to discriminate (not a native verdict): Series numeric factor admission is documented; exact factor update/retention and cross-call sharing require native evidence. No numerical model is presumed.
Stimulus: Constant positive ATR period3; series factor alternates literal positive floats2/3; calls execute unconditionally each bar; no requests, input changes, NA holes or error probes.
Probe-specific operator notes: [SUPERTREND-FACTOR-PROBES-v1.md](notes/SUPERTREND-FACTOR-PROBES-v1.md).

## trace-accdist-host-missing-v1.pine

SHA256: `79a500069d2befbaa9f956182e982cd318bb63a8e8d9d2b8f659d05864bf5a23`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: ACCDIST, ACCDIST_MISSING, VOLUME_MISSING, PRICE_MISSING, FLAT_RANGE.
Keep original OHLCV; seek instruments/bars with native missing volume or flat price ranges. Without qualifying bars, retain TRACE-REQUIRED rather than infer recovery.
Export every unchanged plotted channel, native missing cells, timestamps, full compile/runtime diagnostics and exact source hash.
Builtin OHLCV cannot be replaced by an artificial source. Capture the unchanged script on standard instruments with native unavailable volume/flat ranges if available. Absent qualifying native bars, hole/recovery remains TRACE-REQUIRED.
Question or prediction to discriminate (not a native verdict): Builtin OHLCV cannot be replaced by an artificial source. Capture the unchanged script on standard instruments with native unavailable volume/flat ranges if available. Absent qualifying native bars, hole/recovery remains TRACE-REQUIRED.
Stimulus: Bounded native values/predicates; no requests or source repairs. Provider eligibility recorded separately.

## trace-corporate-eps-revenue-exdate-v1.pine

SHA256: `3713a67f59f76a6b0ddd69af1c6b51b57c065ebbb34a5d68d9d282344c2e51fb`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: EPS, EPS_MISSING, REVENUE, REVENUE_MISSING, EX_DATE, EX_DATE_MISSING.
Also run on a supported equity such as NASDAQ:AAPL. Record equity symbol/currency and initial-calculation time; capture fresh recalculation separately. BTCUSDT missing provider fields do not settle supported-equity values.
Export every unchanged plotted channel, native missing cells, timestamps, full compile/runtime diagnostics and exact source hash.
Provider values/availability are unobserved. Export unchanged future EPS/revenue/ex-date and masks on a supported equity; record symbol/currency/initial-calculation time and fresh recalculation separately. No fabricated event or guessed live forecast.
Question or prediction to discriminate (not a native verdict): Provider values/availability are unobserved. Export unchanged future EPS/revenue/ex-date and masks on a supported equity; record symbol/currency/initial-calculation time and fresh recalculation separately. No fabricated event or guessed live forecast.
Stimulus: Bounded native values/predicates; no requests or source repairs. Provider eligibility recorded separately.

## trace-matrix-predicate-epsilon-v1.pine

SHA256: `b6f13be8a1990dc708a6df05aec2d4d3ffddeb36b17aab7f3d6b1aebcede547d`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: PHASE, VALUE, ZERO_POSITIVE, ZERO_NEGATIVE, BINARY_NEAR_ONE.
Export every unchanged plotted channel, native missing cells, timestamps, full compile/runtime diagnostics and exact source hash.
Numeric predicate tolerance is unobserved. Sweep exact0 and1 controls plus1e-15..1e-6 perturbations; preserve source literals and CSV outputs rather than choosing a tolerance.
Question or prediction to discriminate (not a native verdict): Numeric predicate tolerance is unobserved. Sweep exact0 and1 controls plus1e-15..1e-6 perturbations; preserve source literals and CSV outputs rather than choosing a tolerance.
Stimulus: Bounded native values/predicates; no requests or source repairs. Provider eligibility recorded separately.

## trace-max-all-na-seed-v1.pine

SHA256: `e5479d200d0ab2799d4b4f5f47c01ccab22bbd7ec2fb8edfd91fc63962af18a8`. Capture group: **outcome**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: ALL_VALUE, ALL_MISSING, LEADING_VALUE, LEADING_MISSING.
Export every unchanged plotted channel, native missing cells, timestamps, full compile/runtime diagnostics and exact source hash.
All-na seed and recovery are unobserved; retain actual missing masks and finite values without choosing zero, missing or another seed.
Question or prediction to discriminate (not a native verdict): All-na seed and recovery are unobserved; retain actual missing masks and finite values without choosing zero, missing or another seed.
Stimulus: Bounded native values/predicates; no requests or source repairs. Provider eligibility recorded separately.

## trace-plotarrow-height-negative-max-v6.pine

SHA256: `beb9a94a39cad057f2ddab98ff12d3df4ce1c0adf0cc59b6e37243c05162e15f`. Capture group: **screenshot**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): Isolated literal invalid-height case. Native may refuse, clamp, reorder, or render; no policy is presumed. If admitted, screenshot positive/negative arrows with pixel-scale context. Pair with valid-control.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-height-negative-min-v6.pine

SHA256: `05220bc4434ca10eb9f285bf1cb8a4200d73c0ade51cc94e377c68b1112f344e`. Capture group: **screenshot**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): Isolated literal invalid-height case. Native may refuse, clamp, reorder, or render; no policy is presumed. If admitted, screenshot positive/negative arrows with pixel-scale context. Pair with valid-control.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-height-reversed-v6.pine

SHA256: `69bbdb91dcee95bf14cfdc7ede14535aaa27c3dd4a88ce46a53c8fef344a2f00`. Capture group: **screenshot**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): Isolated literal invalid-height case. Native may refuse, clamp, reorder, or render; no policy is presumed. If admitted, screenshot positive/negative arrows with pixel-scale context. Pair with valid-control.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-height-valid-control-v6.pine

SHA256: `dc737d70d34b5ced1ea628af2fb68ec6f32d8d4218184cd4327ecd8f48ea1100`. Capture group: **screenshot**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): Isolated literal invalid-height case. Native may refuse, clamp, reorder, or render; no policy is presumed. If admitted, screenshot positive/negative arrows with pixel-scale context. Pair with valid-control.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-normalization-domain-v6.pine

SHA256: `3333ed38aa675e9f59f81cf15a5bb158cb4aec4c893e1fd1308f70ff0a9d195e`. Capture group: **screenshot**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): Screenshot viewport bars0..80 with outlier bars95/96 outside viewport, then expand viewport to include outliers and restore initial viewport. Save dimensions/price scale and measure same arrow timestamps. This discriminates viewport/history hypotheses without guessing exact normalization. Full160bar CSV is input context only.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-offset-v3-series.pine

SHA256: `ddeb5c627fc9d59c1680aac3a5c6382945af7135c98bffa47445d27fbd27c6b4`. Capture group: **screenshot**. Declared Pine version: 3.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): At least three completed32bar cycles; screenshot phases5..16 with crosshair timestamp/bar index, preserve latest offset value. Generic plot last-offset prose is a hypothesis for plotarrow. Numeric SOURCE/OFFSET do not establish historical placement.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-offset-v3-zero-control.pine

SHA256: `16ea944933815e1624890c1be8271fd7787cb14a8b43e26b59426110e31c062b`. Capture group: **screenshot**. Declared Pine version: 3.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): At least three completed32bar cycles; screenshot phases5..16 with crosshair timestamp/bar index, preserve latest offset value. Generic plot last-offset prose is a hypothesis for plotarrow. Numeric SOURCE/OFFSET do not establish historical placement.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-offset-v4-series.pine

SHA256: `17cb201fa4d79d1d8828a7891f88360edafdb6075f400bded9afb6fe0af02159`. Capture group: **screenshot**. Declared Pine version: 4.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): At least three completed32bar cycles; screenshot phases5..16 with crosshair timestamp/bar index, preserve latest offset value. Generic plot last-offset prose is a hypothesis for plotarrow. Numeric SOURCE/OFFSET do not establish historical placement.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-offset-v4-zero-control.pine

SHA256: `aad604922304d261666c3f24157024735d19f456ae7335681a8c4b9af3d484ec`. Capture group: **screenshot**. Declared Pine version: 4.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): At least three completed32bar cycles; screenshot phases5..16 with crosshair timestamp/bar index, preserve latest offset value. Generic plot last-offset prose is a hypothesis for plotarrow. Numeric SOURCE/OFFSET do not establish historical placement.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-offset-v5-series.pine

SHA256: `133c009810e42fb845c0cba1c06ffedc2082e5f19d8ba628c000144168e3979a`. Capture group: **screenshot**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): At least three completed32bar cycles; screenshot phases5..16 with crosshair timestamp/bar index, preserve latest offset value. Generic plot last-offset prose is a hypothesis for plotarrow. Numeric SOURCE/OFFSET do not establish historical placement.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-plotarrow-offset-v5-zero-control.pine

SHA256: `f3ea399de058dd7018e8085ee530dc967d59ac7102b775829d232b267af8ca71`. Capture group: **screenshot**. Declared Pine version: 5.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: BAR_INDEX, SOURCE, OFFSET, MINHEIGHT, MAXHEIGHT.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Preserve untouched source, warnings and compile/runtime diagnostics.
Save full CSV plus timestamped screenshots; numeric values do not observe arrow location or pixel height.
Local success is readiness, not native evidence.
Question or prediction to discriminate (not a native verdict): At least three completed32bar cycles; screenshot phases5..16 with crosshair timestamp/bar index, preserve latest offset value. Generic plot last-offset prose is a hypothesis for plotarrow. Numeric SOURCE/OFFSET do not establish historical placement.
Stimulus: Legacy series offset and invalid min/max are intentional native outcome targets, isolated from controls; no arrays, requests or lookbacks.

## trace-polyline-point-array-mutation-v1.pine

SHA256: `089f2667794f2b45da18a00396ea757cd85dbc01f82aa448e91394fae8f33c86`. Capture group: **screenshot**. Declared Pine version: 6.

Load at least 160 confirmed historical bars; retain every plotted column and actual source index.
Expected export headers to retain: READINESS_CLOSE.
Save the full chart and drawings with visible price/time scales, indicator settings and screenshot timestamp; retain CSV separately if available.
Save exact untouched source and diagnostics.
Save screenshot with last confirmed historical bar visible and all three color locations identifiable. If green or blue is hidden by red, record that overlap.
CSV is readiness only; it does not settle red polyline geometry.
Question or prediction to discriminate (not a native verdict): Source-point/array mutation after polyline creation is not explicitly specified in current polyline reference/manual. If coordinates are copied, red stays with green. If shared point coordinates are read later, red moves to blue. If original array contents are read later, clearing may remove red. Record actual geometry or exact diagnostic; none of these hypotheses is native-observed.
Stimulus: One close plot and three polylines on last confirmed history; valid points, no requests, no live ticks. Postcreation point edits and source array.clear are the isolated outcome target.

## MISSING staged probes


All five runnable percentile interior-hole probes and their separate rank-readout mechanism probe are included.
