# Exported request library capture companion

Compile `export-request-library-v6-v1.pine` and its no-request control exactly first. Compilation requires no published import ID.

For an optional imported-execution capture, an authorized operator publishes the exact source, records account/library/version/source SHA and substitutes that **actual** identifier below. Save the resulting importer source and hash separately. The placeholder is a template, not a runnable probe or preflighted source.

```pine
//@version=6
indicator("V7 exported request importer")
import ACCOUNT/V7ExportRequest/VERSION as probe
plot(probe.fetch(syminfo.tickerid), "IMPORTED_REQUEST")
plot(request.security(syminfo.tickerid, "1D", close), "DIRECT_CONTROL")
```

Record diagnostics and all requested/chart context. An unavailable library or entitlement is a host prerequisite, not evidence that exported requests are forbidden. Native outcomes are unspecified.
