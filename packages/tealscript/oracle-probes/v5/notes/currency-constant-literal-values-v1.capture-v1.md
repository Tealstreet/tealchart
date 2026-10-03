# Currency constant literal values capture v1

Source: `currency-constant-literal-values-v1.pine`. Capture all43 numeric plot columns and Pine logs from the first loaded bar. Use the bundle chart defaults, at least12 historical bars, and record a source-matched outcome. Save the raw native log messages as well as CSV: they contain all40 unencoded strings.

The40 target plots encode actual returned strings rather than compare them to an assumed literal. Three-letter uppercase strings use base26 with A=0 through Z=25; decode each plot value into exactly three letters. Leading A digits are retained. The controls ABC=28, AZZ=675 and ZZZ=17575 verify the encoding. An unsupported length/alphabet produces na; the corresponding log still shows the actual literal and must be retained.

The frozen docs specify const string and currency names, without literal string values. Current engine values equal the member suffixes; these are documentation-derived expectations awaiting this native probe. Local preflight is instrumentation only, not native evidence. No request, currency conversion, host provider, input or chart-currency dependency is involved.
