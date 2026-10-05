# V33 component 4 capture v1

Run component-004-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 256 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- ta.tsi: At bar1 the helper publishes1 while T is missing. The exact cascaded TSI startup and subsequent values need a native discriminator.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Exact synthetic explicit-input discriminator. Capture the first 256 Pine indices from zero; later synthetic inputs are missing and have no target credit.



Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "ta.tsi",
    "originalSourceSha256": "f3b93099f767359fcee00cdfffcbf64d8f0aa4a2288c9f0ec6c4f30d232abd6a",
    "originalBarsSha256": "64bc6000588b1a44e4e3e35c65a01177c70eab7bebe7ac5dfc7528b60488928d",
    "compiledMismatchDetails": [
      {
        "bar": 1,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 3,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 5,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 6,
        "expected": [
          0.9989963736155602
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 7,
        "expected": [
          0.9920461725249791
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 8,
        "expected": [
          0.9765360347554469
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 9,
        "expected": [
          0.9524354394276375
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 10,
        "expected": [
          0.9221975409812514
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 11,
        "expected": [
          0.8145117310449971
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 12,
        "expected": [
          0.7288815983740041
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 13,
        "expected": [
          0.6609335806532577
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 14,
        "expected": [
          0.6080320542640489
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 15,
        "expected": [
          0.5689018447353753
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 16,
        "expected": [
          0.5425631908774504
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 17,
        "expected": [
          0.5276600211106189
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 18,
        "expected": [
          0.5222095252486066
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 19,
        "expected": [
          0.5237284112551188
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 20,
        "expected": [
          0.5295715065424692
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 21,
        "expected": [
          0.5372831077981165
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 22,
        "expected": [
          0.48380592856705157
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 23,
        "expected": [
          0.44192405739876234
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 24,
        "expected": [
          0.4040828790596094
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 25,
        "expected": [
          0.36647088933332517
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 26,
        "expected": [
          0.32802900471819496
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 27,
        "expected": [
          0.2897469641145947
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 28,
        "expected": [
          0.2539710672597682
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 29,
        "expected": [
          0.2237569376487111
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 30,
        "expected": [
          0.2010588110655747
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 31,
        "expected": [
          0.18797325508761903
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 32,
        "expected": [
          0.18622488828343703
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 33,
        "expected": [
          0.14470041835426758
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 34,
        "expected": [
          0.12531212505114356
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 35,
        "expected": [
          0.12338837630106317
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 36,
        "expected": [
          0.13360022819825876
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 37,
        "expected": [
          0.15065157971955892
        ],
        "actual": [
          0.032063777638236535
        ]
      },
      {
        "bar": 38,
        "expected": [
          0.16990065220251263
        ],
        "actual": [
          0.06774718403913577
        ]
      },
      {
        "bar": 39,
        "expected": [
          0.18770146937791363
        ],
        "actual": [
          0.09864350265072729
        ]
      },
      {
        "bar": 40,
        "expected": [
          0.20115655840537103
        ],
        "actual": [
          0.12233887239694778
        ]
      },
      {
        "bar": 41,
        "expected": [
          0.20732342804291862
        ],
        "actual": [
          0.13668054108372193
        ]
      },
      {
        "bar": 42,
        "expected": [
          0.2048274844522489
        ],
        "actual": [
          0.14079794115607555
        ]
      },
      {
        "bar": 43,
        "expected": [
          0.19419269502576697
        ],
        "actual": [
          0.1355776757550747
        ]
      },
      {
        "bar": 44,
        "expected": [
          0.12084129395706297
        ],
        "actual": [
          0.06662662684750914
        ]
      },
      {
        "bar": 45,
        "expected": [
          0.06100593237956859
        ],
        "actual": [
          0.010758822226552415
        ]
      },
      {
        "bar": 46,
        "expected": [
          0.013915897419201137
        ],
        "actual": [
          -0.032841621331807444
        ]
      },
      {
        "bar": 47,
        "expected": [
          -0.020075404072542654
        ],
        "actual": [
          -0.06350391727955483
        ]
      },
      {
        "bar": 48,
        "expected": [
          -0.03953643534642984
        ],
        "actual": [
          -0.07952466586124289
        ]
      },
      {
        "bar": 49,
        "expected": [
          -0.04325623048783982
        ],
        "actual": [
          -0.07956455406590943
        ]
      },
      {
        "bar": 50,
        "expected": [
          -0.031356624386711225
        ],
        "actual": [
          -0.06377384151375905
        ]
      },
      {
        "bar": 51,
        "expected": [
          -0.005821775312760962
        ],
        "actual": [
          -0.034291145314256144
        ]
      },
      {
        "bar": 52,
        "expected": [
          0.029713481911962828
        ],
        "actual": [
          0.00503755887705171
        ]
      },
      {
        "bar": 53,
        "expected": [
          0.07074001958872596
        ],
        "actual": [
          0.04951084383894377
        ]
      },
      {
        "bar": 54,
        "expected": [
          0.11279229862482151
        ],
        "actual": [
          0.09453779679617878
        ]
      },
      {
        "bar": 55,
        "expected": [
          0.10128063941962973
        ],
        "actual": [
          0.08513177546285029
        ]
      },
      {
        "bar": 56,
        "expected": [
          0.09523613194737253
        ],
        "actual": [
          0.08078325577314166
        ]
      },
      {
        "bar": 57,
        "expected": [
          0.08966513073558458
        ],
        "actual": [
          0.07653416698136885
        ]
      },
      {
        "bar": 58,
        "expected": [
          0.08104533192740698
        ],
        "actual": [
          0.0689655475034878
        ]
      },
      {
        "bar": 59,
        "expected": [
          0.06778180494820171
        ],
        "actual": [
          0.056552782012222406
        ]
      },
      {
        "bar": 60,
        "expected": [
          0.0500510695686218
        ],
        "actual": [
          0.039523725655168866
        ]
      },
      {
        "bar": 61,
        "expected": [
          0.029525016702376384
        ],
        "actual": [
          0.019588390204849225
        ]
      },
      {
        "bar": 62,
        "expected": [
          0.00891401988814206
        ],
        "actual": [
          -0.0005161022545490664
        ]
      },
      {
        "bar": 63,
        "expected": [
          -0.008542171700962449
        ],
        "actual": [
          -0.017533156807101626
        ]
      },
      {
        "bar": 64,
        "expected": [
          -0.01931695480149162
        ],
        "actual": [
          -0.02785952612192648
        ]
      },
      {
        "bar": 65,
        "expected": [
          -0.01987517428132444
        ],
        "actual": [
          -0.027895149942494854
        ]
      },
      {
        "bar": 66,
        "expected": [
          -0.05859189621830765
        ],
        "actual": [
          -0.06615694445786623
        ]
      },
      {
        "bar": 67,
        "expected": [
          -0.07298222597356467
        ],
        "actual": [
          -0.07993457741306721
        ]
      },
      {
        "bar": 68,
        "expected": [
          -0.06682704036170185
        ],
        "actual": [
          -0.07307404155323709
        ]
      },
      {
        "bar": 69,
        "expected": [
          -0.045285028854881844
        ],
        "actual": [
          -0.05080386551282488
        ]
      },
      {
        "bar": 70,
        "expected": [
          -0.014208791194060816
        ],
        "actual": [
          -0.019037070537589587
        ]
      },
      {
        "bar": 71,
        "expected": [
          0.020767513076494187
        ],
        "actual": [
          0.016550803423396727
        ]
      },
      {
        "bar": 72,
        "expected": [
          0.05491962233820334
        ],
        "actual": [
          0.05121468192579737
        ]
      },
      {
        "bar": 73,
        "expected": [
          0.08473628742884971
        ],
        "actual": [
          0.08143873724915417
        ]
      },
      {
        "bar": 74,
        "expected": [
          0.1077031447412243
        ],
        "actual": [
          0.10471905556266492
        ]
      },
      {
        "bar": 75,
        "expected": [
          0.12169360669256293
        ],
        "actual": [
          0.11895295044539092
        ]
      },
      {
        "bar": 76,
        "expected": [
          0.12583804961310785
        ],
        "actual": [
          0.12328681944808957
        ]
      },
      {
        "bar": 77,
        "expected": [
          0.06628111246756926
        ],
        "actual": [
          0.06384121563409263
        ]
      },
      {
        "bar": 78,
        "expected": [
          0.0151088582180718
        ],
        "actual": [
          0.012778254919962546
        ]
      },
      {
        "bar": 79,
        "expected": [
          -0.028021162028442827
        ],
        "actual": [
          -0.03024850890604293
        ]
      },
      {
        "bar": 80,
        "expected": [
          -0.062352469004189365
        ],
        "actual": [
          -0.06448508350678828
        ]
      },
      {
        "bar": 81,
        "expected": [
          -0.0860056279970052
        ],
        "actual": [
          -0.08803745531702316
        ]
      },
      {
        "bar": 82,
        "expected": [
          -0.09654948479778297
        ],
        "actual": [
          -0.09846200448596024
        ]
      },
      {
        "bar": 83,
        "expected": [
          -0.09220432618453196
        ],
        "actual": [
          -0.09397320087235125
        ]
      },
      {
        "bar": 84,
        "expected": [
          -0.07284467314927866
        ],
        "actual": [
          -0.07444789787972768
        ]
      },
      {
        "bar": 85,
        "expected": [
          -0.04043540447718364
        ],
        "actual": [
          -0.041860369874018456
        ]
      },
      {
        "bar": 86,
        "expected": [
          0.0012881384207091215
        ],
        "actual": [
          4.116788035796977e-05
        ]
      },
      {
        "bar": 87,
        "expected": [
          0.04770122417783178
        ],
        "actual": [
          0.04661989646553508
        ]
      },
      {
        "bar": 88,
        "expected": [
          0.04474786732804965
        ],
        "actual": [
          0.04378036376537439
        ]
      },
      {
        "bar": 89,
        "expected": [
          0.0490057478289686
        ],
        "actual": [
          0.04813721893684042
        ]
      },
      {
        "bar": 90,
        "expected": [
          0.054928919905008755
        ],
        "actual": [
          0.05414066689872108
        ]
      },
      {
        "bar": 91,
        "expected": [
          0.058577880904830154
        ],
        "actual": [
          0.057852009933239516
        ]
      },
      {
        "bar": 92,
        "expected": [
          0.057197387302020425
        ],
        "actual": [
          0.056520689345616895
        ]
      },
      {
        "bar": 93,
        "expected": [
          0.049608725012970596
        ],
        "actual": [
          0.048971276685238395
        ]
      },
      {
        "bar": 94,
        "expected": [
          0.03628498994495283
        ],
        "actual": [
          0.035679438244189204
        ]
      },
      {
        "bar": 95,
        "expected": [
          0.01917858122044633
        ],
        "actual": [
          0.018599626223184725
        ]
      },
      {
        "bar": 96,
        "expected": [
          0.00129248031041864
        ],
        "actual": [
          0.0007363310838099286
        ]
      },
      {
        "bar": 97,
        "expected": [
          -0.013836003612542776
        ],
        "actual": [
          -0.014372185602155342
        ]
      },
      {
        "bar": 98,
        "expected": [
          -0.022348802365440755
        ],
        "actual": [
          -0.022862964249069178
        ]
      },
      {
        "bar": 99,
        "expected": [
          -0.07169926234802515
        ],
        "actual": [
          -0.0721943312263803
        ]
      },
      {
        "bar": 100,
        "expected": [
          -0.09686383364769756
        ],
        "actual": [
          -0.09732833416211899
        ]
      },
      {
        "bar": 101,
        "expected": [
          -0.09991792851420679
        ],
        "actual": [
          -0.10034309854532326
        ]
      },
      {
        "bar": 102,
        "expected": [
          -0.08443830188003537
        ],
        "actual": [
          -0.08481914019048417
        ]
      },
      {
        "bar": 103,
        "expected": [
          -0.05542572505698721
        ],
        "actual": [
          -0.05576136578409733
        ]
      },
      {
        "bar": 104,
        "expected": [
          -0.018534043950968318
        ],
        "actual": [
          -0.01882719728179033
        ]
      },
      {
        "bar": 105,
        "expected": [
          0.02085726733815809
        ],
        "actual": [
          0.020601475447452312
        ]
      },
      {
        "bar": 106,
        "expected": [
          0.05830796641964263
        ],
        "actual": [
          0.05808323772337259
        ]
      },
      {
        "bar": 107,
        "expected": [
          0.09058445249878552
        ],
        "actual": [
          0.09038428510151814
        ]
      },
      {
        "bar": 108,
        "expected": [
          0.11537125741120108
        ],
        "actual": [
          0.11518987331537364
        ]
      },
      {
        "bar": 109,
        "expected": [
          0.13067826613829192
        ],
        "actual": [
          0.13051132440963736
        ]
      },
      {
        "bar": 110,
        "expected": [
          0.08117522693059133
        ],
        "actual": [
          0.08101625415764217
        ]
      },
      {
        "bar": 111,
        "expected": [
          0.036653558696579526
        ],
        "actual": [
          0.03650190761031379
        ]
      },
      {
        "bar": 112,
        "expected": [
          -0.0035010259528448205
        ],
        "actual": [
          -0.003645989686441761
        ]
      },
      {
        "bar": 113,
        "expected": [
          -0.03840775263960666
        ],
        "actual": [
          -0.038546622479617036
        ]
      },
      {
        "bar": 114,
        "expected": [
          -0.06647358784874781
        ],
        "actual": [
          -0.06660696169246273
        ]
      },
      {
        "bar": 115,
        "expected": [
          -0.08518272835740649
        ],
        "actual": [
          -0.08531017502196689
        ]
      },
      {
        "bar": 116,
        "expected": [
          -0.09173611172966036
        ],
        "actual": [
          -0.09185638088153786
        ]
      },
      {
        "bar": 117,
        "expected": [
          -0.08414837672979636
        ],
        "actual": [
          -0.08425983405744515
        ]
      },
      {
        "bar": 118,
        "expected": [
          -0.062184182671915035
        ],
        "actual": [
          -0.062285341861363974
        ]
      },
      {
        "bar": 119,
        "expected": [
          -0.02774717663164456
        ],
        "actual": [
          -0.02783716214146664
        ]
      },
      {
        "bar": 120,
        "expected": [
          0.01547754953012611
        ],
        "actual": [
          0.01539877325106752
        ]
      },
      {
        "bar": 121,
        "expected": [
          0.013759407963444848
        ],
        "actual": [
          0.01368856094149246
        ]
      },
      {
        "bar": 122,
        "expected": [
          0.02275971653641592
        ],
        "actual": [
          0.02269635021516659
        ]
      },
      {
        "bar": 123,
        "expected": [
          0.03615496529210398
        ],
        "actual": [
          0.03609807794519338
        ]
      },
      {
        "bar": 124,
        "expected": [
          0.04918655255933343
        ],
        "actual": [
          0.0491349104846909
        ]
      },
      {
        "bar": 125,
        "expected": [
          0.05841247844979028
        ],
        "actual": [
          0.05836491231033848
        ]
      },
      {
        "bar": 126,
        "expected": [
          0.06138408021722851
        ],
        "actual": [
          0.06133971875545625
        ]
      },
      {
        "bar": 127,
        "expected": [
          0.05710279910359055
        ],
        "actual": [
          0.05706098024563126
        ]
      },
      {
        "bar": 128,
        "expected": [
          0.04621542157182626
        ],
        "actual": [
          0.046175651365546036
        ]
      },
      {
        "bar": 129,
        "expected": [
          0.030888804602517073
        ],
        "actual": [
          0.030850728415955028
        ]
      },
      {
        "bar": 130,
        "expected": [
          0.014379706383781776
        ],
        "actual": [
          0.01434307560376578
        ]
      },
      {
        "bar": 131,
        "expected": [
          0.0004968947636524479
        ],
        "actual": [
          0.0004615301336909137
        ]
      },
      {
        "bar": 132,
        "expected": [
          -0.05823025045348614
        ],
        "actual": [
          -0.058264561898882794
        ]
      },
      {
        "bar": 133,
        "expected": [
          -0.09462822214090869
        ],
        "actual": [
          -0.09466082808016868
        ]
      },
      {
        "bar": 134,
        "expected": [
          -0.10948288297565828
        ],
        "actual": [
          -0.10951318916832792
        ]
      },
      {
        "bar": 135,
        "expected": [
          -0.10444906296237955
        ],
        "actual": [
          -0.10447661171387326
        ]
      },
      {
        "bar": 136,
        "expected": [
          -0.08280866822044941
        ],
        "actual": [
          -0.08283321828312738
        ]
      },
      {
        "bar": 137,
        "expected": [
          -0.04927621494346861
        ],
        "actual": [
          -0.04929777002296075
        ]
      },
      {
        "bar": 138,
        "expected": [
          -0.009193904731553145
        ],
        "actual": [
          -0.00921268018191304
        ]
      },
      {
        "bar": 139,
        "expected": [
          0.03237960076886481
        ],
        "actual": [
          0.032363249252040774
        ]
      },
      {
        "bar": 140,
        "expected": [
          0.07130290409822247
        ],
        "actual": [
          0.07128855653618865
        ]
      },
      {
        "bar": 141,
        "expected": [
          0.10459636412898715
        ],
        "actual": [
          0.10458359487439615
        ]
      },
      {
        "bar": 142,
        "expected": [
          0.13008007366288396
        ],
        "actual": [
          0.1300685098915393
        ]
      },
      {
        "bar": 143,
        "expected": [
          0.09202050518772364
        ],
        "actual": [
          0.0920096381994667
        ]
      },
      {
        "bar": 144,
        "expected": [
          0.05671875147779973
        ],
        "actual": [
          0.05670847580784112
        ]
      },
      {
        "bar": 145,
        "expected": [
          0.02270474713463068
        ],
        "actual": [
          0.02269497906952294
        ]
      },
      {
        "bar": 146,
        "expected": [
          -0.009541661686311395
        ],
        "actual": [
          -0.009550985843720052
        ]
      },
      {
        "bar": 147,
        "expected": [
          -0.03841737920222351
        ],
        "actual": [
          -0.038426309961617625
        ]
      },
      {
        "bar": 148,
        "expected": [
          -0.06179076852780769
        ],
        "actual": [
          -0.06179935022497404
        ]
      },
      {
        "bar": 149,
        "expected": [
          -0.07675975423533807
        ],
        "actual": [
          -0.07676795925734758
        ]
      },
      {
        "bar": 150,
        "expected": [
          -0.08031604116376183
        ],
        "actual": [
          -0.08032378772119628
        ]
      },
      {
        "bar": 151,
        "expected": [
          -0.07036378078474244
        ],
        "actual": [
          -0.0703709616482276
        ]
      },
      {
        "bar": 152,
        "expected": [
          -0.046607042768081905
        ],
        "actual": [
          -0.046613560248059016
        ]
      },
      {
        "bar": 153,
        "expected": [
          -0.01090293454486849
        ],
        "actual": [
          -0.01090873089006901
        ]
      },
      {
        "bar": 154,
        "expected": [
          -0.01586940791828964
        ],
        "actual": [
          -0.01587467359132984
        ]
      },
      {
        "bar": 155,
        "expected": [
          -0.006041881172201925
        ],
        "actual": [
          -0.006046597766914659
        ]
      },
      {
        "bar": 156,
        "expected": [
          0.011839201800795578
        ],
        "actual": [
          0.011834995459363548
        ]
      },
      {
        "bar": 157,
        "expected": [
          0.03215218291478069
        ],
        "actual": [
          0.03214841544217475
        ]
      },
      {
        "bar": 158,
        "expected": [
          0.050626924998808956
        ],
        "actual": [
          0.05062351144333425
        ]
      },
      {
        "bar": 159,
        "expected": [
          0.06415238971180788
        ],
        "actual": [
          0.06414925106250517
        ]
      },
      {
        "bar": 160,
        "expected": [
          0.07047714368214601
        ],
        "actual": [
          0.07047422064879465
        ]
      },
      {
        "bar": 161,
        "expected": [
          0.06873438668538176
        ],
        "actual": [
          0.06873163381489278
        ]
      },
      {
        "bar": 162,
        "expected": [
          0.05971420594122185
        ],
        "actual": [
          0.059711589119176324
        ]
      },
      {
        "bar": 163,
        "expected": [
          0.045764993829300646
        ],
        "actual": [
          0.04576248859528882
        ]
      },
      {
        "bar": 164,
        "expected": [
          0.030356238630048566
        ],
        "actual": [
          0.03035382807714245
        ]
      },
      {
        "bar": 165,
        "expected": [
          -0.03422303528910086
        ],
        "actual": [
          -0.03422537461160551
        ]
      },
      {
        "bar": 166,
        "expected": [
          -0.07928504601421761
        ],
        "actual": [
          -0.07928728656285489
        ]
      },
      {
        "bar": 167,
        "expected": [
          -0.10519645723566648
        ],
        "actual": [
          -0.10519856826459689
        ]
      },
      {
        "bar": 168,
        "expected": [
          -0.11203528000027803
        ],
        "actual": [
          -0.11203723075767535
        ]
      },
      {
        "bar": 169,
        "expected": [
          -0.10102779257878007
        ],
        "actual": [
          -0.10102955889381031
        ]
      },
      {
        "bar": 170,
        "expected": [
          -0.07511636084422195
        ],
        "actual": [
          -0.07511793086242587
        ]
      },
      {
        "bar": 171,
        "expected": [
          -0.03868443327869116
        ],
        "actual": [
          -0.0386858095971554
        ]
      },
      {
        "bar": 172,
        "expected": [
          0.0032580739556061643
        ],
        "actual": [
          0.0032568761520263387
        ]
      },
      {
        "bar": 173,
        "expected": [
          0.04596345366904777
        ],
        "actual": [
          0.04596241089298166
        ]
      },
      {
        "bar": 174,
        "expected": [
          0.08555604891012261
        ],
        "actual": [
          0.08555513398660443
        ]
      },
      {
        "bar": 175,
        "expected": [
          0.11926588938743156
        ],
        "actual": [
          0.11926507501497705
        ]
      },
      {
        "bar": 176,
        "expected": [
          0.0926648705849387
        ],
        "actual": [
          0.09266411776260458
        ]
      },
      {
        "bar": 177,
        "expected": [
          0.0680989727813117
        ],
        "actual": [
          0.06809826951828413
        ]
      },
      {
        "bar": 178,
        "expected": [
          0.042874853914082724
        ],
        "actual": [
          0.042874191088522084
        ]
      },
      {
        "bar": 179,
        "expected": [
          0.01655275922131677
        ],
        "actual": [
          0.016552130137641227
        ]
      },
      {
        "bar": 180,
        "expected": [
          -0.009760181729952145
        ],
        "actual": [
          -0.009760781945843587
        ]
      },
      {
        "bar": 181,
        "expected": [
          -0.034011581264309074
        ],
        "actual": [
          -0.034012156298606454
        ]
      },
      {
        "bar": 182,
        "expected": [
          -0.05369465305516091
        ],
        "actual": [
          -0.05369520584542904
        ]
      },
      {
        "bar": 183,
        "expected": [
          -0.06567099304608327
        ],
        "actual": [
          -0.06567152176461506
        ]
      },
      {
        "bar": 184,
        "expected": [
          -0.06681560059706897
        ],
        "actual": [
          -0.06681609988403017
        ]
      },
      {
        "bar": 185,
        "expected": [
          -0.05498188314759308
        ],
        "actual": [
          -0.054982345990454554
        ]
      },
      {
        "bar": 186,
        "expected": [
          -0.02985025998879206
        ],
        "actual": [
          -0.02985068000749623
        ]
      },
      {
        "bar": 187,
        "expected": [
          -0.04192621308480384
        ],
        "actual": [
          -0.041926600191819714
        ]
      },
      {
        "bar": 188,
        "expected": [
          -0.03539945004638239
        ],
        "actual": [
          -0.035399799369741344
        ]
      },
      {
        "bar": 189,
        "expected": [
          -0.01672708152575061
        ],
        "actual": [
          -0.016727392936848665
        ]
      },
      {
        "bar": 190,
        "expected": [
          0.007981341803351904
        ],
        "actual": [
          0.007981065090789148
        ]
      },
      {
        "bar": 191,
        "expected": [
          0.0335887620875665
        ],
        "actual": [
          0.03358851496504321
        ]
      },
      {
        "bar": 192,
        "expected": [
          0.05620962445387884
        ],
        "actual": [
          0.05620940107175756
        ]
      },
      {
        "bar": 193,
        "expected": [
          0.0729996161301969
        ],
        "actual": [
          0.07299941116769079
        ]
      },
      {
        "bar": 194,
        "expected": [
          0.08186458855997401
        ],
        "actual": [
          0.08186439800173241
        ]
      },
      {
        "bar": 195,
        "expected": [
          0.0820544149780188
        ],
        "actual": [
          0.08205423572647619
        ]
      },
      {
        "bar": 196,
        "expected": [
          0.07448364093062651
        ],
        "actual": [
          0.07448347065216425
        ]
      },
      {
        "bar": 197,
        "expected": [
          0.061647471863240474
        ],
        "actual": [
          0.06164730888803572
        ]
      },
      {
        "bar": 198,
        "expected": [
          -0.004984695666586594
        ],
        "actual": [
          -0.004984853815902805
        ]
      },
      {
        "bar": 199,
        "expected": [
          -0.055622137529657716
        ],
        "actual": [
          -0.05562229017025363
        ]
      },
      {
        "bar": 200,
        "expected": [
          -0.09066089112500966
        ],
        "actual": [
          -0.09066103702393685
        ]
      },
      {
        "bar": 201,
        "expected": [
          -0.109090987967119
        ],
        "actual": [
          -0.10909112535993831
        ]
      },
      {
        "bar": 202,
        "expected": [
          -0.11020350484500625
        ],
        "actual": [
          -0.11020363180881472
        ]
      },
      {
        "bar": 203,
        "expected": [
          -0.09475236487252867
        ],
        "actual": [
          -0.09475247983709284
        ]
      },
      {
        "bar": 204,
        "expected": [
          -0.06538738976097086
        ],
        "actual": [
          -0.06538749193180678
        ]
      },
      {
        "bar": 205,
        "expected": [
          -0.026299725870129687
        ],
        "actual": [
          -0.02629981539596127
        ]
      },
      {
        "bar": 206,
        "expected": [
          0.017645448485623674
        ],
        "actual": [
          0.017645370623450066
        ]
      },
      {
        "bar": 207,
        "expected": [
          0.061828520290191764
        ],
        "actual": [
          0.06182845255771893
        ]
      },
      {
        "bar": 208,
        "expected": [
          0.10249677155762693
        ],
        "actual": [
          0.1024967121743016
        ]
      },
      {
        "bar": 209,
        "expected": [
          0.08568938519986549
        ],
        "actual": [
          0.08568933112626843
        ]
      },
      {
        "bar": 210,
        "expected": [
          0.07156710549775086
        ],
        "actual": [
          0.07156705557777379
        ]
      },
      {
        "bar": 211,
        "expected": [
          0.056127047656355074
        ],
        "actual": [
          0.056127001027287904
        ]
      },
      {
        "bar": 212,
        "expected": [
          0.03769598896492858
        ],
        "actual": [
          0.03769594499015986
        ]
      },
      {
        "bar": 213,
        "expected": [
          0.01643599004427051
        ],
        "actual": [
          0.016435948262018968
        ]
      },
      {
        "bar": 214,
        "expected": [
          -0.006100669752832116
        ],
        "actual": [
          -0.006100709674656943
        ]
      },
      {
        "bar": 215,
        "expected": [
          -0.027473947637025212
        ],
        "actual": [
          -0.027473985944292012
        ]
      },
      {
        "bar": 216,
        "expected": [
          -0.04480814884673684
        ],
        "actual": [
          -0.04480818571878981
        ]
      },
      {
        "bar": 217,
        "expected": [
          -0.054699507480116746
        ],
        "actual": [
          -0.054699542770162674
        ]
      },
      {
        "bar": 218,
        "expected": [
          -0.053845816972937825
        ],
        "actual": [
          -0.05384585029259237
        ]
      },
      {
        "bar": 219,
        "expected": [
          -0.04002390239426692
        ],
        "actual": [
          -0.04002393324545291
        ]
      },
      {
        "bar": 220,
        "expected": [
          -0.062423290037172785
        ],
        "actual": [
          -0.06242331890665274
        ]
      },
      {
        "bar": 221,
        "expected": [
          -0.06284770202284298
        ],
        "actual": [
          -0.06284772834180004
        ]
      },
      {
        "bar": 222,
        "expected": [
          -0.046906709384747065
        ],
        "actual": [
          -0.04690673292993276
        ]
      },
      {
        "bar": 223,
        "expected": [
          -0.020748335647630182
        ],
        "actual": [
          -0.020748356489049404
        ]
      },
      {
        "bar": 224,
        "expected": [
          0.009814470040329655
        ],
        "actual": [
          0.009814451629300171
        ]
      },
      {
        "bar": 225,
        "expected": [
          0.03994590977738276
        ],
        "actual": [
          0.03994589341384456
        ]
      },
      {
        "bar": 226,
        "expected": [
          0.0660536755732744
        ],
        "actual": [
          0.06605366083864447
        ]
      },
      {
        "bar": 227,
        "expected": [
          0.08549924854194921
        ],
        "actual": [
          0.08549923506590358
        ]
      },
      {
        "bar": 228,
        "expected": [
          0.09630596706975608
        ],
        "actual": [
          0.09630595457236436
        ]
      },
      {
        "bar": 229,
        "expected": [
          0.09783907621790258
        ],
        "actual": [
          0.0978390644828628
        ]
      },
      {
        "bar": 230,
        "expected": [
          0.09115929664016072
        ],
        "actual": [
          0.09115928550469439
        ]
      },
      {
        "bar": 231,
        "expected": [
          0.025691414942865264
        ],
        "actual": [
          0.02569140415756253
        ]
      },
      {
        "bar": 232,
        "expected": [
          -0.027121775939870696
        ],
        "actual": [
          -0.027121786335724346
        ]
      },
      {
        "bar": 233,
        "expected": [
          -0.06787172125590368
        ],
        "actual": [
          -0.06787173125959697
        ]
      },
      {
        "bar": 234,
        "expected": [
          -0.09548559466961253
        ],
        "actual": [
          -0.09548560421894908
        ]
      },
      {
        "bar": 235,
        "expected": [
          -0.10814087221736833
        ],
        "actual": [
          -0.10814088120429056
        ]
      },
      {
        "bar": 236,
        "expected": [
          -0.10466111608607571
        ],
        "actual": [
          -0.10466112438664768
        ]
      },
      {
        "bar": 237,
        "expected": [
          -0.08553214596912476
        ],
        "actual": [
          -0.08553215348021824
        ]
      },
      {
        "bar": 238,
        "expected": [
          -0.05325088947243197
        ],
        "actual": [
          -0.053250896141452626
        ]
      },
      {
        "bar": 239,
        "expected": [
          -0.011909990608729864
        ],
        "actual": [
          -0.01190999644555054
        ]
      },
      {
        "bar": 240,
        "expected": [
          0.0337126325299044
        ],
        "actual": [
          0.03371262746010398
        ]
      },
      {
        "bar": 241,
        "expected": [
          0.07909486352744995
        ],
        "actual": [
          0.07909485912290586
        ]
      },
      {
        "bar": 242,
        "expected": [
          0.07034868488402302
        ],
        "actual": [
          0.07034868091630354
        ]
      },
      {
        "bar": 243,
        "expected": [
          0.06575901471062798
        ],
        "actual": [
          0.06575901109437539
        ]
      },
      {
        "bar": 244,
        "expected": [
          0.06060623820490985
        ],
        "actual": [
          0.06060623486228026
        ]
      },
      {
        "bar": 245,
        "expected": [
          0.051898017954233516
        ],
        "actual": [
          0.05189801482776642
        ]
      },
      {
        "bar": 246,
        "expected": [
          0.038486134974841796
        ],
        "actual": [
          0.0384861320219752
        ]
      },
      {
        "bar": 247,
        "expected": [
          0.020897571928667525
        ],
        "actual": [
          0.020897569118400343
        ]
      },
      {
        "bar": 248,
        "expected": [
          0.0010230368028429563
        ],
        "actual": [
          0.001023034112980205
        ]
      },
      {
        "bar": 249,
        "expected": [
          -0.01835007503668738
        ],
        "actual": [
          -0.018350077622301928
        ]
      },
      {
        "bar": 250,
        "expected": [
          -0.033991194894347446
        ],
        "actual": [
          -0.033991197386356316
        ]
      },
      {
        "bar": 251,
        "expected": [
          -0.04223695886807202
        ],
        "actual": [
          -0.042236961254337124
        ]
      },
      {
        "bar": 252,
        "expected": [
          -0.03960159683020942
        ],
        "actual": [
          -0.039601599081761016
        ]
      },
      {
        "bar": 253,
        "expected": [
          -0.0742607460400932
        ],
        "actual": [
          -0.07426074817873957
        ]
      },
      {
        "bar": 254,
        "expected": [
          -0.08482238960957256
        ],
        "actual": [
          -0.08482239158441278
        ]
      },
      {
        "bar": 255,
        "expected": [
          -0.07544339996091941
        ],
        "actual": [
          -0.07544340174214724
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 1,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 3,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 5,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 6,
        "expected": [
          0.9989963736155602
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 7,
        "expected": [
          0.9920461725249791
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 8,
        "expected": [
          0.9765360347554469
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 9,
        "expected": [
          0.9524354394276375
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 10,
        "expected": [
          0.9221975409812514
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 11,
        "expected": [
          0.8145117310449971
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 12,
        "expected": [
          0.7288815983740041
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 13,
        "expected": [
          0.6609335806532577
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 14,
        "expected": [
          0.6080320542640489
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 15,
        "expected": [
          0.5689018447353753
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 16,
        "expected": [
          0.5425631908774504
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 17,
        "expected": [
          0.5276600211106189
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 18,
        "expected": [
          0.5222095252486066
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 19,
        "expected": [
          0.5237284112551188
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 20,
        "expected": [
          0.5295715065424692
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 21,
        "expected": [
          0.5372831077981165
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 22,
        "expected": [
          0.48380592856705157
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 23,
        "expected": [
          0.44192405739876234
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 24,
        "expected": [
          0.4040828790596094
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 25,
        "expected": [
          0.36647088933332517
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 26,
        "expected": [
          0.32802900471819496
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 27,
        "expected": [
          0.2897469641145947
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 28,
        "expected": [
          0.2539710672597682
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 29,
        "expected": [
          0.2237569376487111
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 30,
        "expected": [
          0.2010588110655747
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 31,
        "expected": [
          0.18797325508761903
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 32,
        "expected": [
          0.18622488828343703
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 33,
        "expected": [
          0.14470041835426758
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 34,
        "expected": [
          0.12531212505114356
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 35,
        "expected": [
          0.12338837630106317
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 36,
        "expected": [
          0.13360022819825876
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 37,
        "expected": [
          0.15065157971955892
        ],
        "actual": [
          0.032063777638236535
        ]
      },
      {
        "bar": 38,
        "expected": [
          0.16990065220251263
        ],
        "actual": [
          0.06774718403913577
        ]
      },
      {
        "bar": 39,
        "expected": [
          0.18770146937791363
        ],
        "actual": [
          0.09864350265072729
        ]
      },
      {
        "bar": 40,
        "expected": [
          0.20115655840537103
        ],
        "actual": [
          0.12233887239694778
        ]
      },
      {
        "bar": 41,
        "expected": [
          0.20732342804291862
        ],
        "actual": [
          0.13668054108372193
        ]
      },
      {
        "bar": 42,
        "expected": [
          0.2048274844522489
        ],
        "actual": [
          0.14079794115607555
        ]
      },
      {
        "bar": 43,
        "expected": [
          0.19419269502576697
        ],
        "actual": [
          0.1355776757550747
        ]
      },
      {
        "bar": 44,
        "expected": [
          0.12084129395706297
        ],
        "actual": [
          0.06662662684750914
        ]
      },
      {
        "bar": 45,
        "expected": [
          0.06100593237956859
        ],
        "actual": [
          0.010758822226552415
        ]
      },
      {
        "bar": 46,
        "expected": [
          0.013915897419201137
        ],
        "actual": [
          -0.032841621331807444
        ]
      },
      {
        "bar": 47,
        "expected": [
          -0.020075404072542654
        ],
        "actual": [
          -0.06350391727955483
        ]
      },
      {
        "bar": 48,
        "expected": [
          -0.03953643534642984
        ],
        "actual": [
          -0.07952466586124289
        ]
      },
      {
        "bar": 49,
        "expected": [
          -0.04325623048783982
        ],
        "actual": [
          -0.07956455406590943
        ]
      },
      {
        "bar": 50,
        "expected": [
          -0.031356624386711225
        ],
        "actual": [
          -0.06377384151375905
        ]
      },
      {
        "bar": 51,
        "expected": [
          -0.005821775312760962
        ],
        "actual": [
          -0.034291145314256144
        ]
      },
      {
        "bar": 52,
        "expected": [
          0.029713481911962828
        ],
        "actual": [
          0.00503755887705171
        ]
      },
      {
        "bar": 53,
        "expected": [
          0.07074001958872596
        ],
        "actual": [
          0.04951084383894377
        ]
      },
      {
        "bar": 54,
        "expected": [
          0.11279229862482151
        ],
        "actual": [
          0.09453779679617878
        ]
      },
      {
        "bar": 55,
        "expected": [
          0.10128063941962973
        ],
        "actual": [
          0.08513177546285029
        ]
      },
      {
        "bar": 56,
        "expected": [
          0.09523613194737253
        ],
        "actual": [
          0.08078325577314166
        ]
      },
      {
        "bar": 57,
        "expected": [
          0.08966513073558458
        ],
        "actual": [
          0.07653416698136885
        ]
      },
      {
        "bar": 58,
        "expected": [
          0.08104533192740698
        ],
        "actual": [
          0.0689655475034878
        ]
      },
      {
        "bar": 59,
        "expected": [
          0.06778180494820171
        ],
        "actual": [
          0.056552782012222406
        ]
      },
      {
        "bar": 60,
        "expected": [
          0.0500510695686218
        ],
        "actual": [
          0.039523725655168866
        ]
      },
      {
        "bar": 61,
        "expected": [
          0.029525016702376384
        ],
        "actual": [
          0.019588390204849225
        ]
      },
      {
        "bar": 62,
        "expected": [
          0.00891401988814206
        ],
        "actual": [
          -0.0005161022545490664
        ]
      },
      {
        "bar": 63,
        "expected": [
          -0.008542171700962449
        ],
        "actual": [
          -0.017533156807101626
        ]
      },
      {
        "bar": 64,
        "expected": [
          -0.01931695480149162
        ],
        "actual": [
          -0.02785952612192648
        ]
      },
      {
        "bar": 65,
        "expected": [
          -0.01987517428132444
        ],
        "actual": [
          -0.027895149942494854
        ]
      },
      {
        "bar": 66,
        "expected": [
          -0.05859189621830765
        ],
        "actual": [
          -0.06615694445786623
        ]
      },
      {
        "bar": 67,
        "expected": [
          -0.07298222597356467
        ],
        "actual": [
          -0.07993457741306721
        ]
      },
      {
        "bar": 68,
        "expected": [
          -0.06682704036170185
        ],
        "actual": [
          -0.07307404155323709
        ]
      },
      {
        "bar": 69,
        "expected": [
          -0.045285028854881844
        ],
        "actual": [
          -0.05080386551282488
        ]
      },
      {
        "bar": 70,
        "expected": [
          -0.014208791194060816
        ],
        "actual": [
          -0.019037070537589587
        ]
      },
      {
        "bar": 71,
        "expected": [
          0.020767513076494187
        ],
        "actual": [
          0.016550803423396727
        ]
      },
      {
        "bar": 72,
        "expected": [
          0.05491962233820334
        ],
        "actual": [
          0.05121468192579737
        ]
      },
      {
        "bar": 73,
        "expected": [
          0.08473628742884971
        ],
        "actual": [
          0.08143873724915417
        ]
      },
      {
        "bar": 74,
        "expected": [
          0.1077031447412243
        ],
        "actual": [
          0.10471905556266492
        ]
      },
      {
        "bar": 75,
        "expected": [
          0.12169360669256293
        ],
        "actual": [
          0.11895295044539092
        ]
      },
      {
        "bar": 76,
        "expected": [
          0.12583804961310785
        ],
        "actual": [
          0.12328681944808957
        ]
      },
      {
        "bar": 77,
        "expected": [
          0.06628111246756926
        ],
        "actual": [
          0.06384121563409263
        ]
      },
      {
        "bar": 78,
        "expected": [
          0.0151088582180718
        ],
        "actual": [
          0.012778254919962546
        ]
      },
      {
        "bar": 79,
        "expected": [
          -0.028021162028442827
        ],
        "actual": [
          -0.03024850890604293
        ]
      },
      {
        "bar": 80,
        "expected": [
          -0.062352469004189365
        ],
        "actual": [
          -0.06448508350678828
        ]
      },
      {
        "bar": 81,
        "expected": [
          -0.0860056279970052
        ],
        "actual": [
          -0.08803745531702316
        ]
      },
      {
        "bar": 82,
        "expected": [
          -0.09654948479778297
        ],
        "actual": [
          -0.09846200448596024
        ]
      },
      {
        "bar": 83,
        "expected": [
          -0.09220432618453196
        ],
        "actual": [
          -0.09397320087235125
        ]
      },
      {
        "bar": 84,
        "expected": [
          -0.07284467314927866
        ],
        "actual": [
          -0.07444789787972768
        ]
      },
      {
        "bar": 85,
        "expected": [
          -0.04043540447718364
        ],
        "actual": [
          -0.041860369874018456
        ]
      },
      {
        "bar": 86,
        "expected": [
          0.0012881384207091215
        ],
        "actual": [
          4.116788035796977e-05
        ]
      },
      {
        "bar": 87,
        "expected": [
          0.04770122417783178
        ],
        "actual": [
          0.04661989646553508
        ]
      },
      {
        "bar": 88,
        "expected": [
          0.04474786732804965
        ],
        "actual": [
          0.04378036376537439
        ]
      },
      {
        "bar": 89,
        "expected": [
          0.0490057478289686
        ],
        "actual": [
          0.04813721893684042
        ]
      },
      {
        "bar": 90,
        "expected": [
          0.054928919905008755
        ],
        "actual": [
          0.05414066689872108
        ]
      },
      {
        "bar": 91,
        "expected": [
          0.058577880904830154
        ],
        "actual": [
          0.057852009933239516
        ]
      },
      {
        "bar": 92,
        "expected": [
          0.057197387302020425
        ],
        "actual": [
          0.056520689345616895
        ]
      },
      {
        "bar": 93,
        "expected": [
          0.049608725012970596
        ],
        "actual": [
          0.048971276685238395
        ]
      },
      {
        "bar": 94,
        "expected": [
          0.03628498994495283
        ],
        "actual": [
          0.035679438244189204
        ]
      },
      {
        "bar": 95,
        "expected": [
          0.01917858122044633
        ],
        "actual": [
          0.018599626223184725
        ]
      },
      {
        "bar": 96,
        "expected": [
          0.00129248031041864
        ],
        "actual": [
          0.0007363310838099286
        ]
      },
      {
        "bar": 97,
        "expected": [
          -0.013836003612542776
        ],
        "actual": [
          -0.014372185602155342
        ]
      },
      {
        "bar": 98,
        "expected": [
          -0.022348802365440755
        ],
        "actual": [
          -0.022862964249069178
        ]
      },
      {
        "bar": 99,
        "expected": [
          -0.07169926234802515
        ],
        "actual": [
          -0.0721943312263803
        ]
      },
      {
        "bar": 100,
        "expected": [
          -0.09686383364769756
        ],
        "actual": [
          -0.09732833416211899
        ]
      },
      {
        "bar": 101,
        "expected": [
          -0.09991792851420679
        ],
        "actual": [
          -0.10034309854532326
        ]
      },
      {
        "bar": 102,
        "expected": [
          -0.08443830188003537
        ],
        "actual": [
          -0.08481914019048417
        ]
      },
      {
        "bar": 103,
        "expected": [
          -0.05542572505698721
        ],
        "actual": [
          -0.05576136578409733
        ]
      },
      {
        "bar": 104,
        "expected": [
          -0.018534043950968318
        ],
        "actual": [
          -0.01882719728179033
        ]
      },
      {
        "bar": 105,
        "expected": [
          0.02085726733815809
        ],
        "actual": [
          0.020601475447452312
        ]
      },
      {
        "bar": 106,
        "expected": [
          0.05830796641964263
        ],
        "actual": [
          0.05808323772337259
        ]
      },
      {
        "bar": 107,
        "expected": [
          0.09058445249878552
        ],
        "actual": [
          0.09038428510151814
        ]
      },
      {
        "bar": 108,
        "expected": [
          0.11537125741120108
        ],
        "actual": [
          0.11518987331537364
        ]
      },
      {
        "bar": 109,
        "expected": [
          0.13067826613829192
        ],
        "actual": [
          0.13051132440963736
        ]
      },
      {
        "bar": 110,
        "expected": [
          0.08117522693059133
        ],
        "actual": [
          0.08101625415764217
        ]
      },
      {
        "bar": 111,
        "expected": [
          0.036653558696579526
        ],
        "actual": [
          0.03650190761031379
        ]
      },
      {
        "bar": 112,
        "expected": [
          -0.0035010259528448205
        ],
        "actual": [
          -0.003645989686441761
        ]
      },
      {
        "bar": 113,
        "expected": [
          -0.03840775263960666
        ],
        "actual": [
          -0.038546622479617036
        ]
      },
      {
        "bar": 114,
        "expected": [
          -0.06647358784874781
        ],
        "actual": [
          -0.06660696169246273
        ]
      },
      {
        "bar": 115,
        "expected": [
          -0.08518272835740649
        ],
        "actual": [
          -0.08531017502196689
        ]
      },
      {
        "bar": 116,
        "expected": [
          -0.09173611172966036
        ],
        "actual": [
          -0.09185638088153786
        ]
      },
      {
        "bar": 117,
        "expected": [
          -0.08414837672979636
        ],
        "actual": [
          -0.08425983405744515
        ]
      },
      {
        "bar": 118,
        "expected": [
          -0.062184182671915035
        ],
        "actual": [
          -0.062285341861363974
        ]
      },
      {
        "bar": 119,
        "expected": [
          -0.02774717663164456
        ],
        "actual": [
          -0.02783716214146664
        ]
      },
      {
        "bar": 120,
        "expected": [
          0.01547754953012611
        ],
        "actual": [
          0.01539877325106752
        ]
      },
      {
        "bar": 121,
        "expected": [
          0.013759407963444848
        ],
        "actual": [
          0.01368856094149246
        ]
      },
      {
        "bar": 122,
        "expected": [
          0.02275971653641592
        ],
        "actual": [
          0.02269635021516659
        ]
      },
      {
        "bar": 123,
        "expected": [
          0.03615496529210398
        ],
        "actual": [
          0.03609807794519338
        ]
      },
      {
        "bar": 124,
        "expected": [
          0.04918655255933343
        ],
        "actual": [
          0.0491349104846909
        ]
      },
      {
        "bar": 125,
        "expected": [
          0.05841247844979028
        ],
        "actual": [
          0.05836491231033848
        ]
      },
      {
        "bar": 126,
        "expected": [
          0.06138408021722851
        ],
        "actual": [
          0.06133971875545625
        ]
      },
      {
        "bar": 127,
        "expected": [
          0.05710279910359055
        ],
        "actual": [
          0.05706098024563126
        ]
      },
      {
        "bar": 128,
        "expected": [
          0.04621542157182626
        ],
        "actual": [
          0.046175651365546036
        ]
      },
      {
        "bar": 129,
        "expected": [
          0.030888804602517073
        ],
        "actual": [
          0.030850728415955028
        ]
      },
      {
        "bar": 130,
        "expected": [
          0.014379706383781776
        ],
        "actual": [
          0.01434307560376578
        ]
      },
      {
        "bar": 131,
        "expected": [
          0.0004968947636524479
        ],
        "actual": [
          0.0004615301336909137
        ]
      },
      {
        "bar": 132,
        "expected": [
          -0.05823025045348614
        ],
        "actual": [
          -0.058264561898882794
        ]
      },
      {
        "bar": 133,
        "expected": [
          -0.09462822214090869
        ],
        "actual": [
          -0.09466082808016868
        ]
      },
      {
        "bar": 134,
        "expected": [
          -0.10948288297565828
        ],
        "actual": [
          -0.10951318916832792
        ]
      },
      {
        "bar": 135,
        "expected": [
          -0.10444906296237955
        ],
        "actual": [
          -0.10447661171387326
        ]
      },
      {
        "bar": 136,
        "expected": [
          -0.08280866822044941
        ],
        "actual": [
          -0.08283321828312738
        ]
      },
      {
        "bar": 137,
        "expected": [
          -0.04927621494346861
        ],
        "actual": [
          -0.04929777002296075
        ]
      },
      {
        "bar": 138,
        "expected": [
          -0.009193904731553145
        ],
        "actual": [
          -0.00921268018191304
        ]
      },
      {
        "bar": 139,
        "expected": [
          0.03237960076886481
        ],
        "actual": [
          0.032363249252040774
        ]
      },
      {
        "bar": 140,
        "expected": [
          0.07130290409822247
        ],
        "actual": [
          0.07128855653618865
        ]
      },
      {
        "bar": 141,
        "expected": [
          0.10459636412898715
        ],
        "actual": [
          0.10458359487439615
        ]
      },
      {
        "bar": 142,
        "expected": [
          0.13008007366288396
        ],
        "actual": [
          0.1300685098915393
        ]
      },
      {
        "bar": 143,
        "expected": [
          0.09202050518772364
        ],
        "actual": [
          0.0920096381994667
        ]
      },
      {
        "bar": 144,
        "expected": [
          0.05671875147779973
        ],
        "actual": [
          0.05670847580784112
        ]
      },
      {
        "bar": 145,
        "expected": [
          0.02270474713463068
        ],
        "actual": [
          0.02269497906952294
        ]
      },
      {
        "bar": 146,
        "expected": [
          -0.009541661686311395
        ],
        "actual": [
          -0.009550985843720052
        ]
      },
      {
        "bar": 147,
        "expected": [
          -0.03841737920222351
        ],
        "actual": [
          -0.038426309961617625
        ]
      },
      {
        "bar": 148,
        "expected": [
          -0.06179076852780769
        ],
        "actual": [
          -0.06179935022497404
        ]
      },
      {
        "bar": 149,
        "expected": [
          -0.07675975423533807
        ],
        "actual": [
          -0.07676795925734758
        ]
      },
      {
        "bar": 150,
        "expected": [
          -0.08031604116376183
        ],
        "actual": [
          -0.08032378772119628
        ]
      },
      {
        "bar": 151,
        "expected": [
          -0.07036378078474244
        ],
        "actual": [
          -0.0703709616482276
        ]
      },
      {
        "bar": 152,
        "expected": [
          -0.046607042768081905
        ],
        "actual": [
          -0.046613560248059016
        ]
      },
      {
        "bar": 153,
        "expected": [
          -0.01090293454486849
        ],
        "actual": [
          -0.01090873089006901
        ]
      },
      {
        "bar": 154,
        "expected": [
          -0.01586940791828964
        ],
        "actual": [
          -0.01587467359132984
        ]
      },
      {
        "bar": 155,
        "expected": [
          -0.006041881172201925
        ],
        "actual": [
          -0.006046597766914659
        ]
      },
      {
        "bar": 156,
        "expected": [
          0.011839201800795578
        ],
        "actual": [
          0.011834995459363548
        ]
      },
      {
        "bar": 157,
        "expected": [
          0.03215218291478069
        ],
        "actual": [
          0.03214841544217475
        ]
      },
      {
        "bar": 158,
        "expected": [
          0.050626924998808956
        ],
        "actual": [
          0.05062351144333425
        ]
      },
      {
        "bar": 159,
        "expected": [
          0.06415238971180788
        ],
        "actual": [
          0.06414925106250517
        ]
      },
      {
        "bar": 160,
        "expected": [
          0.07047714368214601
        ],
        "actual": [
          0.07047422064879465
        ]
      },
      {
        "bar": 161,
        "expected": [
          0.06873438668538176
        ],
        "actual": [
          0.06873163381489278
        ]
      },
      {
        "bar": 162,
        "expected": [
          0.05971420594122185
        ],
        "actual": [
          0.059711589119176324
        ]
      },
      {
        "bar": 163,
        "expected": [
          0.045764993829300646
        ],
        "actual": [
          0.04576248859528882
        ]
      },
      {
        "bar": 164,
        "expected": [
          0.030356238630048566
        ],
        "actual": [
          0.03035382807714245
        ]
      },
      {
        "bar": 165,
        "expected": [
          -0.03422303528910086
        ],
        "actual": [
          -0.03422537461160551
        ]
      },
      {
        "bar": 166,
        "expected": [
          -0.07928504601421761
        ],
        "actual": [
          -0.07928728656285489
        ]
      },
      {
        "bar": 167,
        "expected": [
          -0.10519645723566648
        ],
        "actual": [
          -0.10519856826459689
        ]
      },
      {
        "bar": 168,
        "expected": [
          -0.11203528000027803
        ],
        "actual": [
          -0.11203723075767535
        ]
      },
      {
        "bar": 169,
        "expected": [
          -0.10102779257878007
        ],
        "actual": [
          -0.10102955889381031
        ]
      },
      {
        "bar": 170,
        "expected": [
          -0.07511636084422195
        ],
        "actual": [
          -0.07511793086242587
        ]
      },
      {
        "bar": 171,
        "expected": [
          -0.03868443327869116
        ],
        "actual": [
          -0.0386858095971554
        ]
      },
      {
        "bar": 172,
        "expected": [
          0.0032580739556061643
        ],
        "actual": [
          0.0032568761520263387
        ]
      },
      {
        "bar": 173,
        "expected": [
          0.04596345366904777
        ],
        "actual": [
          0.04596241089298166
        ]
      },
      {
        "bar": 174,
        "expected": [
          0.08555604891012261
        ],
        "actual": [
          0.08555513398660443
        ]
      },
      {
        "bar": 175,
        "expected": [
          0.11926588938743156
        ],
        "actual": [
          0.11926507501497705
        ]
      },
      {
        "bar": 176,
        "expected": [
          0.0926648705849387
        ],
        "actual": [
          0.09266411776260458
        ]
      },
      {
        "bar": 177,
        "expected": [
          0.0680989727813117
        ],
        "actual": [
          0.06809826951828413
        ]
      },
      {
        "bar": 178,
        "expected": [
          0.042874853914082724
        ],
        "actual": [
          0.042874191088522084
        ]
      },
      {
        "bar": 179,
        "expected": [
          0.01655275922131677
        ],
        "actual": [
          0.016552130137641227
        ]
      },
      {
        "bar": 180,
        "expected": [
          -0.009760181729952145
        ],
        "actual": [
          -0.009760781945843587
        ]
      },
      {
        "bar": 181,
        "expected": [
          -0.034011581264309074
        ],
        "actual": [
          -0.034012156298606454
        ]
      },
      {
        "bar": 182,
        "expected": [
          -0.05369465305516091
        ],
        "actual": [
          -0.05369520584542904
        ]
      },
      {
        "bar": 183,
        "expected": [
          -0.06567099304608327
        ],
        "actual": [
          -0.06567152176461506
        ]
      },
      {
        "bar": 184,
        "expected": [
          -0.06681560059706897
        ],
        "actual": [
          -0.06681609988403017
        ]
      },
      {
        "bar": 185,
        "expected": [
          -0.05498188314759308
        ],
        "actual": [
          -0.054982345990454554
        ]
      },
      {
        "bar": 186,
        "expected": [
          -0.02985025998879206
        ],
        "actual": [
          -0.02985068000749623
        ]
      },
      {
        "bar": 187,
        "expected": [
          -0.04192621308480384
        ],
        "actual": [
          -0.041926600191819714
        ]
      },
      {
        "bar": 188,
        "expected": [
          -0.03539945004638239
        ],
        "actual": [
          -0.035399799369741344
        ]
      },
      {
        "bar": 189,
        "expected": [
          -0.01672708152575061
        ],
        "actual": [
          -0.016727392936848665
        ]
      },
      {
        "bar": 190,
        "expected": [
          0.007981341803351904
        ],
        "actual": [
          0.007981065090789148
        ]
      },
      {
        "bar": 191,
        "expected": [
          0.0335887620875665
        ],
        "actual": [
          0.03358851496504321
        ]
      },
      {
        "bar": 192,
        "expected": [
          0.05620962445387884
        ],
        "actual": [
          0.05620940107175756
        ]
      },
      {
        "bar": 193,
        "expected": [
          0.0729996161301969
        ],
        "actual": [
          0.07299941116769079
        ]
      },
      {
        "bar": 194,
        "expected": [
          0.08186458855997401
        ],
        "actual": [
          0.08186439800173241
        ]
      },
      {
        "bar": 195,
        "expected": [
          0.0820544149780188
        ],
        "actual": [
          0.08205423572647619
        ]
      },
      {
        "bar": 196,
        "expected": [
          0.07448364093062651
        ],
        "actual": [
          0.07448347065216425
        ]
      },
      {
        "bar": 197,
        "expected": [
          0.061647471863240474
        ],
        "actual": [
          0.06164730888803572
        ]
      },
      {
        "bar": 198,
        "expected": [
          -0.004984695666586594
        ],
        "actual": [
          -0.004984853815902805
        ]
      },
      {
        "bar": 199,
        "expected": [
          -0.055622137529657716
        ],
        "actual": [
          -0.05562229017025363
        ]
      },
      {
        "bar": 200,
        "expected": [
          -0.09066089112500966
        ],
        "actual": [
          -0.09066103702393685
        ]
      },
      {
        "bar": 201,
        "expected": [
          -0.109090987967119
        ],
        "actual": [
          -0.10909112535993831
        ]
      },
      {
        "bar": 202,
        "expected": [
          -0.11020350484500625
        ],
        "actual": [
          -0.11020363180881472
        ]
      },
      {
        "bar": 203,
        "expected": [
          -0.09475236487252867
        ],
        "actual": [
          -0.09475247983709284
        ]
      },
      {
        "bar": 204,
        "expected": [
          -0.06538738976097086
        ],
        "actual": [
          -0.06538749193180678
        ]
      },
      {
        "bar": 205,
        "expected": [
          -0.026299725870129687
        ],
        "actual": [
          -0.02629981539596127
        ]
      },
      {
        "bar": 206,
        "expected": [
          0.017645448485623674
        ],
        "actual": [
          0.017645370623450066
        ]
      },
      {
        "bar": 207,
        "expected": [
          0.061828520290191764
        ],
        "actual": [
          0.06182845255771893
        ]
      },
      {
        "bar": 208,
        "expected": [
          0.10249677155762693
        ],
        "actual": [
          0.1024967121743016
        ]
      },
      {
        "bar": 209,
        "expected": [
          0.08568938519986549
        ],
        "actual": [
          0.08568933112626843
        ]
      },
      {
        "bar": 210,
        "expected": [
          0.07156710549775086
        ],
        "actual": [
          0.07156705557777379
        ]
      },
      {
        "bar": 211,
        "expected": [
          0.056127047656355074
        ],
        "actual": [
          0.056127001027287904
        ]
      },
      {
        "bar": 212,
        "expected": [
          0.03769598896492858
        ],
        "actual": [
          0.03769594499015986
        ]
      },
      {
        "bar": 213,
        "expected": [
          0.01643599004427051
        ],
        "actual": [
          0.016435948262018968
        ]
      },
      {
        "bar": 214,
        "expected": [
          -0.006100669752832116
        ],
        "actual": [
          -0.006100709674656943
        ]
      },
      {
        "bar": 215,
        "expected": [
          -0.027473947637025212
        ],
        "actual": [
          -0.027473985944292012
        ]
      },
      {
        "bar": 216,
        "expected": [
          -0.04480814884673684
        ],
        "actual": [
          -0.04480818571878981
        ]
      },
      {
        "bar": 217,
        "expected": [
          -0.054699507480116746
        ],
        "actual": [
          -0.054699542770162674
        ]
      },
      {
        "bar": 218,
        "expected": [
          -0.053845816972937825
        ],
        "actual": [
          -0.05384585029259237
        ]
      },
      {
        "bar": 219,
        "expected": [
          -0.04002390239426692
        ],
        "actual": [
          -0.04002393324545291
        ]
      },
      {
        "bar": 220,
        "expected": [
          -0.062423290037172785
        ],
        "actual": [
          -0.06242331890665274
        ]
      },
      {
        "bar": 221,
        "expected": [
          -0.06284770202284298
        ],
        "actual": [
          -0.06284772834180004
        ]
      },
      {
        "bar": 222,
        "expected": [
          -0.046906709384747065
        ],
        "actual": [
          -0.04690673292993276
        ]
      },
      {
        "bar": 223,
        "expected": [
          -0.020748335647630182
        ],
        "actual": [
          -0.020748356489049404
        ]
      },
      {
        "bar": 224,
        "expected": [
          0.009814470040329655
        ],
        "actual": [
          0.009814451629300171
        ]
      },
      {
        "bar": 225,
        "expected": [
          0.03994590977738276
        ],
        "actual": [
          0.03994589341384456
        ]
      },
      {
        "bar": 226,
        "expected": [
          0.0660536755732744
        ],
        "actual": [
          0.06605366083864447
        ]
      },
      {
        "bar": 227,
        "expected": [
          0.08549924854194921
        ],
        "actual": [
          0.08549923506590358
        ]
      },
      {
        "bar": 228,
        "expected": [
          0.09630596706975608
        ],
        "actual": [
          0.09630595457236436
        ]
      },
      {
        "bar": 229,
        "expected": [
          0.09783907621790258
        ],
        "actual": [
          0.0978390644828628
        ]
      },
      {
        "bar": 230,
        "expected": [
          0.09115929664016072
        ],
        "actual": [
          0.09115928550469439
        ]
      },
      {
        "bar": 231,
        "expected": [
          0.025691414942865264
        ],
        "actual": [
          0.02569140415756253
        ]
      },
      {
        "bar": 232,
        "expected": [
          -0.027121775939870696
        ],
        "actual": [
          -0.027121786335724346
        ]
      },
      {
        "bar": 233,
        "expected": [
          -0.06787172125590368
        ],
        "actual": [
          -0.06787173125959697
        ]
      },
      {
        "bar": 234,
        "expected": [
          -0.09548559466961253
        ],
        "actual": [
          -0.09548560421894908
        ]
      },
      {
        "bar": 235,
        "expected": [
          -0.10814087221736833
        ],
        "actual": [
          -0.10814088120429056
        ]
      },
      {
        "bar": 236,
        "expected": [
          -0.10466111608607571
        ],
        "actual": [
          -0.10466112438664768
        ]
      },
      {
        "bar": 237,
        "expected": [
          -0.08553214596912476
        ],
        "actual": [
          -0.08553215348021824
        ]
      },
      {
        "bar": 238,
        "expected": [
          -0.05325088947243197
        ],
        "actual": [
          -0.053250896141452626
        ]
      },
      {
        "bar": 239,
        "expected": [
          -0.011909990608729864
        ],
        "actual": [
          -0.01190999644555054
        ]
      },
      {
        "bar": 240,
        "expected": [
          0.0337126325299044
        ],
        "actual": [
          0.03371262746010398
        ]
      },
      {
        "bar": 241,
        "expected": [
          0.07909486352744995
        ],
        "actual": [
          0.07909485912290586
        ]
      },
      {
        "bar": 242,
        "expected": [
          0.07034868488402302
        ],
        "actual": [
          0.07034868091630354
        ]
      },
      {
        "bar": 243,
        "expected": [
          0.06575901471062798
        ],
        "actual": [
          0.06575901109437539
        ]
      },
      {
        "bar": 244,
        "expected": [
          0.06060623820490985
        ],
        "actual": [
          0.06060623486228026
        ]
      },
      {
        "bar": 245,
        "expected": [
          0.051898017954233516
        ],
        "actual": [
          0.05189801482776642
        ]
      },
      {
        "bar": 246,
        "expected": [
          0.038486134974841796
        ],
        "actual": [
          0.0384861320219752
        ]
      },
      {
        "bar": 247,
        "expected": [
          0.020897571928667525
        ],
        "actual": [
          0.020897569118400343
        ]
      },
      {
        "bar": 248,
        "expected": [
          0.0010230368028429563
        ],
        "actual": [
          0.001023034112980205
        ]
      },
      {
        "bar": 249,
        "expected": [
          -0.01835007503668738
        ],
        "actual": [
          -0.018350077622301928
        ]
      },
      {
        "bar": 250,
        "expected": [
          -0.033991194894347446
        ],
        "actual": [
          -0.033991197386356316
        ]
      },
      {
        "bar": 251,
        "expected": [
          -0.04223695886807202
        ],
        "actual": [
          -0.042236961254337124
        ]
      },
      {
        "bar": 252,
        "expected": [
          -0.03960159683020942
        ],
        "actual": [
          -0.039601599081761016
        ]
      },
      {
        "bar": 253,
        "expected": [
          -0.0742607460400932
        ],
        "actual": [
          -0.07426074817873957
        ]
      },
      {
        "bar": 254,
        "expected": [
          -0.08482238960957256
        ],
        "actual": [
          -0.08482239158441278
        ]
      },
      {
        "bar": 255,
        "expected": [
          -0.07544339996091941
        ],
        "actual": [
          -0.07544340174214724
        ]
      }
    ],
    "diagnostics": []
  }
]
```

Precision qualification v3

If the raw exported numeric representation cannot distinguish the candidate cells, classify those fine-value comparisons PRECISION-INSUFFICIENT/UNOBSERVED. Do not infer hidden digits, assume CSV/display rounding, or change source precision settings. Preserve raw CSV strings and independently discriminating startup/NA observations; they do not certify unresolved low bits. A third distinguishable numeric result remains a separate answer.
