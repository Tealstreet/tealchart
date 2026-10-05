# V33 component 14 capture v1

Run component-014-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 256 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- ta.kcw.high-low-range: Adjudicate high-low mode width and startup independently from the default true-range mode.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.

 Explicit source arguments are synthetic and SRC columns authenticate their holes; implicit high/low/volume/time operands still come from the real chart. This can isolate source publication facets but does not reproduce archived synthetic OHLCV recurrence.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "ta.kcw.high-low-range",
    "originalSourceSha256": "62091f8a6519a9bb4e57eee7cffc23f4f28a5ade05f62810988dd95906be5592",
    "originalBarsSha256": "64bc6000588b1a44e4e3e35c65a01177c70eab7bebe7ac5dfc7528b60488928d",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          -1.2
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          -1.286536304268885
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          -1.4793944431311612
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 3,
        "expected": [
          -1.8389120432071733
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          -2.5174400004088975
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 5,
        "expected": [
          -3.9589966985385168
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 6,
        "expected": [
          -8.054588275798288
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 7,
        "expected": [
          -44.7315652009803
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 8,
        "expected": [
          21.070897087453442
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 9,
        "expected": [
          11.679448454016342
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 10,
        "expected": [
          10.208191268353143
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 11,
        "expected": [
          -12.547510503265578
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 12,
        "expected": [
          -4.121782227815815
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 13,
        "expected": [
          -2.647542933748349
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 14,
        "expected": [
          -2.115660850641404
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 15,
        "expected": [
          -1.9309388761480966
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 16,
        "expected": [
          -1.9683751733292243
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 17,
        "expected": [
          -2.257239959173689
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 18,
        "expected": [
          -3.0469587648612735
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 19,
        "expected": [
          -5.752350127002052
        ],
        "actual": [
          -72.95461044149135
        ]
      },
      {
        "bar": 20,
        "expected": [
          164.93736651657397
        ],
        "actual": [
          6.624850222670678
        ]
      },
      {
        "bar": 21,
        "expected": [
          5.113256591486107
        ],
        "actual": [
          3.0613290025372524
        ]
      },
      {
        "bar": 22,
        "expected": [
          4.897723715997543
        ],
        "actual": [
          3.098108516929791
        ]
      },
      {
        "bar": 23,
        "expected": [
          4.7781389911378405
        ],
        "actual": [
          3.1586368490947967
        ]
      },
      {
        "bar": 24,
        "expected": [
          5.017150648150836
        ],
        "actual": [
          3.3737908608112175
        ]
      },
      {
        "bar": 25,
        "expected": [
          5.955612766230161
        ],
        "actual": [
          3.910088294998757
        ]
      },
      {
        "bar": 26,
        "expected": [
          8.734335147162888
        ],
        "actual": [
          5.155573355890418
        ]
      },
      {
        "bar": 27,
        "expected": [
          22.688430566162726
        ],
        "actual": [
          8.622137334258547
        ]
      },
      {
        "bar": 28,
        "expected": [
          -29.705453221944104
        ],
        "actual": [
          31.85400207289642
        ]
      },
      {
        "bar": 29,
        "expected": [
          -9.440418285628093
        ],
        "actual": [
          -21.246606330633863
        ]
      },
      {
        "bar": 30,
        "expected": [
          -6.3001662152638955
        ],
        "actual": [
          -9.481312740175099
        ]
      },
      {
        "bar": 31,
        "expected": [
          -5.587946487296639
        ],
        "actual": [
          -7.646826094936367
        ]
      },
      {
        "bar": 32,
        "expected": [
          -6.396164906412131
        ],
        "actual": [
          -8.869244436864955
        ]
      },
      {
        "bar": 33,
        "expected": [
          -3.8523353503032487
        ],
        "actual": [
          -4.542560760624977
        ]
      },
      {
        "bar": 34,
        "expected": [
          -3.3688367909295702
        ],
        "actual": [
          -3.829185338819323
        ]
      },
      {
        "bar": 35,
        "expected": [
          -3.6416674990372084
        ],
        "actual": [
          -4.126911494888918
        ]
      },
      {
        "bar": 36,
        "expected": [
          -4.898095734584732
        ],
        "actual": [
          -5.715969336338299
        ]
      },
      {
        "bar": 37,
        "expected": [
          -9.959773305540802
        ],
        "actual": [
          -13.518351638033698
        ]
      },
      {
        "bar": 38,
        "expected": [
          50.153368353003046
        ],
        "actual": [
          22.80395758036458
        ]
      },
      {
        "bar": 39,
        "expected": [
          7.127887547993617
        ],
        "actual": [
          6.175516706332385
        ]
      },
      {
        "bar": 40,
        "expected": [
          4.0607112096470175
        ],
        "actual": [
          3.76169678058841
        ]
      },
      {
        "bar": 41,
        "expected": [
          3.0547430355904144
        ],
        "actual": [
          2.8979570671721735
        ]
      },
      {
        "bar": 42,
        "expected": [
          2.6437563828709116
        ],
        "actual": [
          2.5363083774574444
        ]
      },
      {
        "bar": 43,
        "expected": [
          2.5044148976621083
        ],
        "actual": [
          2.416667868578185
        ]
      },
      {
        "bar": 44,
        "expected": [
          4.509538470288824
        ],
        "actual": [
          4.2576843619672236
        ]
      },
      {
        "bar": 45,
        "expected": [
          21.151083768587807
        ],
        "actual": [
          16.907054540897793
        ]
      },
      {
        "bar": 46,
        "expected": [
          -8.908296139368133
        ],
        "actual": [
          -9.850548305163805
        ]
      },
      {
        "bar": 47,
        "expected": [
          -4.102827502298595
        ],
        "actual": [
          -4.2731523603441275
        ]
      },
      {
        "bar": 48,
        "expected": [
          -2.986092182096071
        ],
        "actual": [
          -3.066581534381762
        ]
      },
      {
        "bar": 49,
        "expected": [
          -2.658020554015137
        ],
        "actual": [
          -2.7154203589939696
        ]
      },
      {
        "bar": 50,
        "expected": [
          -2.7580900541734352
        ],
        "actual": [
          -2.813933418879681
        ]
      },
      {
        "bar": 51,
        "expected": [
          -3.401107742340803
        ],
        "actual": [
          -3.4781179546701733
        ]
      },
      {
        "bar": 52,
        "expected": [
          -5.6782069071024175
        ],
        "actual": [
          -5.874684810482634
        ]
      },
      {
        "bar": 53,
        "expected": [
          -51.90835682126901
        ],
        "actual": [
          -71.75845112660927
        ]
      },
      {
        "bar": 54,
        "expected": [
          6.155877421865067
        ],
        "actual": [
          5.978432396207173
        ]
      },
      {
        "bar": 55,
        "expected": [
          5.603921379651908
        ],
        "actual": [
          5.470195419554937
        ]
      },
      {
        "bar": 56,
        "expected": [
          4.899089414392116
        ],
        "actual": [
          4.806156736586404
        ]
      },
      {
        "bar": 57,
        "expected": [
          4.460777747282373
        ],
        "actual": [
          4.390834290152774
        ]
      },
      {
        "bar": 58,
        "expected": [
          4.398302195351348
        ],
        "actual": [
          4.3366759365472065
        ]
      },
      {
        "bar": 59,
        "expected": [
          4.815516004341285
        ],
        "actual": [
          4.7486703882321635
        ]
      },
      {
        "bar": 60,
        "expected": [
          6.0662183832761665
        ],
        "actual": [
          5.9704293077608455
        ]
      },
      {
        "bar": 61,
        "expected": [
          9.59362783157707
        ],
        "actual": [
          9.378332225292333
        ]
      },
      {
        "bar": 62,
        "expected": [
          27.972453898004503
        ],
        "actual": [
          26.37515365379566
        ]
      },
      {
        "bar": 63,
        "expected": [
          -36.18013740144784
        ],
        "actual": [
          -38.93982215805664
        ]
      },
      {
        "bar": 64,
        "expected": [
          -13.917339737785921
        ],
        "actual": [
          -14.269295737846933
        ]
      },
      {
        "bar": 65,
        "expected": [
          -11.935579981163809
        ],
        "actual": [
          -12.168465920836551
        ]
      },
      {
        "bar": 66,
        "expected": [
          -4.389323716955198
        ],
        "actual": [
          -4.417453593444115
        ]
      },
      {
        "bar": 67,
        "expected": [
          -3.2577423051530876
        ],
        "actual": [
          -3.271732606006719
        ]
      },
      {
        "bar": 68,
        "expected": [
          -3.10253247790383
        ],
        "actual": [
          -3.114006155264794
        ]
      },
      {
        "bar": 69,
        "expected": [
          -3.5666076279567824
        ],
        "actual": [
          -3.5803284248944376
        ]
      },
      {
        "bar": 70,
        "expected": [
          -5.196982002846736
        ],
        "actual": [
          -5.2233718942721845
        ]
      },
      {
        "bar": 71,
        "expected": [
          -13.649639455931657
        ],
        "actual": [
          -13.815505585888095
        ]
      },
      {
        "bar": 72,
        "expected": [
          16.535690425925626
        ],
        "actual": [
          16.32092168603559
        ]
      },
      {
        "bar": 73,
        "expected": [
          5.197618143853473
        ],
        "actual": [
          5.178239434067008
        ]
      },
      {
        "bar": 74,
        "expected": [
          3.2432253183186384
        ],
        "actual": [
          3.2363876139545638
        ]
      },
      {
        "bar": 75,
        "expected": [
          2.512006540322188
        ],
        "actual": [
          2.508292847490885
        ]
      },
      {
        "bar": 76,
        "expected": [
          2.1900035043774753
        ],
        "actual": [
          2.1874488979189537
        ]
      },
      {
        "bar": 77,
        "expected": [
          3.225910764856207
        ],
        "actual": [
          3.2208976822060156
        ]
      },
      {
        "bar": 78,
        "expected": [
          6.428475427313284
        ],
        "actual": [
          6.410486351154163
        ]
      },
      {
        "bar": 79,
        "expected": [
          420.24969502528666
        ],
        "actual": [
          360.4266516773559
        ]
      },
      {
        "bar": 80,
        "expected": [
          -7.278939906914067
        ],
        "actual": [
          -7.29792207701117
        ]
      },
      {
        "bar": 81,
        "expected": [
          -3.9933297755914094
        ],
        "actual": [
          -3.998492087347895
        ]
      },
      {
        "bar": 82,
        "expected": [
          -3.0830943465876994
        ],
        "actual": [
          -3.0858773426506128
        ]
      },
      {
        "bar": 83,
        "expected": [
          -2.8598543424180343
        ],
        "actual": [
          -2.862020540086601
        ]
      },
      {
        "bar": 84,
        "expected": [
          -3.1128645507333226
        ],
        "actual": [
          -3.1151865389474946
        ]
      },
      {
        "bar": 85,
        "expected": [
          -4.179758757635223
        ],
        "actual": [
          -4.18354707113985
        ]
      },
      {
        "bar": 86,
        "expected": [
          -9.150351233093383
        ],
        "actual": [
          -9.16679266034378
        ]
      },
      {
        "bar": 87,
        "expected": [
          17.193817327865276
        ],
        "actual": [
          17.141548710282027
        ]
      },
      {
        "bar": 88,
        "expected": [
          13.440188645572004
        ],
        "actual": [
          13.411266659217665
        ]
      },
      {
        "bar": 89,
        "expected": [
          8.71398976501853
        ],
        "actual": [
          8.702980145787684
        ]
      },
      {
        "bar": 90,
        "expected": [
          6.176163641068686
        ],
        "actual": [
          6.171157454982361
        ]
      },
      {
        "bar": 91,
        "expected": [
          4.977252605422787
        ],
        "actual": [
          4.9743103631246175
        ]
      },
      {
        "bar": 92,
        "expected": [
          4.52742939698497
        ],
        "actual": [
          4.525226560842321
        ]
      },
      {
        "bar": 93,
        "expected": [
          4.625951844256254
        ],
        "actual": [
          4.623871039622826
        ]
      },
      {
        "bar": 94,
        "expected": [
          5.34930145034094
        ],
        "actual": [
          5.34678407189141
        ]
      },
      {
        "bar": 95,
        "expected": [
          7.202756059973934
        ],
        "actual": [
          7.198627092314579
        ]
      },
      {
        "bar": 96,
        "expected": [
          12.187208161421255
        ],
        "actual": [
          12.176516266381633
        ]
      },
      {
        "bar": 97,
        "expected": [
          33.60222128741867
        ],
        "actual": [
          33.52877879050961
        ]
      },
      {
        "bar": 98,
        "expected": [
          -259.17562474590056
        ],
        "actual": [
          -263.19884820821653
        ]
      },
      {
        "bar": 99,
        "expected": [
          -5.547071462183748
        ],
        "actual": [
          -5.548713890468977
        ]
      },
      {
        "bar": 100,
        "expected": [
          -3.3545505422048456
        ],
        "actual": [
          -3.355093922207026
        ]
      },
      {
        "bar": 101,
        "expected": [
          -2.830918306524602
        ],
        "actual": [
          -2.8312684187830794
        ]
      },
      {
        "bar": 102,
        "expected": [
          -2.8834704646879112
        ],
        "actual": [
          -2.8837990996398353
        ]
      },
      {
        "bar": 103,
        "expected": [
          -3.5054763441087124
        ],
        "actual": [
          -3.5059158007886695
        ]
      },
      {
        "bar": 104,
        "expected": [
          -5.5590368077760886
        ],
        "actual": [
          -5.560036759576364
        ]
      },
      {
        "bar": 105,
        "expected": [
          -22.014961790085422
        ],
        "actual": [
          -22.029157332152376
        ]
      },
      {
        "bar": 106,
        "expected": [
          9.840466265588427
        ],
        "actual": [
          9.837902438954488
        ]
      },
      {
        "bar": 107,
        "expected": [
          4.081142401180957
        ],
        "actual": [
          4.0807433525701375
        ]
      },
      {
        "bar": 108,
        "expected": [
          2.6963417801927787
        ],
        "actual": [
          2.6961841775208955
        ]
      },
      {
        "bar": 109,
        "expected": [
          2.1311649426344594
        ],
        "actual": [
          2.131075860757632
        ]
      },
      {
        "bar": 110,
        "expected": [
          2.771957614978056
        ],
        "actual": [
          2.7718212636102715
        ]
      },
      {
        "bar": 111,
        "expected": [
          4.207842204664219
        ],
        "actual": [
          4.207557934325184
        ]
      },
      {
        "bar": 112,
        "expected": [
          9.548768935365443
        ],
        "actual": [
          9.547444560794519
        ]
      },
      {
        "bar": 113,
        "expected": [
          -34.960088818665334
        ],
        "actual": [
          -34.976160276300405
        ]
      },
      {
        "bar": 114,
        "expected": [
          -6.671119266641025
        ],
        "actual": [
          -6.671648536035084
        ]
      },
      {
        "bar": 115,
        "expected": [
          -4.070487001560232
        ],
        "actual": [
          -4.070665276782825
        ]
      },
      {
        "bar": 116,
        "expected": [
          -3.2953975925759016
        ],
        "actual": [
          -3.2955033091549115
        ]
      },
      {
        "bar": 117,
        "expected": [
          -3.1874524327040015
        ],
        "actual": [
          -3.1875419171290296
        ]
      },
      {
        "bar": 118,
        "expected": [
          -3.6842442100830373
        ],
        "actual": [
          -3.6843523763174453
        ]
      },
      {
        "bar": 119,
        "expected": [
          -5.656568804692003
        ],
        "actual": [
          -5.6567995008210845
        ]
      },
      {
        "bar": 120,
        "expected": [
          -28.16086776522544
        ],
        "actual": [
          -28.166041719724678
        ]
      },
      {
        "bar": 121,
        "expected": [
          -30.538888856284125
        ],
        "actual": [
          -30.544394014495985
        ]
      },
      {
        "bar": 122,
        "expected": [
          115.65770085215999
        ],
        "actual": [
          115.58631693987232
        ]
      },
      {
        "bar": 123,
        "expected": [
          14.042643046724239
        ],
        "actual": [
          14.04169042183813
        ]
      },
      {
        "bar": 124,
        "expected": [
          7.251091955579633
        ],
        "actual": [
          7.250862139168051
        ]
      },
      {
        "bar": 125,
        "expected": [
          5.151812978153885
        ],
        "actual": [
          5.151708015787341
        ]
      },
      {
        "bar": 126,
        "expected": [
          4.361698358645761
        ],
        "actual": [
          4.361630287812207
        ]
      },
      {
        "bar": 127,
        "expected": [
          4.199234364920862
        ],
        "actual": [
          4.199177279498197
        ]
      },
      {
        "bar": 128,
        "expected": [
          4.52052144015574
        ],
        "actual": [
          4.52046158569536
        ]
      },
      {
        "bar": 129,
        "expected": [
          5.42101458314611
        ],
        "actual": [
          5.420936705212122
        ]
      },
      {
        "bar": 130,
        "expected": [
          7.227782594062633
        ],
        "actual": [
          7.227657338664639
        ]
      },
      {
        "bar": 131,
        "expected": [
          10.392288261200727
        ],
        "actual": [
          10.392053978241698
        ]
      },
      {
        "bar": 132,
        "expected": [
          -9.780501897156867
        ],
        "actual": [
          -9.780689652821485
        ]
      },
      {
        "bar": 133,
        "expected": [
          -3.957562767436174
        ],
        "actual": [
          -3.9575905809212286
        ]
      },
      {
        "bar": 134,
        "expected": [
          -2.88539093672778
        ],
        "actual": [
          -2.885404313224292
        ]
      },
      {
        "bar": 135,
        "expected": [
          -2.633051116588446
        ],
        "actual": [
          -2.633061194849183
        ]
      },
      {
        "bar": 136,
        "expected": [
          -2.8293681041280285
        ],
        "actual": [
          -2.829378632959541
        ]
      },
      {
        "bar": 137,
        "expected": [
          -3.6494928282775203
        ],
        "actual": [
          -3.6495086772413567
        ]
      },
      {
        "bar": 138,
        "expected": [
          -6.5461830047135035
        ],
        "actual": [
          -6.546229141528574
        ]
      },
      {
        "bar": 139,
        "expected": [
          -227.2892867599149
        ],
        "actual": [
          -227.33962020626095
        ]
      },
      {
        "bar": 140,
        "expected": [
          6.4651110142744
        ],
        "actual": [
          6.465074177094354
        ]
      },
      {
        "bar": 141,
        "expected": [
          3.242347958388787
        ],
        "actual": [
          3.2423395755849884
        ]
      },
      {
        "bar": 142,
        "expected": [
          2.2566951130357347
        ],
        "actual": [
          2.256691438939223
        ]
      },
      {
        "bar": 143,
        "expected": [
          2.6699246436120583
        ],
        "actual": [
          2.6699199905692548
        ]
      },
      {
        "bar": 144,
        "expected": [
          3.4546953494297297
        ],
        "actual": [
          3.4546883009942686
        ]
      },
      {
        "bar": 145,
        "expected": [
          5.331985742993036
        ],
        "actual": [
          5.331970552036164
        ]
      },
      {
        "bar": 146,
        "expected": [
          13.50955967135715
        ],
        "actual": [
          13.509471440140736
        ]
      },
      {
        "bar": 147,
        "expected": [
          -24.178443062738182
        ],
        "actual": [
          -24.17869876718328
        ]
      },
      {
        "bar": 148,
        "expected": [
          -6.85379323012182
        ],
        "actual": [
          -6.853811819912605
        ]
      },
      {
        "bar": 149,
        "expected": [
          -4.425488124707915
        ],
        "actual": [
          -4.425495137140216
        ]
      },
      {
        "bar": 150,
        "expected": [
          -3.7174168067771913
        ],
        "actual": [
          -3.717421283528605
        ]
      },
      {
        "bar": 151,
        "expected": [
          -3.7662477637353944
        ],
        "actual": [
          -3.766251921237707
        ]
      },
      {
        "bar": 152,
        "expected": [
          -4.750789442293788
        ],
        "actual": [
          -4.750795427521322
        ]
      },
      {
        "bar": 153,
        "expected": [
          -9.590574691241661
        ],
        "actual": [
          -9.590596759757263
        ]
      },
      {
        "bar": 154,
        "expected": [
          -7.858531009134369
        ],
        "actual": [
          -7.858544415178613
        ]
      },
      {
        "bar": 155,
        "expected": [
          -10.120029049996395
        ],
        "actual": [
          -10.120049164802603
        ]
      },
      {
        "bar": 156,
        "expected": [
          -28.85265337452968
        ],
        "actual": [
          -28.852801305641332
        ]
      },
      {
        "bar": 157,
        "expected": [
          20.85121351448944
        ],
        "actual": [
          20.85114361382584
        ]
      },
      {
        "bar": 158,
        "expected": [
          7.561496093950179
        ],
        "actual": [
          7.56148777689895
        ]
      },
      {
        "bar": 159,
        "expected": [
          4.90490790111523
        ],
        "actual": [
          4.904904734829309
        ]
      },
      {
        "bar": 160,
        "expected": [
          3.958031585407269
        ],
        "actual": [
          3.958029719967166
        ]
      },
      {
        "bar": 161,
        "expected": [
          3.6541030567003934
        ],
        "actual": [
          3.654101618171064
        ]
      },
      {
        "bar": 162,
        "expected": [
          3.7346962289784744
        ],
        "actual": [
          3.7346948694070656
        ]
      },
      {
        "bar": 163,
        "expected": [
          4.14568513264621
        ],
        "actual": [
          4.145683616928272
        ]
      },
      {
        "bar": 164,
        "expected": [
          4.884457846816214
        ],
        "actual": [
          4.884455943141288
        ]
      },
      {
        "bar": 165,
        "expected": [
          -359.9941346007167
        ],
        "actual": [
          -360.0034907398164
        ]
      },
      {
        "bar": 166,
        "expected": [
          -5.691004705013423
        ],
        "actual": [
          -5.691006820483517
        ]
      },
      {
        "bar": 167,
        "expected": [
          -3.3054916801186236
        ],
        "actual": [
          -3.3054923258254343
        ]
      },
      {
        "bar": 168,
        "expected": [
          -2.669367956123669
        ],
        "actual": [
          -2.669368337114391
        ]
      },
      {
        "bar": 169,
        "expected": [
          -2.5783322480099646
        ],
        "actual": [
          -2.578332569605176
        ]
      },
      {
        "bar": 170,
        "expected": [
          -2.912533242192406
        ],
        "actual": [
          -2.9125336134778315
        ]
      },
      {
        "bar": 171,
        "expected": [
          -4.038265598525575
        ],
        "actual": [
          -4.038266244313913
        ]
      },
      {
        "bar": 172,
        "expected": [
          -8.931213249048275
        ],
        "actual": [
          -8.931216107005561
        ]
      },
      {
        "bar": 173,
        "expected": [
          20.420214473154996
        ],
        "actual": [
          20.420200955875497
        ]
      },
      {
        "bar": 174,
        "expected": [
          4.568674926564836
        ],
        "actual": [
          4.568674314378339
        ]
      },
      {
        "bar": 175,
        "expected": [
          2.618648640560008
        ],
        "actual": [
          2.6186484585932637
        ]
      },
      {
        "bar": 176,
        "expected": [
          2.858205421197041
        ],
        "actual": [
          2.858205225060394
        ]
      },
      {
        "bar": 177,
        "expected": [
          3.2818631634629902
        ],
        "actual": [
          3.281862929500027
        ]
      },
      {
        "bar": 178,
        "expected": [
          4.155508139658136
        ],
        "actual": [
          4.155507800276178
        ]
      },
      {
        "bar": 179,
        "expected": [
          6.337715602009088
        ],
        "actual": [
          6.337714887775514
        ]
      },
      {
        "bar": 180,
        "expected": [
          16.198380502869757
        ],
        "actual": [
          16.19837628151158
        ]
      },
      {
        "bar": 181,
        "expected": [
          -26.7134842754497
        ],
        "actual": [
          -26.713494662797487
        ]
      },
      {
        "bar": 182,
        "expected": [
          -7.886574702832462
        ],
        "actual": [
          -7.886575521965842
        ]
      },
      {
        "bar": 183,
        "expected": [
          -5.1930806702173955
        ],
        "actual": [
          -5.193080991555485
        ]
      },
      {
        "bar": 184,
        "expected": [
          -4.501505622974798
        ],
        "actual": [
          -4.501505841429785
        ]
      },
      {
        "bar": 185,
        "expected": [
          -4.852852511858946
        ],
        "actual": [
          -4.85285274156628
        ]
      },
      {
        "bar": 186,
        "expected": [
          -7.174495579066495
        ],
        "actual": [
          -7.174496033319422
        ]
      },
      {
        "bar": 187,
        "expected": [
          -5.072231246472027
        ],
        "actual": [
          -5.072231451894227
        ]
      },
      {
        "bar": 188,
        "expected": [
          -5.153502672244552
        ],
        "actual": [
          -5.1535028641063905
        ]
      },
      {
        "bar": 189,
        "expected": [
          -7.026118661594536
        ],
        "actual": [
          -7.02611898425731
        ]
      },
      {
        "bar": 190,
        "expected": [
          -17.368794413102396
        ],
        "actual": [
          -17.368796197088976
        ]
      },
      {
        "bar": 191,
        "expected": [
          23.184140811436766
        ],
        "actual": [
          23.18413793557205
        ]
      },
      {
        "bar": 192,
        "expected": [
          6.9812814122619775
        ],
        "actual": [
          6.981281176327681
        ]
      },
      {
        "bar": 193,
        "expected": [
          4.37255288895848
        ],
        "actual": [
          4.372552805219967
        ]
      },
      {
        "bar": 194,
        "expected": [
          3.452550253641692
        ],
        "actual": [
          3.4525502064060936
        ]
      },
      {
        "bar": 195,
        "expected": [
          3.110413953537152
        ],
        "actual": [
          3.110413918850683
        ]
      },
      {
        "bar": 196,
        "expected": [
          3.0726923941853657
        ],
        "actual": [
          3.0726923635589487
        ]
      },
      {
        "bar": 197,
        "expected": [
          3.246174236868718
        ],
        "actual": [
          3.2461742059418475
        ]
      },
      {
        "bar": 198,
        "expected": [
          9.464964857107049
        ],
        "actual": [
          9.464964619223379
        ]
      },
      {
        "bar": 199,
        "expected": [
          -13.011658407065381
        ],
        "actual": [
          -13.011658813814158
        ]
      },
      {
        "bar": 200,
        "expected": [
          -4.412781188914942
        ],
        "actual": [
          -4.412781231242191
        ]
      },
      {
        "bar": 201,
        "expected": [
          -3.0126666878751838
        ],
        "actual": [
          -3.0126667057249166
        ]
      },
      {
        "bar": 202,
        "expected": [
          -2.6030795521728987
        ],
        "actual": [
          -2.6030795642298843
        ]
      },
      {
        "bar": 203,
        "expected": [
          -2.6374301604775163
        ],
        "actual": [
          -2.637430171676023
        ]
      },
      {
        "bar": 204,
        "expected": [
          -3.143688999944369
        ],
        "actual": [
          -3.143689014339368
        ]
      },
      {
        "bar": 205,
        "expected": [
          -4.818129280476721
        ],
        "actual": [
          -4.818129311069834
        ]
      },
      {
        "bar": 206,
        "expected": [
          -17.009456370737144
        ],
        "actual": [
          -17.009456715707657
        ]
      },
      {
        "bar": 207,
        "expected": [
          8.808581111605706
        ],
        "actual": [
          8.808581027901495
        ]
      },
      {
        "bar": 208,
        "expected": [
          3.4108114565836054
        ],
        "actual": [
          3.410811445228658
        ]
      },
      {
        "bar": 209,
        "expected": [
          3.4500842150882156
        ],
        "actual": [
          3.450084204576747
        ]
      },
      {
        "bar": 210,
        "expected": [
          3.552702468260428
        ],
        "actual": [
          3.55270245817589
        ]
      },
      {
        "bar": 211,
        "expected": [
          3.885727052613331
        ],
        "actual": [
          3.8857270416984955
        ]
      },
      {
        "bar": 212,
        "expected": [
          4.7132319472955295
        ],
        "actual": [
          4.7132319327662335
        ]
      },
      {
        "bar": 213,
        "expected": [
          6.829080808305779
        ],
        "actual": [
          6.829080780708533
        ]
      },
      {
        "bar": 214,
        "expected": [
          15.125111675498923
        ],
        "actual": [
          15.125111553016792
        ]
      },
      {
        "bar": 215,
        "expected": [
          -54.313183722171914
        ],
        "actual": [
          -54.31318515113297
        ]
      },
      {
        "bar": 216,
        "expected": [
          -10.637063249029012
        ],
        "actual": [
          -10.637063298618274
        ]
      },
      {
        "bar": 217,
        "expected": [
          -6.813540464199753
        ],
        "actual": [
          -6.813540482608497
        ]
      },
      {
        "bar": 218,
        "expected": [
          -6.095433024925362
        ],
        "actual": [
          -6.095433038255109
        ]
      },
      {
        "bar": 219,
        "expected": [
          -7.3294883447403025
        ],
        "actual": [
          -7.32948836217821
        ]
      },
      {
        "bar": 220,
        "expected": [
          -4.279667074709603
        ],
        "actual": [
          -4.2796670800886
        ]
      },
      {
        "bar": 221,
        "expected": [
          -3.77257553190087
        ],
        "actual": [
          -3.7725755356826083
        ]
      },
      {
        "bar": 222,
        "expected": [
          -4.197133222423422
        ],
        "actual": [
          -4.197133226658441
        ]
      },
      {
        "bar": 223,
        "expected": [
          -6.044997759402144
        ],
        "actual": [
          -6.044997767350485
        ]
      },
      {
        "bar": 224,
        "expected": [
          -16.118341650836967
        ],
        "actual": [
          -16.118341701965022
        ]
      },
      {
        "bar": 225,
        "expected": [
          18.18896239261263
        ],
        "actual": [
          18.188962333705383
        ]
      },
      {
        "bar": 232,
        "expected": [
          31.763913240929774
        ],
        "actual": [
          31.763913151771536
        ]
      },
      {
        "bar": 240,
        "expected": [
          178.9048066663821
        ],
        "actual": [
          178.90480539635837
        ]
      },
      {
        "bar": 249,
        "expected": [
          70.07275112282801
        ],
        "actual": [
          70.07275104367368
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          -1.2
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          -1.286536304268885
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          -1.4793944431311612
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 3,
        "expected": [
          -1.8389120432071733
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          -2.5174400004088975
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 5,
        "expected": [
          -3.9589966985385168
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 6,
        "expected": [
          -8.054588275798288
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 7,
        "expected": [
          -44.7315652009803
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 8,
        "expected": [
          21.070897087453442
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 9,
        "expected": [
          11.679448454016342
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 10,
        "expected": [
          10.208191268353143
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 11,
        "expected": [
          -12.547510503265578
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 12,
        "expected": [
          -4.121782227815815
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 13,
        "expected": [
          -2.647542933748349
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 14,
        "expected": [
          -2.115660850641404
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 15,
        "expected": [
          -1.9309388761480966
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 16,
        "expected": [
          -1.9683751733292243
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 17,
        "expected": [
          -2.257239959173689
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 18,
        "expected": [
          -3.0469587648612735
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 19,
        "expected": [
          -5.752350127002052
        ],
        "actual": [
          -72.95461044149135
        ]
      },
      {
        "bar": 20,
        "expected": [
          164.93736651657397
        ],
        "actual": [
          6.624850222670678
        ]
      },
      {
        "bar": 21,
        "expected": [
          5.113256591486107
        ],
        "actual": [
          3.0613290025372524
        ]
      },
      {
        "bar": 22,
        "expected": [
          4.897723715997543
        ],
        "actual": [
          3.098108516929791
        ]
      },
      {
        "bar": 23,
        "expected": [
          4.7781389911378405
        ],
        "actual": [
          3.1586368490947967
        ]
      },
      {
        "bar": 24,
        "expected": [
          5.017150648150836
        ],
        "actual": [
          3.3737908608112175
        ]
      },
      {
        "bar": 25,
        "expected": [
          5.955612766230161
        ],
        "actual": [
          3.910088294998757
        ]
      },
      {
        "bar": 26,
        "expected": [
          8.734335147162888
        ],
        "actual": [
          5.155573355890418
        ]
      },
      {
        "bar": 27,
        "expected": [
          22.688430566162726
        ],
        "actual": [
          8.622137334258547
        ]
      },
      {
        "bar": 28,
        "expected": [
          -29.705453221944104
        ],
        "actual": [
          31.85400207289642
        ]
      },
      {
        "bar": 29,
        "expected": [
          -9.440418285628093
        ],
        "actual": [
          -21.246606330633863
        ]
      },
      {
        "bar": 30,
        "expected": [
          -6.3001662152638955
        ],
        "actual": [
          -9.481312740175099
        ]
      },
      {
        "bar": 31,
        "expected": [
          -5.587946487296639
        ],
        "actual": [
          -7.646826094936367
        ]
      },
      {
        "bar": 32,
        "expected": [
          -6.396164906412131
        ],
        "actual": [
          -8.869244436864955
        ]
      },
      {
        "bar": 33,
        "expected": [
          -3.8523353503032487
        ],
        "actual": [
          -4.542560760624977
        ]
      },
      {
        "bar": 34,
        "expected": [
          -3.3688367909295702
        ],
        "actual": [
          -3.829185338819323
        ]
      },
      {
        "bar": 35,
        "expected": [
          -3.6416674990372084
        ],
        "actual": [
          -4.126911494888918
        ]
      },
      {
        "bar": 36,
        "expected": [
          -4.898095734584732
        ],
        "actual": [
          -5.715969336338299
        ]
      },
      {
        "bar": 37,
        "expected": [
          -9.959773305540802
        ],
        "actual": [
          -13.518351638033698
        ]
      },
      {
        "bar": 38,
        "expected": [
          50.153368353003046
        ],
        "actual": [
          22.80395758036458
        ]
      },
      {
        "bar": 39,
        "expected": [
          7.127887547993617
        ],
        "actual": [
          6.175516706332385
        ]
      },
      {
        "bar": 40,
        "expected": [
          4.0607112096470175
        ],
        "actual": [
          3.76169678058841
        ]
      },
      {
        "bar": 41,
        "expected": [
          3.0547430355904144
        ],
        "actual": [
          2.8979570671721735
        ]
      },
      {
        "bar": 42,
        "expected": [
          2.6437563828709116
        ],
        "actual": [
          2.5363083774574444
        ]
      },
      {
        "bar": 43,
        "expected": [
          2.5044148976621083
        ],
        "actual": [
          2.416667868578185
        ]
      },
      {
        "bar": 44,
        "expected": [
          4.509538470288824
        ],
        "actual": [
          4.2576843619672236
        ]
      },
      {
        "bar": 45,
        "expected": [
          21.151083768587807
        ],
        "actual": [
          16.907054540897793
        ]
      },
      {
        "bar": 46,
        "expected": [
          -8.908296139368133
        ],
        "actual": [
          -9.850548305163805
        ]
      },
      {
        "bar": 47,
        "expected": [
          -4.102827502298595
        ],
        "actual": [
          -4.2731523603441275
        ]
      },
      {
        "bar": 48,
        "expected": [
          -2.986092182096071
        ],
        "actual": [
          -3.066581534381762
        ]
      },
      {
        "bar": 49,
        "expected": [
          -2.658020554015137
        ],
        "actual": [
          -2.7154203589939696
        ]
      },
      {
        "bar": 50,
        "expected": [
          -2.7580900541734352
        ],
        "actual": [
          -2.813933418879681
        ]
      },
      {
        "bar": 51,
        "expected": [
          -3.401107742340803
        ],
        "actual": [
          -3.4781179546701733
        ]
      },
      {
        "bar": 52,
        "expected": [
          -5.6782069071024175
        ],
        "actual": [
          -5.874684810482634
        ]
      },
      {
        "bar": 53,
        "expected": [
          -51.90835682126901
        ],
        "actual": [
          -71.75845112660927
        ]
      },
      {
        "bar": 54,
        "expected": [
          6.155877421865067
        ],
        "actual": [
          5.978432396207173
        ]
      },
      {
        "bar": 55,
        "expected": [
          5.603921379651908
        ],
        "actual": [
          5.470195419554937
        ]
      },
      {
        "bar": 56,
        "expected": [
          4.899089414392116
        ],
        "actual": [
          4.806156736586404
        ]
      },
      {
        "bar": 57,
        "expected": [
          4.460777747282373
        ],
        "actual": [
          4.390834290152774
        ]
      },
      {
        "bar": 58,
        "expected": [
          4.398302195351348
        ],
        "actual": [
          4.3366759365472065
        ]
      },
      {
        "bar": 59,
        "expected": [
          4.815516004341285
        ],
        "actual": [
          4.7486703882321635
        ]
      },
      {
        "bar": 60,
        "expected": [
          6.0662183832761665
        ],
        "actual": [
          5.9704293077608455
        ]
      },
      {
        "bar": 61,
        "expected": [
          9.59362783157707
        ],
        "actual": [
          9.378332225292333
        ]
      },
      {
        "bar": 62,
        "expected": [
          27.972453898004503
        ],
        "actual": [
          26.37515365379566
        ]
      },
      {
        "bar": 63,
        "expected": [
          -36.18013740144784
        ],
        "actual": [
          -38.93982215805664
        ]
      },
      {
        "bar": 64,
        "expected": [
          -13.917339737785921
        ],
        "actual": [
          -14.269295737846933
        ]
      },
      {
        "bar": 65,
        "expected": [
          -11.935579981163809
        ],
        "actual": [
          -12.168465920836551
        ]
      },
      {
        "bar": 66,
        "expected": [
          -4.389323716955198
        ],
        "actual": [
          -4.417453593444115
        ]
      },
      {
        "bar": 67,
        "expected": [
          -3.2577423051530876
        ],
        "actual": [
          -3.271732606006719
        ]
      },
      {
        "bar": 68,
        "expected": [
          -3.10253247790383
        ],
        "actual": [
          -3.114006155264794
        ]
      },
      {
        "bar": 69,
        "expected": [
          -3.5666076279567824
        ],
        "actual": [
          -3.5803284248944376
        ]
      },
      {
        "bar": 70,
        "expected": [
          -5.196982002846736
        ],
        "actual": [
          -5.2233718942721845
        ]
      },
      {
        "bar": 71,
        "expected": [
          -13.649639455931657
        ],
        "actual": [
          -13.815505585888095
        ]
      },
      {
        "bar": 72,
        "expected": [
          16.535690425925626
        ],
        "actual": [
          16.32092168603559
        ]
      },
      {
        "bar": 73,
        "expected": [
          5.197618143853473
        ],
        "actual": [
          5.178239434067008
        ]
      },
      {
        "bar": 74,
        "expected": [
          3.2432253183186384
        ],
        "actual": [
          3.2363876139545638
        ]
      },
      {
        "bar": 75,
        "expected": [
          2.512006540322188
        ],
        "actual": [
          2.508292847490885
        ]
      },
      {
        "bar": 76,
        "expected": [
          2.1900035043774753
        ],
        "actual": [
          2.1874488979189537
        ]
      },
      {
        "bar": 77,
        "expected": [
          3.225910764856207
        ],
        "actual": [
          3.2208976822060156
        ]
      },
      {
        "bar": 78,
        "expected": [
          6.428475427313284
        ],
        "actual": [
          6.410486351154163
        ]
      },
      {
        "bar": 79,
        "expected": [
          420.24969502528666
        ],
        "actual": [
          360.4266516773559
        ]
      },
      {
        "bar": 80,
        "expected": [
          -7.278939906914067
        ],
        "actual": [
          -7.29792207701117
        ]
      },
      {
        "bar": 81,
        "expected": [
          -3.9933297755914094
        ],
        "actual": [
          -3.998492087347895
        ]
      },
      {
        "bar": 82,
        "expected": [
          -3.0830943465876994
        ],
        "actual": [
          -3.0858773426506128
        ]
      },
      {
        "bar": 83,
        "expected": [
          -2.8598543424180343
        ],
        "actual": [
          -2.862020540086601
        ]
      },
      {
        "bar": 84,
        "expected": [
          -3.1128645507333226
        ],
        "actual": [
          -3.1151865389474946
        ]
      },
      {
        "bar": 85,
        "expected": [
          -4.179758757635223
        ],
        "actual": [
          -4.18354707113985
        ]
      },
      {
        "bar": 86,
        "expected": [
          -9.150351233093383
        ],
        "actual": [
          -9.16679266034378
        ]
      },
      {
        "bar": 87,
        "expected": [
          17.193817327865276
        ],
        "actual": [
          17.141548710282027
        ]
      },
      {
        "bar": 88,
        "expected": [
          13.440188645572004
        ],
        "actual": [
          13.411266659217665
        ]
      },
      {
        "bar": 89,
        "expected": [
          8.71398976501853
        ],
        "actual": [
          8.702980145787684
        ]
      },
      {
        "bar": 90,
        "expected": [
          6.176163641068686
        ],
        "actual": [
          6.171157454982361
        ]
      },
      {
        "bar": 91,
        "expected": [
          4.977252605422787
        ],
        "actual": [
          4.9743103631246175
        ]
      },
      {
        "bar": 92,
        "expected": [
          4.52742939698497
        ],
        "actual": [
          4.525226560842321
        ]
      },
      {
        "bar": 93,
        "expected": [
          4.625951844256254
        ],
        "actual": [
          4.623871039622826
        ]
      },
      {
        "bar": 94,
        "expected": [
          5.34930145034094
        ],
        "actual": [
          5.34678407189141
        ]
      },
      {
        "bar": 95,
        "expected": [
          7.202756059973934
        ],
        "actual": [
          7.198627092314579
        ]
      },
      {
        "bar": 96,
        "expected": [
          12.187208161421255
        ],
        "actual": [
          12.176516266381633
        ]
      },
      {
        "bar": 97,
        "expected": [
          33.60222128741867
        ],
        "actual": [
          33.52877879050961
        ]
      },
      {
        "bar": 98,
        "expected": [
          -259.17562474590056
        ],
        "actual": [
          -263.19884820821653
        ]
      },
      {
        "bar": 99,
        "expected": [
          -5.547071462183748
        ],
        "actual": [
          -5.548713890468977
        ]
      },
      {
        "bar": 100,
        "expected": [
          -3.3545505422048456
        ],
        "actual": [
          -3.355093922207026
        ]
      },
      {
        "bar": 101,
        "expected": [
          -2.830918306524602
        ],
        "actual": [
          -2.8312684187830794
        ]
      },
      {
        "bar": 102,
        "expected": [
          -2.8834704646879112
        ],
        "actual": [
          -2.8837990996398353
        ]
      },
      {
        "bar": 103,
        "expected": [
          -3.5054763441087124
        ],
        "actual": [
          -3.5059158007886695
        ]
      },
      {
        "bar": 104,
        "expected": [
          -5.5590368077760886
        ],
        "actual": [
          -5.560036759576364
        ]
      },
      {
        "bar": 105,
        "expected": [
          -22.014961790085422
        ],
        "actual": [
          -22.029157332152376
        ]
      },
      {
        "bar": 106,
        "expected": [
          9.840466265588427
        ],
        "actual": [
          9.837902438954488
        ]
      },
      {
        "bar": 107,
        "expected": [
          4.081142401180957
        ],
        "actual": [
          4.0807433525701375
        ]
      },
      {
        "bar": 108,
        "expected": [
          2.6963417801927787
        ],
        "actual": [
          2.6961841775208955
        ]
      },
      {
        "bar": 109,
        "expected": [
          2.1311649426344594
        ],
        "actual": [
          2.131075860757632
        ]
      },
      {
        "bar": 110,
        "expected": [
          2.771957614978056
        ],
        "actual": [
          2.7718212636102715
        ]
      },
      {
        "bar": 111,
        "expected": [
          4.207842204664219
        ],
        "actual": [
          4.207557934325184
        ]
      },
      {
        "bar": 112,
        "expected": [
          9.548768935365443
        ],
        "actual": [
          9.547444560794519
        ]
      },
      {
        "bar": 113,
        "expected": [
          -34.960088818665334
        ],
        "actual": [
          -34.976160276300405
        ]
      },
      {
        "bar": 114,
        "expected": [
          -6.671119266641025
        ],
        "actual": [
          -6.671648536035084
        ]
      },
      {
        "bar": 115,
        "expected": [
          -4.070487001560232
        ],
        "actual": [
          -4.070665276782825
        ]
      },
      {
        "bar": 116,
        "expected": [
          -3.2953975925759016
        ],
        "actual": [
          -3.2955033091549115
        ]
      },
      {
        "bar": 117,
        "expected": [
          -3.1874524327040015
        ],
        "actual": [
          -3.1875419171290296
        ]
      },
      {
        "bar": 118,
        "expected": [
          -3.6842442100830373
        ],
        "actual": [
          -3.6843523763174453
        ]
      },
      {
        "bar": 119,
        "expected": [
          -5.656568804692003
        ],
        "actual": [
          -5.6567995008210845
        ]
      },
      {
        "bar": 120,
        "expected": [
          -28.16086776522544
        ],
        "actual": [
          -28.166041719724678
        ]
      },
      {
        "bar": 121,
        "expected": [
          -30.538888856284125
        ],
        "actual": [
          -30.544394014495985
        ]
      },
      {
        "bar": 122,
        "expected": [
          115.65770085215999
        ],
        "actual": [
          115.58631693987232
        ]
      },
      {
        "bar": 123,
        "expected": [
          14.042643046724239
        ],
        "actual": [
          14.04169042183813
        ]
      },
      {
        "bar": 124,
        "expected": [
          7.251091955579633
        ],
        "actual": [
          7.250862139168051
        ]
      },
      {
        "bar": 125,
        "expected": [
          5.151812978153885
        ],
        "actual": [
          5.151708015787341
        ]
      },
      {
        "bar": 126,
        "expected": [
          4.361698358645761
        ],
        "actual": [
          4.361630287812207
        ]
      },
      {
        "bar": 127,
        "expected": [
          4.199234364920862
        ],
        "actual": [
          4.199177279498197
        ]
      },
      {
        "bar": 128,
        "expected": [
          4.52052144015574
        ],
        "actual": [
          4.52046158569536
        ]
      },
      {
        "bar": 129,
        "expected": [
          5.42101458314611
        ],
        "actual": [
          5.420936705212122
        ]
      },
      {
        "bar": 130,
        "expected": [
          7.227782594062633
        ],
        "actual": [
          7.227657338664639
        ]
      },
      {
        "bar": 131,
        "expected": [
          10.392288261200727
        ],
        "actual": [
          10.392053978241698
        ]
      },
      {
        "bar": 132,
        "expected": [
          -9.780501897156867
        ],
        "actual": [
          -9.780689652821485
        ]
      },
      {
        "bar": 133,
        "expected": [
          -3.957562767436174
        ],
        "actual": [
          -3.9575905809212286
        ]
      },
      {
        "bar": 134,
        "expected": [
          -2.88539093672778
        ],
        "actual": [
          -2.885404313224292
        ]
      },
      {
        "bar": 135,
        "expected": [
          -2.633051116588446
        ],
        "actual": [
          -2.633061194849183
        ]
      },
      {
        "bar": 136,
        "expected": [
          -2.8293681041280285
        ],
        "actual": [
          -2.829378632959541
        ]
      },
      {
        "bar": 137,
        "expected": [
          -3.6494928282775203
        ],
        "actual": [
          -3.6495086772413567
        ]
      },
      {
        "bar": 138,
        "expected": [
          -6.5461830047135035
        ],
        "actual": [
          -6.546229141528574
        ]
      },
      {
        "bar": 139,
        "expected": [
          -227.2892867599149
        ],
        "actual": [
          -227.33962020626095
        ]
      },
      {
        "bar": 140,
        "expected": [
          6.4651110142744
        ],
        "actual": [
          6.465074177094354
        ]
      },
      {
        "bar": 141,
        "expected": [
          3.242347958388787
        ],
        "actual": [
          3.2423395755849884
        ]
      },
      {
        "bar": 142,
        "expected": [
          2.2566951130357347
        ],
        "actual": [
          2.256691438939223
        ]
      },
      {
        "bar": 143,
        "expected": [
          2.6699246436120583
        ],
        "actual": [
          2.6699199905692548
        ]
      },
      {
        "bar": 144,
        "expected": [
          3.4546953494297297
        ],
        "actual": [
          3.4546883009942686
        ]
      },
      {
        "bar": 145,
        "expected": [
          5.331985742993036
        ],
        "actual": [
          5.331970552036164
        ]
      },
      {
        "bar": 146,
        "expected": [
          13.50955967135715
        ],
        "actual": [
          13.509471440140736
        ]
      },
      {
        "bar": 147,
        "expected": [
          -24.178443062738182
        ],
        "actual": [
          -24.17869876718328
        ]
      },
      {
        "bar": 148,
        "expected": [
          -6.85379323012182
        ],
        "actual": [
          -6.853811819912605
        ]
      },
      {
        "bar": 149,
        "expected": [
          -4.425488124707915
        ],
        "actual": [
          -4.425495137140216
        ]
      },
      {
        "bar": 150,
        "expected": [
          -3.7174168067771913
        ],
        "actual": [
          -3.717421283528605
        ]
      },
      {
        "bar": 151,
        "expected": [
          -3.7662477637353944
        ],
        "actual": [
          -3.766251921237707
        ]
      },
      {
        "bar": 152,
        "expected": [
          -4.750789442293788
        ],
        "actual": [
          -4.750795427521322
        ]
      },
      {
        "bar": 153,
        "expected": [
          -9.590574691241661
        ],
        "actual": [
          -9.590596759757263
        ]
      },
      {
        "bar": 154,
        "expected": [
          -7.858531009134369
        ],
        "actual": [
          -7.858544415178613
        ]
      },
      {
        "bar": 155,
        "expected": [
          -10.120029049996395
        ],
        "actual": [
          -10.120049164802603
        ]
      },
      {
        "bar": 156,
        "expected": [
          -28.85265337452968
        ],
        "actual": [
          -28.852801305641332
        ]
      },
      {
        "bar": 157,
        "expected": [
          20.85121351448944
        ],
        "actual": [
          20.85114361382584
        ]
      },
      {
        "bar": 158,
        "expected": [
          7.561496093950179
        ],
        "actual": [
          7.56148777689895
        ]
      },
      {
        "bar": 159,
        "expected": [
          4.90490790111523
        ],
        "actual": [
          4.904904734829309
        ]
      },
      {
        "bar": 160,
        "expected": [
          3.958031585407269
        ],
        "actual": [
          3.958029719967166
        ]
      },
      {
        "bar": 161,
        "expected": [
          3.6541030567003934
        ],
        "actual": [
          3.654101618171064
        ]
      },
      {
        "bar": 162,
        "expected": [
          3.7346962289784744
        ],
        "actual": [
          3.7346948694070656
        ]
      },
      {
        "bar": 163,
        "expected": [
          4.14568513264621
        ],
        "actual": [
          4.145683616928272
        ]
      },
      {
        "bar": 164,
        "expected": [
          4.884457846816214
        ],
        "actual": [
          4.884455943141288
        ]
      },
      {
        "bar": 165,
        "expected": [
          -359.9941346007167
        ],
        "actual": [
          -360.0034907398164
        ]
      },
      {
        "bar": 166,
        "expected": [
          -5.691004705013423
        ],
        "actual": [
          -5.691006820483517
        ]
      },
      {
        "bar": 167,
        "expected": [
          -3.3054916801186236
        ],
        "actual": [
          -3.3054923258254343
        ]
      },
      {
        "bar": 168,
        "expected": [
          -2.669367956123669
        ],
        "actual": [
          -2.669368337114391
        ]
      },
      {
        "bar": 169,
        "expected": [
          -2.5783322480099646
        ],
        "actual": [
          -2.578332569605176
        ]
      },
      {
        "bar": 170,
        "expected": [
          -2.912533242192406
        ],
        "actual": [
          -2.9125336134778315
        ]
      },
      {
        "bar": 171,
        "expected": [
          -4.038265598525575
        ],
        "actual": [
          -4.038266244313913
        ]
      },
      {
        "bar": 172,
        "expected": [
          -8.931213249048275
        ],
        "actual": [
          -8.931216107005561
        ]
      },
      {
        "bar": 173,
        "expected": [
          20.420214473154996
        ],
        "actual": [
          20.420200955875497
        ]
      },
      {
        "bar": 174,
        "expected": [
          4.568674926564836
        ],
        "actual": [
          4.568674314378339
        ]
      },
      {
        "bar": 175,
        "expected": [
          2.618648640560008
        ],
        "actual": [
          2.6186484585932637
        ]
      },
      {
        "bar": 176,
        "expected": [
          2.858205421197041
        ],
        "actual": [
          2.858205225060394
        ]
      },
      {
        "bar": 177,
        "expected": [
          3.2818631634629902
        ],
        "actual": [
          3.281862929500027
        ]
      },
      {
        "bar": 178,
        "expected": [
          4.155508139658136
        ],
        "actual": [
          4.155507800276178
        ]
      },
      {
        "bar": 179,
        "expected": [
          6.337715602009088
        ],
        "actual": [
          6.337714887775514
        ]
      },
      {
        "bar": 180,
        "expected": [
          16.198380502869757
        ],
        "actual": [
          16.19837628151158
        ]
      },
      {
        "bar": 181,
        "expected": [
          -26.7134842754497
        ],
        "actual": [
          -26.713494662797487
        ]
      },
      {
        "bar": 182,
        "expected": [
          -7.886574702832462
        ],
        "actual": [
          -7.886575521965842
        ]
      },
      {
        "bar": 183,
        "expected": [
          -5.1930806702173955
        ],
        "actual": [
          -5.193080991555485
        ]
      },
      {
        "bar": 184,
        "expected": [
          -4.501505622974798
        ],
        "actual": [
          -4.501505841429785
        ]
      },
      {
        "bar": 185,
        "expected": [
          -4.852852511858946
        ],
        "actual": [
          -4.85285274156628
        ]
      },
      {
        "bar": 186,
        "expected": [
          -7.174495579066495
        ],
        "actual": [
          -7.174496033319422
        ]
      },
      {
        "bar": 187,
        "expected": [
          -5.072231246472027
        ],
        "actual": [
          -5.072231451894227
        ]
      },
      {
        "bar": 188,
        "expected": [
          -5.153502672244552
        ],
        "actual": [
          -5.1535028641063905
        ]
      },
      {
        "bar": 189,
        "expected": [
          -7.026118661594536
        ],
        "actual": [
          -7.02611898425731
        ]
      },
      {
        "bar": 190,
        "expected": [
          -17.368794413102396
        ],
        "actual": [
          -17.368796197088976
        ]
      },
      {
        "bar": 191,
        "expected": [
          23.184140811436766
        ],
        "actual": [
          23.18413793557205
        ]
      },
      {
        "bar": 192,
        "expected": [
          6.9812814122619775
        ],
        "actual": [
          6.981281176327681
        ]
      },
      {
        "bar": 193,
        "expected": [
          4.37255288895848
        ],
        "actual": [
          4.372552805219967
        ]
      },
      {
        "bar": 194,
        "expected": [
          3.452550253641692
        ],
        "actual": [
          3.4525502064060936
        ]
      },
      {
        "bar": 195,
        "expected": [
          3.110413953537152
        ],
        "actual": [
          3.110413918850683
        ]
      },
      {
        "bar": 196,
        "expected": [
          3.0726923941853657
        ],
        "actual": [
          3.0726923635589487
        ]
      },
      {
        "bar": 197,
        "expected": [
          3.246174236868718
        ],
        "actual": [
          3.2461742059418475
        ]
      },
      {
        "bar": 198,
        "expected": [
          9.464964857107049
        ],
        "actual": [
          9.464964619223379
        ]
      },
      {
        "bar": 199,
        "expected": [
          -13.011658407065381
        ],
        "actual": [
          -13.011658813814158
        ]
      },
      {
        "bar": 200,
        "expected": [
          -4.412781188914942
        ],
        "actual": [
          -4.412781231242191
        ]
      },
      {
        "bar": 201,
        "expected": [
          -3.0126666878751838
        ],
        "actual": [
          -3.0126667057249166
        ]
      },
      {
        "bar": 202,
        "expected": [
          -2.6030795521728987
        ],
        "actual": [
          -2.6030795642298843
        ]
      },
      {
        "bar": 203,
        "expected": [
          -2.6374301604775163
        ],
        "actual": [
          -2.637430171676023
        ]
      },
      {
        "bar": 204,
        "expected": [
          -3.143688999944369
        ],
        "actual": [
          -3.143689014339368
        ]
      },
      {
        "bar": 205,
        "expected": [
          -4.818129280476721
        ],
        "actual": [
          -4.818129311069834
        ]
      },
      {
        "bar": 206,
        "expected": [
          -17.009456370737144
        ],
        "actual": [
          -17.009456715707657
        ]
      },
      {
        "bar": 207,
        "expected": [
          8.808581111605706
        ],
        "actual": [
          8.808581027901495
        ]
      },
      {
        "bar": 208,
        "expected": [
          3.4108114565836054
        ],
        "actual": [
          3.410811445228658
        ]
      },
      {
        "bar": 209,
        "expected": [
          3.4500842150882156
        ],
        "actual": [
          3.450084204576747
        ]
      },
      {
        "bar": 210,
        "expected": [
          3.552702468260428
        ],
        "actual": [
          3.55270245817589
        ]
      },
      {
        "bar": 211,
        "expected": [
          3.885727052613331
        ],
        "actual": [
          3.8857270416984955
        ]
      },
      {
        "bar": 212,
        "expected": [
          4.7132319472955295
        ],
        "actual": [
          4.7132319327662335
        ]
      },
      {
        "bar": 213,
        "expected": [
          6.829080808305779
        ],
        "actual": [
          6.829080780708533
        ]
      },
      {
        "bar": 214,
        "expected": [
          15.125111675498923
        ],
        "actual": [
          15.125111553016792
        ]
      },
      {
        "bar": 215,
        "expected": [
          -54.313183722171914
        ],
        "actual": [
          -54.31318515113297
        ]
      },
      {
        "bar": 216,
        "expected": [
          -10.637063249029012
        ],
        "actual": [
          -10.637063298618274
        ]
      },
      {
        "bar": 217,
        "expected": [
          -6.813540464199753
        ],
        "actual": [
          -6.813540482608497
        ]
      },
      {
        "bar": 218,
        "expected": [
          -6.095433024925362
        ],
        "actual": [
          -6.095433038255109
        ]
      },
      {
        "bar": 219,
        "expected": [
          -7.3294883447403025
        ],
        "actual": [
          -7.32948836217821
        ]
      },
      {
        "bar": 220,
        "expected": [
          -4.279667074709603
        ],
        "actual": [
          -4.2796670800886
        ]
      },
      {
        "bar": 221,
        "expected": [
          -3.77257553190087
        ],
        "actual": [
          -3.7725755356826083
        ]
      },
      {
        "bar": 222,
        "expected": [
          -4.197133222423422
        ],
        "actual": [
          -4.197133226658441
        ]
      },
      {
        "bar": 223,
        "expected": [
          -6.044997759402144
        ],
        "actual": [
          -6.044997767350485
        ]
      },
      {
        "bar": 224,
        "expected": [
          -16.118341650836967
        ],
        "actual": [
          -16.118341701965022
        ]
      },
      {
        "bar": 225,
        "expected": [
          18.18896239261263
        ],
        "actual": [
          18.188962333705383
        ]
      },
      {
        "bar": 232,
        "expected": [
          31.763913240929774
        ],
        "actual": [
          31.763913151771536
        ]
      },
      {
        "bar": 240,
        "expected": [
          178.9048066663821
        ],
        "actual": [
          178.90480539635837
        ]
      },
      {
        "bar": 249,
        "expected": [
          70.07275112282801
        ],
        "actual": [
          70.07275104367368
        ]
      }
    ],
    "diagnostics": []
  }
]
```

Precision qualification v3

If the raw exported numeric representation cannot distinguish the candidate cells, classify those fine-value comparisons PRECISION-INSUFFICIENT/UNOBSERVED. Do not infer hidden digits, assume CSV/display rounding, or change source precision settings. Preserve raw CSV strings and independently discriminating startup/NA observations; they do not certify unresolved low bits. A third distinguishable numeric result remains a separate answer.
