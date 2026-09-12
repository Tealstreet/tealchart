export const TRADINGVIEW_LIBRARY_COT_V5_SOURCE = String.raw`
// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © TradingView

//@version=6
library("LibraryCOT")

// LibraryCOT Library
// v5, 2025.12.20

// This code's style is based on the recommendations from the Pine Script User Manual's Style guide:
//    https://www.tradingview.com/pine-script-docs/writing/style-guide/



//#region ———————————————————— Metric names and valid directions


// +-----------------------------------+------------------------+
// |  Legacy (COT) Metric Names        |       Directions       |
// +-----------------------------------+------------------------+
// | Open Interest                     | No direction           |
// | Noncommercial Positions           | Long, Short, Spreading |
// | Commercial Positions              | Long, Short            |
// | Total Reportable Positions        | Long, Short            |
// | Nonreportable Positions           | Long, Short            |
// | Traders Total                     | No direction           |
// | Traders Noncommercial             | Long, Short, Spreading |
// | Traders Commercial                | Long, Short            |
// | Traders Total Reportable          | Long, Short            |
// | Concentration Gross LT 4 TDR      | Long, Short            |
// | Concentration Gross LT 8 TDR      | Long, Short            |
// | Concentration Net LT 4 TDR        | Long, Short            |
// | Concentration Net LT 8 TDR        | Long, Short            |
// +-----------------------------------+------------------------+

// +-----------------------------------+------------------------+
// | Disaggregated (COT2) Metric Names |       Directions       |
// +-----------------------------------+------------------------+
// | Open Interest                     | No direction           |
// | Producer Merchant Positions       | Long, Short            |
// | Swap Positions                    | Long, Short, Spreading |
// | Managed Money Positions           | Long, Short, Spreading |
// | Other Reportable Positions        | Long, Short, Spreading |
// | Total Reportable Positions        | Long, Short            |
// | Nonreportable Positions           | Long, Short            |
// | Traders Total                     | No direction           |
// | Traders Producer Merchant         | Long, Short            |
// | Traders Swap                      | Long, Short, Spreading |
// | Traders Managed Money             | Long, Short, Spreading |
// | Traders Other Reportable          | Long, Short, Spreading |
// | Traders Total Reportable          | Long, Short            |
// | Concentration Gross LE 4 TDR      | Long, Short            |
// | Concentration Gross LE 8 TDR      | Long, Short            |
// | Concentration Net LE 4 TDR        | Long, Short            |
// | Concentration Net LE 8 TDR        | Long, Short            |
// +-----------------------------------+------------------------+

// +-----------------------------------+------------------------+
// | Financial (COT3) Metric Names     |       Directions       |
// +-----------------------------------+------------------------+
// | Open Interest                     | No direction           |
// | Dealer Positions                  | Long, Short, Spreading |
// | Asset Manager Positions           | Long, Short, Spreading |
// | Leveraged Funds Positions         | Long, Short, Spreading |
// | Other Reportable Positions        | Long, Short, Spreading |
// | Total Reportable Positions        | Long, Short            |
// | Nonreportable Positions           | Long, Short            |
// | Traders Total                     | No direction           |
// | Traders Dealer                    | Long, Short, Spreading |
// | Traders Asset Manager             | Long, Short, Spreading |
// | Traders Leveraged Funds           | Long, Short, Spreading |
// | Traders Other Reportable          | Long, Short, Spreading |
// | Traders Total Reportable          | Long, Short            |
// | Concentration Gross LE 4 TDR      | Long, Short            |
// | Concentration Gross LE 8 TDR      | Long, Short            |
// | Concentration Net LE 4 TDR        | Long, Short            |
// | Concentration Net LE 8 TDR        | Long, Short            |
// +-----------------------------------+------------------------+
//#endregion



//#region ———————————————————— Library functions


// @function                Returns the part of the COT ticker ID that specifies whether the report includes options
//                          data.
// @param includeOptions    (bool) \`true\` to specify that the data should include options and futures information, 
//                          and \`false\` to specify futures only.
// @returns                 (string) The <includeOptions> part of a COT ticker ID: \`"FO"\` specifies data that includes
//                          options and futures information, and \`"F"\` specifies data that includes futures only.
optionsToTicker(bool includeOptions) =>
    includeOptions ? "FO" : "F"


// @function                Constructs a string representing the metric name and direction parts of a COT ticker ID.
// @param metricName        (string) One of the valid metric names listed in the library's documentation and source code.
// @param metricDirection   (string) Metric direction. Possible values are: \`"Long"\`, \`"Short"\`, \`"Spreading"\`, and
//                          \`"No direction"\`.
// @returns                 (string) The <metricCode><metricDirection> portion of a COT ticker ID, e.g., \`"OI"\` for
//                          \`"Open Interest"\` and \`"No direction"\`, or \`"TC_L"\` for \`"Traders Commercial"\` and \`"Long"\`.
metricNameAndDirectionToTicker(string metricName, string metricDirection) =>
    string metricCode = switch metricName
        "Asset Manager Positions"      => "AMP"
        "Commercial Positions"         => "CP"
        "Concentration Gross LE 4 TDR" => "CON_GROSS_LE_4"
        "Concentration Gross LE 8 TDR" => "CON_GROSS_LE_8"
        "Concentration Gross LT 4 TDR" => "CON_GROSS_LT_4"
        "Concentration Gross LT 8 TDR" => "CON_GROSS_LT_8"
        "Concentration Net LE 4 TDR"   => "CON_NET_LE_4"
        "Concentration Net LE 8 TDR"   => "CON_NET_LE_8"
        "Concentration Net LT 4 TDR"   => "CON_NET_LT_4"
        "Concentration Net LT 8 TDR"   => "CON_NET_LT_8"
        "Dealer Positions"             => "DP"
        "Leveraged Funds Positions"    => "LMP"
        "Managed Money Positions"      => "MMP"
        "Noncommercial Positions"      => "NCP"
        "Nonreportable Positions"      => "NRP"
        "Open Interest"                => "OI"
        "Other Reportable Positions"   => "ORP"
        "Producer Merchant Positions"  => "PMR"
        "Swap Positions"               => "SP"
        "Total Reportable Positions"   => "TRP"
        "Traders Asset Manager"        => "TAM"
        "Traders Commercial"           => "TC"
        "Traders Dealer"               => "TD"
        "Traders Leveraged Funds"      => "TLM"
        "Traders Managed Money"        => "TMM"
        "Traders Noncommercial"        => "TNC"
        "Traders Other Reportable"     => "TOR"
        "Traders Producer Merchant"    => "TPM"
        "Traders Swap"                 => "TS"
        "Traders Total"                => "TT"
        "Traders Total Reportable"     => "TTR"
        => runtime.error(
            str.format(
                "Invalid metric name: ''{0}''. See the library''s documentation or source code for all valid "
                + "metric names.", metricName
            )
        ), na
    string directionCode = switch metricDirection
        "Long"         => "_L"
        "Short"        => "_S"
        "Spreading"    => "_SPREAD"
        "No direction" => ""
        => runtime.error(
            str.format(
                "''{0}'' is not a valid \`metricDirection\` argument. Possible values: "
                + "''Long'', ''Short'', ''Spreading'', ''No direction''", metricDirection
            )
        ), na
    if metricDirection == "No direction"
        if metricName != "Open Interest" and metricName != "Traders Total"
            runtime.error(
                str.format(
                    "''{0}'' does not apply to the ''{1}'' metric.", metricDirection, metricName
                )
            )
    else if metricDirection == "Spreading"
        isIncorrect = switch metricName
            "Commercial Positions"         => true
            "Total Reportable Positions"   => true
            "Nonreportable Positions"      => true
            "Traders Commercial"           => true
            "Traders Total Reportable"     => true
            "Concentration Gross LT 4 TDR" => true
            "Concentration Gross LT 8 TDR" => true
            "Concentration Net LT 4 TDR"   => true
            "Concentration Net LT 8 TDR"   => true
            "Concentration Gross LE 4 TDR" => true
            "Concentration Gross LE 8 TDR" => true
            "Concentration Net LE 4 TDR"   => true
            "Concentration Net LE 8 TDR"   => true
            "Producer Merchant Positions"  => true
            "Traders Producer Merchant"    => true
            => false
        if isIncorrect
            runtime.error(
                str.format(
                    "The ''{0}'' direction does not apply to the ''{1}'' metric.", metricDirection, metricName
                )
            )
    else if metricName == "Open Interest" or metricName == "Traders Total"
        runtime.error(
            str.format(
                "The ''{0}'' direction does not apply to the ''{1}'' metric.", metricDirection, metricName
            )
        )
    metricCode + directionCode


// @function                Converts a specified metric type into a required COT ticker ID component.
//                          See the "Old and Other Futures" section of the CFTC's Explanatory Notes for details on
//                          metric types.
// @param metricType        (string) The metric type. Possible values are: \`"All"\`, \`"Old"\`, \`"Other"\`.
// @returns                 (string) The <metricType> part of a COT ticker ID.
typeToTicker(string metricType) =>
    string result = switch metricType
        "All"   => ""
        "Old"   => "_OLD"
        "Other" => "_OTHER"
        => runtime.error(
            str.format(
                "''{0}'' is not a valid \`metricType\` argument. Possible values: ''All'', ''Old'', ''Other''", metricType
            )
        ), na


// @function                Retrieves a string containing the Commodity Futures Trading Commission (CFTC) code for the
//                          futures instrument referenced by the specified symbol, or an empty string if no CFTC code is
//                          associated with the symbol. Scripts can use this function's result as the \`CFTCCode\`
//                          argument in calls to this library's \`COTTickerid()\` and \`requestCommitmentOfTraders()\`
//                          functions.
//                          Calls to this function count toward a script's \`request.*()\` call limit.
// @param symbol            (string) The symbol or ticker ID of the futures instrument for which to retrieve the CFTC
//                          code. If the value is an empty string, the function retrieves the code for the instrument
//                          referenced by the chart's symbol.
// @returns                 (string) A string representing a CFTC code if one is associated with the symbol, and an
//                          empty string otherwise.
export getCFTCCode(string symbol) =>
    // This logic relies on the variable \`syminfo.cftc_code\`, which automatically stores an available CFTC code.
    // This variable is usable in scripts, but is not shown in the manual because its use cases outside this library's
    // purpose are extremely limited.
    string result = switch
        symbol == "" => syminfo.cftc_code
        => request.security(symbol, "", syminfo.cftc_code)


// @function                Creates a valid ticker ID representing a CFTC Commitment of Traders (COT) symbol with
//                          specified parameters.
// @param COTType           (string) Specifies the report type that the symbol represents. Possible values are:
//                          \`"Legacy"\`, \`"Disaggregated"\`, \`"Financial"\`.
// @param CFTCCode          (string) The CFTC code for the futures instrument. For example, wheat futures (root "ZW")
//                          have the code \`"001602"\`. Use this library's \`getCFTCCode()\` function to retrieve the code
//                          for the instrument referenced by a specific symbol.
// @param includeOptions    (bool) If \`true\`, the COT symbol specifies futures and options information. Otherwise, it
//                          specifies futures only.
// @param metricName        (string) One of the valid metric names listed in the library's documentation and source code.
// @param metricDirection   (string) Metric direction. Possible values are: \`"Long"\`, \`"Short"\`, \`"Spreading"\`, and
//                          \`"No direction"\`. Consult this library's documentation or code to see which direction values
//                          apply to the specified metric.
// @param metricType        (string) The metric type. Possible values are: \`"All"\`, \`"Old"\`, \`"Other"\`.
// @returns                 (string) A COT ticker identifier, which \`request.security()\` calls can use to request
//                          Commitment of Traders data.
export COTTickerid(
    string COTType, string CFTCCode, bool includeOptions, string metricName, string metricDirection, string metricType
) =>
    string typeCode = switch COTType
        "Legacy"        => ""
        "Disaggregated" => "2"
        "Financial"     => "3"
        => runtime.error(
            str.format(
                "''{0}'' is not a valid \`COTType\` argument. Possible values: "
                + "''Legacy'', ''Disaggregated'', ''Financial''", COTType
            )
        ), na
    bool invalidType = if COTType == "Legacy"
        switch metricName
            "Open Interest"                 => false
            "Noncommercial Positions"       => false
            "Commercial Positions"          => false
            "Total Reportable Positions"    => false
            "Nonreportable Positions"       => false
            "Traders Total"                 => false
            "Traders Noncommercial"         => false
            "Traders Commercial"            => false
            "Traders Total Reportable"      => false
            "Concentration Gross LT 4 TDR"  => false
            "Concentration Gross LT 8 TDR"  => false
            "Concentration Net LT 4 TDR"    => false
            "Concentration Net LT 8 TDR"    => false
            => true
    else if COTType == "Disaggregated"
        switch metricName
            "Open Interest"                 => false
            "Producer Merchant Positions"   => false
            "Swap Positions"                => false
            "Managed Money Positions"       => false
            "Other Reportable Positions"    => false
            "Total Reportable Positions"    => false
            "Nonreportable Positions"       => false
            "Traders Total"                 => false
            "Traders Producer Merchant"     => false
            "Traders Swap"                  => false
            "Traders Managed Money"         => false
            "Traders Other Reportable"      => false
            "Traders Total Reportable"      => false
            "Concentration Gross LE 4 TDR"  => false
            "Concentration Gross LE 8 TDR"  => false
            "Concentration Net LE 4 TDR"    => false
            "Concentration Net LE 8 TDR"    => false
            => true
    else if COTType == "Financial"
        switch metricName
            "Open Interest"                 => false
            "Dealer Positions"              => false
            "Asset Manager Positions"       => false
            "Leveraged Funds Positions"     => false
            "Other Reportable Positions"    => false
            "Total Reportable Positions"    => false
            "Nonreportable Positions"       => false
            "Traders Total"                 => false
            "Traders Dealer"                => false
            "Traders Asset Manager"         => false
            "Traders Leveraged Funds"       => false
            "Traders Other Reportable"      => false
            "Traders Total Reportable"      => false
            "Concentration Gross LE 4 TDR"  => false
            "Concentration Gross LE 8 TDR"  => false
            "Concentration Net LE 4 TDR"    => false
            "Concentration Net LE 8 TDR"    => false
            => true
    if invalidType
        runtime.error(
            str.format(
                "''{0}'' is not a valid {1} COT metric. See the libary''s documentation or code for all valid {1} "
                + "metric names.", metricName, COTType
            )
        )
    string result = str.format(
        "COT{0}:{1}_{2}_{3}{4}", typeCode, CFTCCode, optionsToTicker(includeOptions),
        metricNameAndDirectionToTicker(metricName, metricDirection), typeToTicker(metricType)
    )


// @function                Requests CFTC Commitment of Traders (COT) data with specified parameters.
//                          Calls to this function count toward a script's \`request.*()\` call limit.
// @param COTType           (string) The type of report to request. Possible values are:
//                          \`"Legacy"\`, \`"Disaggregated"\`, \`"Financial"\`.
// @param CFTCCode          (string) The CFTC code for the futures instrument. For example, wheat futures (root "ZW")
//                          have the code \`"001602"\`. Use this library's \`getCFTCCode()\` function to retrieve the code
//                          for the instrument referenced by a specific symbol.
// @param includeOptions    (bool) If \`true\`, the COT request includes options information. Otherwise, it includes only
//                          futures.
// @param metricName        (string) One of the valid metric names listed in the library's documentation and source code.
// @param metricDirection   (string) Metric direction. Possible values are: \`"Long"\`, \`"Short"\`, \`"Spreading"\`, and
//                          \`"No direction"\`. Consult the library's documentation or code to see which direction values
//                          apply to the specified metric.
// @param metricType        (string) The metric type. Possible values are: \`"All"\`, \`"Old"\`, \`"Other"\`.
// @returns                 (float) The specified Commitment of Traders data series. If no data is available,
//                          the function raises a runtime error.
export requestCommitmentOfTraders(
    string COTType, string CFTCCode, bool includeOptions, string metricName, string metricDirection, string metricType
) =>
    string t    = COTTickerid(COTType, CFTCCode, includeOptions, metricName, metricDirection, metricType)
    string tf   = timeframe.isdwm ? timeframe.period : "1D"
    float  data = request.security(t, tf, close, ignore_invalid_symbol = true)
    if ta.cum(nz(data)) == 0 and barstate.islastconfirmedhistory
        runtime.error(
            "The requested COT data is unavailable. Please ensure the report type, CFTC code, "
            + "and additional settings represent a valid metric request."
        )
    data
//#endregion



// ————— Example code


float COTdataseries = requestCommitmentOfTraders(
    COTType         = "Legacy",
    CFTCCode        = getCFTCCode(""),
    includeOptions  = false,
    metricName      = "Open Interest",
    metricDirection = "No direction",
    metricType      = "All"
)

plot(COTdataseries, style = plot.style_stepline_diamond)
`;

export const TRADINGVIEW_RELATIVE_VALUE_V3_SOURCE = String.raw`
// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © TradingView

// @version=6
library("RelativeValue")

// RelativeValue Library
// v3, 2024.11.26

// This code was written using the recommendations from the Pine Script™ User Manual's Style Guide:
//   https://www.tradingview.com/pine-script-docs/en/v5/writing/Style_guide.html



//#region ———————————————————— Library functions


// @type                    A structure that contains collected values and corresponding timestamps within a period.
// @field data              An array containing the values collected since the \`startTime\` of the period.
// @field times             An array containing the timestamps corresponding to each value entry in the \`data\` array.
// @field startTime         The starting time of the period for time offset calculations.
type collectedData
	array<float> data
	array<int>   times
	int          startTime



// @function                Adds a \`value\` to the \`id\` array, and removes its first value if the array's size exceeds
//                          the specified \`maxSize\`. Can be used as either a method or a function.
// @param id                (array<collectedData>) An array of \`collectedData\` objects.
// @param maxSize           (simple int) The maximum size of the \`id\` array.
// @param value             (series collectedData) The value of the element added to the end of the \`id\` array.
// @returns                 (void) Function has no explicit return value.
method maintainArray(array<collectedData> id, simple int maxSize, series collectedData value) =>
    id.push(value)
    if id.size() > maxSize
        id.shift()


// @function                Calculates the average of all elements in the \`data\` field of every \`collectedData\` object
//                          in the \`id\` array that correspond to the time offset closest to the specified \`timeOffset\`.
//                          If the current index exceeds the last index of any past period, it uses the last available
//                          value from that past period instead. Can be used as either a method or a function.
// @param id                (array<collectedData>) An array of \`collectedData\` objects that reference the values from
//                          all necessary periods.
// @param timeOffset        (series int) The target difference between values in the \`times\` array from each
//                          \`collectedData\` object and the object's \`startTime\`.
// @returns                 (float) The average \`data\` value from each \`collectedData\` instance corresponding to
//                          time differences closest to the \`timeOffset\`.
method calcAverageByTime(array<collectedData> id, series int timeOffset) =>
	float sum = 0.0
	for eachItem in id
		int   startTime = eachItem.startTime
		int   index     = eachItem.times.binary_search_leftmost(startTime + timeOffset)
		float adjData   = eachItem.data.size() - 1 >= index ? eachItem.data.get(index) : eachItem.data.last()
		sum += adjData
	float result = sum / id.size()


// @function           		Calculates the cumulative sum of the \`source\` since the last bar where \`anchor\` was \`true\`.
// @param source        	(series float) Source used for the calculation.
// @param anchor        	(series bool) The condition that triggers the reset of the calculation. The calculation
//                          resets when \`anchor\` is \`true\`, and continues accumulating values since the previous reset
//                          when \`anchor\` is \`false\`.
// @param adjustRealtime    (simple bool) If \`true\`, estimates the cumulative value on unclosed bars based on the
//                          data since the last \`anchor\` condition. Optional. The default is \`false\`.
// @returns             	(float) The cumulative sum of the \`source\`.
export calcCumulativeSeries(series float source, series bool anchor, simple bool adjustRealtime = false) =>
    var float sum = 0.0
	var int lastAnchor = na
    if anchor
        sum := 0.0
		lastAnchor := time
    sum += source
	if adjustRealtime and not barstate.isconfirmed
		int    timePassed   = math.min(timenow, time_close) - lastAnchor
		int    timeTotal    = time_close - lastAnchor
		float  currentRatio = sum / timePassed
		sum := currentRatio * timeTotal
    float result = sum


// @function                (Overload 1 of 2) Calculates the average \`source\` value over \`length\` periods, where the
//                          values in the average are from each bar whose time offset from the start of its respective
//                          period is closest to that of the current bar in the most recent period.
// @param source            (series float) Source used for the calculation.
// @param length            (simple int) The number of periods to use for the historical average calculation.
// @param anchor            (series bool) The condition that triggers the onset of a new period. A new period starts
//                          when \`anchor\` is \`true\`.
// @param isCumulative      (simple bool) If \`true\`, calculates the average of cumulative \`source\` values in each
//                          period at the current time offset. Optional. The default is \`true\`.
// @returns        		    (float) The historical average of the \`source\` series at the current time offset.
export averageAtTime(
     series float source, simple int length, series bool anchor, simple bool isCumulative = true
 ) =>
	var array<collectedData> historicalData = array.new<collectedData>()
	var collectedData newData = collectedData.new(array.new<float>(), array.new<int>())
    float src = isCumulative ? calcCumulativeSeries(source, anchor) : source
	if anchor
		historicalData.maintainArray(length, newData)
		newData := collectedData.new(array.new<float>(), array.new<int>(), time)
	newData.times.push(time)
	newData.data.push(src)
	float result = calcAverageByTime(historicalData, time - newData.startTime)


// @function                (Overload 2 of 2) Calculates the average \`source\` value over \`length\` periods, where the
//                          values in the average are from each bar whose time offset from the start of its respective
//                          period is closest to that of the current bar in the most recent period.
// @param source            (series float) Source used for the calculation.
// @param length            (simple int) The number of periods to use for the historical average calculation.
// @param timeframe         (series string) Specifies the size of each period in the average calculation. A new period
//						    begins when a new bar opens on the specified timeframe.
// @param isCumulative      (simple bool) If \`true\`, calculates the average of cumulative \`source\` values in each
//                          period at the current time offset. Optional. The default is \`true\`.
// @returns        		    (float) The historical average of the \`source\` series at the current time offset.
export averageAtTime(
     series float source, simple int length, simple string timeframe, simple bool isCumulative = true
 ) =>
	var array<collectedData> historicalData = array.new<collectedData>()
	var collectedData newData = collectedData.new(array.new<float>(), array.new<int>(), time(timeframe))
	bool anchor = timeframe.change(timeframe)
    float src = isCumulative ? calcCumulativeSeries(source, anchor) : source
	if anchor
		historicalData.maintainArray(length, newData)
		newData := collectedData.new(array.new<float>(), array.new<int>(), time(timeframe))
	newData.times.push(time)
	newData.data.push(src)
	float result = calcAverageByTime(historicalData, time - newData.startTime)
//#endregion


//#region ———————————————————— Example Code

// Color variables
color  TEAL  = color.new(color.teal, 50)
color  RED   = color.new(color.red,  50)
color  GRAY  = color.new(color.gray, 70)

// String options
string MI01  = "Cumulative"
string MI02  = "Regular"
string EQ01  = "On"
string EQ02  = "Off"

// Tooltips
string TT_RT = "The timeframe for the period reset condition. Default is 'D'."
string TT_LI = "The number of periods in the average volume calculation. Default is 5."
string TT_MI = "Choose between 'Cumulative' for a running total of volume since the last anchor point, or 'Regular' for
 non-cumulative volume. Default is 'Cumulative'"
string TT_SR = "If enabled, the volume will be displayed as 'Relative Volume', which is the ratio of the current volume
 to the historical average volume."
string TT_AR = "When activated in 'Cumulative' mode, this feature estimates the volume of the unclosed bar using the
 volume data from the current session."

// @variable The timeframe of periods to compare.
string resetTimeInput = input.timeframe("D", "Anchor Timeframe", tooltip = TT_RT)
// @variable The number of periods to include in the average calculation.
int lengthInput = input.int(5, "No. of periods to avg.", tooltip = TT_LI)
// @variable Controls whether the average calculation will use cumulative or non-cumulative values.
string modeInput = input.string("Cumulative", "Calculation Mode", tooltip = TT_MI, options = [MI01, MI02])
// @variable If \`true\`, the script will display the relative volume ratio.
bool showRvolInput = input.string(EQ02, "Show as Relative Ratio", tooltip = TT_SR, options = [EQ01, EQ02]) == EQ01
// @variable If \`true\` and \`modeInput\` is "Cumulative", estimates the cumulative volume on unclosed bars.
bool estimateInput = input.string(EQ02, "Estimate Unconfirmed",   tooltip = TT_AR, options = [EQ01, EQ02]) == EQ01

// @variable Is \`true\` when a new bar opens on the \`resetTimeInput\` timeframe.
bool anchor = timeframe.change(resetTimeInput)
// @variable Is \`true\` when the \`modeInput\` is "Cumulative".
bool isCumulative = modeInput == MI01

// @variable The average volume at the current time offset over the last \`lengthInput\` periods.
float pastVolume = averageAtTime(volume, lengthInput, resetTimeInput, isCumulative)
// @variable The current cumulative or non-cumulative volume in the current period.
float currentVolume = isCumulative ? calcCumulativeSeries(volume, anchor, estimateInput) : volume
// @variable The relative volume ratio.
float relativeValue = currentVolume / pastVolume

// Dispaly the values.
display(show) => show ? display.all : display.data_window
plot(relativeValue, "Relative Value",  relativeValue >= 1 ? TEAL : RED, 1, plot.style_columns, display = display(    showRvolInput), histbase = 1)
plot(pastVolume,    "Past Volume Avg", GRAY,                            1, plot.style_columns, display = display(not showRvolInput))
plot(currentVolume, "Current Volume",  close >= open      ? TEAL : RED, 1, plot.style_columns, display = display(not showRvolInput))
//#endregion
`;

export const TRADINGVIEW_TECHNICAL_RATING_V1_SOURCE = String.raw`
// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © TradingView

//@version=6
library("TechnicalRating")

// TechnicalRating Library
// v3, 2024.11.29

// This code was written using the recommendations from the Pine Script™ User Manual's Style Guide:
//   https://www.tradingview.com/pine-script-docs/en/v5/writing/Style_guide.html



import TradingView/ta/9 as ta



//#region ———————————————————— Library functions


// @function            Calculates a rating value (+1/0/-1) based on the location of a \`src\` value relative to the \`ma\`.
// @param ma            (series int/float) The moving average to compare against the \`src\` value.
// @param src           (series int/float) The source value to compare against the \`ma\`.
// @returns             (float) \`na\` if the \`src\` is \`na\`. Otherwise, 1 if the \`src\` is above the \`ma\`, -1 if the \`src\`
//                      is below the \`ma\`, or 0 if the \`src\` equals the \`ma\`.
calcRatingMA(series float ma, series float src) =>
    float result = math.sign(src - ma)


// @function            Calculates a rating value (+1/0/-1) based on two "bool" values representing bullish (upward)
//                      and bearish (downward) conditions, filtering its result based on whether the \`src\` value exists.
// @param src           (<type>) The source to check for \`na\` conditions. This value must not be \`na\` to calculate a
//                      rating value.
// @param bullCond      (series bool) The \`true\` or \`false\` state of the bullish (upward) condition.
// @param bearCond      (series bool) The \`true\` or \`false\` state of the bearish (downward) condition.
// @returns             (int) \`na\` if the \`src\` is \`na\`. Otherwise, 1 if the \`bullCond\` is \`true\`, -1 if the \`bearCond\`
//                      is \`true\`, or 0 if both are \`false\`.
calcRating(src, series bool bullCond, series bool bearCond) =>
    int result = na(src) ? na : bullCond ? 1 : bearCond ? -1 : 0


// @function            Calculates three rating values (total rating, indicator rating, and MA rating), using
//                      aggregate conditions from 26 technical indicators.
// @returns             ([float, float, float]) A tuple containing the following, each with a value between -1 and +1,
//                      or \`na\` if the information is not available:
//                          - The total rating
//                          - The oscillator and other indicator rating
//                          - The moving average rating
export calcRatingAll() =>
    [con, base, lead1, lead2, _] = ta.ichimoku()
    [kStoch, dStoch]             = ta.stochFull(14, 3, 3)
    [kStochRsi, dStochRsi]       = ta.stochRsi(14, 14, 3, 3)
    [diP, diN, adx]              = ta.dmi(14, 14)
    [macd, signal, _]            = ta.macd(close, 12, 26, 9)
    float bullPower              = high - ta.ema(close, 13)
    float bearPower              = low  - ta.ema(close, 13)
    float rsi                    = ta.rsi(close, 14)
    float cci                    = ta.cci(close, 20)
    float mom                    = ta.mom(close, 10)
    float priceAvg               = ta.ema(close, 50)
    bool  downTrend              = close < priceAvg
    bool  upTrend                = close > priceAvg
    float uo                     = ta.uo(7, 14, 28)
    float wr                     = ta.wpr(14)
    float ao                     = ta.ao()

    var array<float> indRatings = array.new<float>()
    array.clear(indRatings)
    array.push(indRatings, calcRatingMA(ta.sma(close ,  10), close))
    array.push(indRatings, calcRatingMA(ta.sma(close ,  20), close))
    array.push(indRatings, calcRatingMA(ta.sma(close ,  30), close))
    array.push(indRatings, calcRatingMA(ta.sma(close ,  50), close))
    array.push(indRatings, calcRatingMA(ta.sma(close , 100), close))
    array.push(indRatings, calcRatingMA(ta.sma(close , 200), close))
    array.push(indRatings, calcRatingMA(ta.ema(close ,  10), close))
    array.push(indRatings, calcRatingMA(ta.ema(close ,  20), close))
    array.push(indRatings, calcRatingMA(ta.ema(close ,  30), close))
    array.push(indRatings, calcRatingMA(ta.ema(close ,  50), close))
    array.push(indRatings, calcRatingMA(ta.ema(close , 100), close))
    array.push(indRatings, calcRatingMA(ta.ema(close , 200), close))
    array.push(indRatings, calcRatingMA(ta.hma(close ,   9), close))
    array.push(indRatings, calcRatingMA(ta.vwma(close,  20), close))
    array.push(indRatings, calcRating(lead2,
         lead1[26] > lead2[26] and base > lead1[26] and con > base and close > con,
         lead1[26] < lead2[26] and base < lead1[26] and con < base and close < con))

    float ratingMA = array.avg(indRatings)

    array.clear(indRatings)
    array.push(indRatings, calcRating(rsi[1],
         rsi < 30 and rsi[1] < rsi,
         rsi > 70 and rsi[1] > rsi))
    array.push(indRatings, calcRating(dStoch[1],
         kStoch < 20 and dStoch < 20 and kStoch > dStoch,
         kStoch > 80 and dStoch > 80 and kStoch < dStoch))
    array.push(indRatings, calcRating(cci[1],
         cci < -100 and cci > cci[1],
         cci >  100 and cci < cci[1]))
    array.push(indRatings, calcRating(adx,
         adx > 20 and adx > adx[1] and diP > diN,
         adx > 20 and adx > adx[1] and diP < diN))
    array.push(indRatings, calcRating(ao[1],
         ta.crossover(ao, 0) or (ao > 0 and ao[1] > 0 and ao > ao[1] and ao[2] > ao[1]),
         ta.crossunder(ao,0) or (ao < 0 and ao[1] < 0 and ao < ao[1] and ao[2] < ao[1])))
    array.push(indRatings, calcRating(mom[1], mom > mom[1], mom < mom[1]))
    array.push(indRatings, calcRating(signal,
         macd > signal,
         macd < signal))
    array.push(indRatings, calcRating(priceAvg,
         downTrend and kStochRsi < 20 and dStochRsi < 20 and kStochRsi > dStochRsi,
         upTrend   and kStochRsi > 80 and dStochRsi > 80 and kStochRsi < dStochRsi))
    array.push(indRatings, calcRating(wr[1],
         wr < -80 and wr > wr[1],
         wr > -20 and wr < wr[1]))
    array.push(indRatings, calcRating(priceAvg,
         upTrend   and bearPower < 0 and bearPower > bearPower[1],
         downTrend and bullPower > 0 and bullPower < bullPower[1]))
    array.push(indRatings, calcRating(uo, uo > 70, uo < 30))
    float ratingOther = array.avg(indRatings)

    float total = nz(ratingMA, 0) + nz(ratingOther, 0)
    float ratingTotal = switch
        not na(ratingMA) and not na(ratingOther) => total / 2
        not na(ratingMA) or  not na(ratingOther) => total
        => na

    [ratingTotal, ratingOther, ratingMA]


// @function            Tracks the rising and falling absolute values in a \`plot\` series over five bars using a counter.
//                      It adds 1 to the count when the absolute value rises and subtracts 1 when the value falls. The
//                      count is limited to a maximum of 5 and minimum of 1. If the \`plot\` is 0, the counter resets to
//                      0 until the next nonzero value is available.
// @returns             (int) A value between 1 and 5 when the \`plot\` is nonzero, 0 otherwise. A value of 5 means the
//                      absolute series rose or remained consistent consecutively over the latest five bars since the
//                      last 0 value.
export countRising(series float plot) =>
    float vPlot = math.abs(plot)
    var int result = 0
    result := switch
        vPlot == 0        => 0
        vPlot >= vPlot[1] => math.min(5, result + 1)
        vPlot <  vPlot[1] => math.max(1, result - 1)
    result


// @function            Determines the rating status of a given \`ratingValue\` based on its defined boundaries.
// @param ratingValue   (series float) The rating value to process.
// @param strongBound   (series float) The threshold for a "strong" rating. The \`ratingValue\` has a "strong" status
//                      only if its absolute value is above this threshold.
// @param weakBound     (series float) The threshold for a non-neutral rating. The \`ratingValue\` has a "Buy" or "Sell"
//                      status only if its absolute value is above this threshold. Otherwise, the status is "Neutral".
// @returns             (string) A "string" representing the rating status assigned to the \`ratingValue\`
//                      ("Strong\nSell", "Sell", "Neutral", "Buy", or "Strong\nBuy"). If the \`ratingValue\` is \`na\`,
//                      the returned "string" is "-".
export ratingStatus(series float ratingValue, series float strongBound = 0.5, series float weakBound = 0.1) =>
    string result = switch
        na(ratingValue)            => "-"
        ratingValue < -strongBound => "Strong\nSell"
        ratingValue < -weakBound   => "Sell"
        ratingValue >  strongBound => "Strong\nBuy "
        ratingValue >  weakBound   => "Buy"
        =>                            "Neutral"
//#endregion



//#region ———————————————————— Example code


// Color constants
color SOFT    = #5b9cf6
color ROYAL   = #2962ff
color MISCHKA = #a8adbc
color PINK    = #ef9a9a
color RED     = #f44336

// Numeric constants
float STRONG_BOUND = 0.5
float WEAK_BOUND   = 0.1
float BAND         = 0.2
float ZERO         = 0.0

// Calculate overall ratings.
[ratingTotal, _, _]  = calcRatingAll()

// Calculate a color gradient for the plot and label based on the \`ratingTotal\` value.
color buyColor  = color.from_gradient(ratingTotal,  ZERO, BAND, MISCHKA,   ROYAL)
color sellColor = color.from_gradient(ratingTotal, -BAND, ZERO, RED,       MISCHKA)
color gradColor = color.from_gradient(ratingTotal, -BAND, BAND, sellColor, buyColor)

// Determine values and conditions for the positive and negative ratings series.
bool  posCond   = ratingTotal >  WEAK_BOUND
bool  negCond   = ratingTotal < -WEAK_BOUND
float posSeries = posCond ? ratingTotal : ZERO
float negSeries = negCond ? ratingTotal : ZERO

// Count bars with increasing positive or negative ratings to determine the transparency of the \`gradColor\`.
int   posCount  = countRising(posSeries)
int   negCount  = countRising(negSeries)
int   perc      = posCond ? posCount : negCond ? negCount : 0
color curColor  = color.new(gradColor, 50 - perc * 10)

// Plot the total rating as columns.
plot(ratingTotal, "Rating", curColor, 1, plot.style_columns)

// On the last bar, draw a label displaying the ratings status.
if barstate.islast
	var label signal = label.new(bar_index, 0, "", textcolor = chart.fg_color, style = label.style_label_left)
	label.set_xy(signal, bar_index + 1, ratingTotal)
	label.set_text(signal, ratingStatus(ratingTotal, STRONG_BOUND, WEAK_BOUND))
	label.set_color(signal, curColor)
//#endregion
`;

export const TRADINGVIEW_TA_V10_SOURCE = String.raw`
// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © TradingView

//@version=6
library("ta")

// "ta" Library
// v10, 2025.04.24

// This code was written using the recommendations from the Pine Script™ User Manual's Style Guide:
//   https://www.tradingview.com/pine-script-docs/en/v5/writing/Style_guide.html



import TradingView/RelativeValue/3 as TVrv



// This library exports the following functions:

// • ao():                     Awesome Oscillator
// • aroon():                  Aroon Oscillator
// • atr2():                   Average True Range (Alternate Version)
// • cagr():                   Compound Annual Growth Rate
// • changePercent():          Calculate percentage change
// • coppock():                Coppock Curve
// • dema():                   Double Exponential Moving Average
// • dema2():                  Double Exponential Moving Average (Alternate Version)
// • dm():                     Demarker Indicator
// • donchian():               Donchian Channel
// • ema2():                   Exponential Moving Average (Alternate Version)
// • eom():                    Ease of Movement
// • frama():                  Fractal Adaptive Moving Average
// • ft():                     Fisher Transform
// • highestSince():           Highest value since condition
// • ht():                     Hilbert Transform function
// • ichimoku():               Ichimoku Cloud
// • ift():                    Inverse Fisher Transform
// • kvo():                    Klinger Volume Oscillator
// • lowestSince():            Lowest value since condition
// • relativeVolume():         Compare volume to its historical average
// • requestUpAndDownVolume(): Requests up/down volume data for a specified lower timeframe.
// • requestVolumeDelta():     Requests volume delta or cumulative volume delta from a specified lower timeframe.
// • rma2():                   Rolling Moving Average (Alternate Version)
// • rms():                    Root Mean Square
// • rwi():                    Random Walk Index
// • stc():                    Schaff Trend Cycle
// • stochFull():              Full Stochastic Oscillator
// • stochRsi():               Stochastic RSI
// • supertrend():             SuperTrend Indicator
// • supertrend2():            SuperTrend Indicator (Alternate Version)
// • szo():                    Sentiment Zone Oscillator
// • t3():                     Tilson Moving Average (T3)
// • t3Alt():                  Tilson Moving Average (T3 Alternate Version)
// • tema():                   Triple Exponential Moving Average
// • tema2():                  Triple Exponential Moving Average (Alternate Version)
// • trima():                  Triangular Moving Average
// • trix():                   TRIX indicator
// • uo():                     Ultimate Oscillator
// • vhf():                    Vertical Horizontal Filter
// • vi():                     Vortex Indicator
// • vStop():                  Volatility Stop
// • vStop2():                 Volatility Stop (Alternate Version)
// • vzo():                    Volume Zone Oscillator
// • williamsFractal():        Williams' Fractal
// • wpo():                    Wave Period Oscillator



// @function                Calculates the dynamic Exponentially Weighted Moving Average used in
//                          \`atr2()\`, \`ema2()\`, \`frama()\`, and \`rma2()\`.
// @param source            (series int/float) Series of values to process.
// @param alpha             (series int/float) The smoothing parameter of the filter.
// @returns                 The dynamic exponentially weighted moving average value.
ewma(series float source, series float alpha) =>
    float result = na
    result := alpha * source + (1.0 - alpha) * nz(result[1], source)


// @function                Calculates the value of the Awesome Oscillator.
// @param source            (series int/float) Series of values to process.
// @param shortLength       (simple int) Number of bars for the fast moving average (length).
// @param longLength        (simple int) Number of bars for the slow moving average (length).
// @returns                 (float) The oscillator value.
export ao(series float source = hl2, simple int shortLength = 5, simple int longLength = 34) =>
    float result = ta.sma(source, shortLength) - ta.sma(source, longLength)


// @function                Calculates the values of the Aroon indicator.
// @param length            (simple int) Number of bars (length).
// @returns                 ([float, float]) A tuple of the Aroon-Up and Aroon-Down values.
export aroon(simple int length) =>
    float aroonDown = 100 * (ta.lowestbars(low,   length + 1) + length) / length
    float aroonUp   = 100 * (ta.highestbars(high, length + 1) + length) / length
    [aroonUp, aroonDown]


// @function                An alternate ATR function to the \`ta.atr()\` built-in, which allows a "series float"
//                          \`length\` argument.
// @param length            (series int/float) Length for the smoothing parameter calculation.
// @returns                 (float) The ATR value.
export atr2(series float length) =>
    float alpha  = 1.0 / math.max(1.0, length)
    float result = ewma(ta.tr(true), alpha)


// @function                Calculates the "Compound Annual Growth Rate" between two points in time.
// @param entryTime         (series int) The starting timestamp.
// @param entryPrice        (series int/float) The starting point's price.
// @param exitTime          (series int) The ending timestamp.
// @param exitPrice         (series int/float) The ending point's price.
// @returns                 (float) CAGR in % (50 is 50%). Returns \`na\` if there is not >=1D between \`entryTime\` and
//                          \`exitTime\`, or until the two time points have not been reached by the script.
export cagr(series int entryTime, series float entryPrice, series int exitTime, series float exitPrice) =>
    int   MS_IN_ONE_DAY = 24 * 60 * 60 * 1000
    float daysBetween = (exitTime - entryTime) / MS_IN_ONE_DAY
    float result = if daysBetween >= 1 and not (na(entryPrice) or na(exitPrice))
        float years = daysBetween / 365.
        float rate  = exitPrice / entryPrice
        100 * (math.pow(rate, 1 / years) - 1)
    else
        na


// @function                Calculates the percentage difference between two distinct values.
// @param newValue          (series int/float) The current value.
// @param oldValue          (series int/float) The previous value.
// @returns                 (float) The percentage change from the \`oldValue\` to the \`newValue\`.
export changePercent(series float newValue, series float oldValue) =>
    float result = 100 * (newValue - oldValue) / oldValue


// @function                Calculates the value of the Coppock Curve indicator.
// @param source            (series int/float) Series of values to process.
// @param longLength        (simple int) Number of bars for the fast ROC value (length).
// @param shortLength       (simple int) Number of bars for the slow ROC value (length).
// @param smoothLength      (simple int) Number of bars for the weigted moving average value (length).
// @returns                 (float) The oscillator value.
export coppock(series float source, simple int longLength, simple int shortLength, simple int smoothLength) =>
    float result = ta.wma(ta.roc(source, longLength) + ta.roc(source, shortLength), smoothLength)


// @function                Calculates the value of the Double Exponential Moving Average (DEMA).
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @returns                 (float) The double exponentially weighted moving average of the \`source\`.
export dema(series float source, simple int length) =>
    float ema1   = ta.ema(source,  length)
    float ema2   = ta.ema(ema1, length)
    float result = 2 * ema1 - ema2


// @function                An alternate EMA function to the \`ta.ema()\` built-in, which allows a "series float"
//                          \`length\` argument.
// @param source            (series int/float) Series of values to process.
// @param length            (series int/float) Length for the smoothing parameter calculation.
// @returns                 (float) The exponentially weighted moving average of the \`source\`.
export ema2(series float source, series float length) =>
    float alpha  = 2.0 / (math.max(1.0, length) + 1.0)
    float result = ewma(source, alpha)


// @function                An alternate Double Exponential Moving Average (DEMA) function to \`dema()\`, which allows a
//                          "series float" \`length\` argument.
// @param source            (series int/float) Series of values to process.
// @param length            (series int/float) Length for the smoothing parameter calculation.
// @returns                 (float) The double exponentially weighted moving average of the \`source\`.
export dema2(series float source, series float length) =>
    float ema1   = ema2(source,  length)
    float ema2   = ema2(ema1, length)
    float result = 2 * ema1 - ema2


// @function                Calculates the value of the "Demarker" indicator.
//                          "DeMark®" is a registered trademark of DeMark Analytics, LLC. This code is neither
//                          endorsed, nor sponsored, nor affiliated with them.
// @param length            (simple int) Number of bars (length).
// @returns                 (float) The oscillator value.
export dm(simple int length) =>
	float demax  =  math.max(ta.change(high), 0)
	float demin  = -math.min(ta.change(low),  0)
	float result =  ta.sma(demax, length) / (ta.sma(demax, length) + ta.sma(demin, length))


// @function                Calculates the values of a Donchian Channel using \`high\` and \`low\` over a given \`length\`.
// @param length            (series int) Number of bars (length).
// @returns                 ([float, float, float]) A tuple containing the channel high, low, and median, respectively.
export donchian(series int length) =>
    float highest = ta.highest(length)
    float lowest  = ta.lowest(length)
    [highest, lowest, math.avg(highest, lowest)]


// @function                Calculates the value of the Ease of Movement indicator.
// @param length            (simple int) Number of bars (length).
// @param div               (simple int) Divisor used for normalzing values. Optional. The default is 10000.
// @returns                 (float) The oscillator value.
export eom(simple int length, simple int div = 10000) =>
    float result = ta.sma(div * ta.change(hl2) * (high - low) / volume, length)


// @function                The Fractal Adaptive Moving Average (FRAMA), developed by John Ehlers, is an adaptive
//                          moving average that dynamically adjusts its lookback period based on fractal geometry.
// @param source            (series int/float) Series of values to process.
// @param length            (series int) Number of bars (length).
// @returns                 (float) The fractal adaptive moving average of the \`source\`.
export frama(series float source, series int length) =>
    int   len    = math.round(length / 2)
    float hh     = ta.highest(len)
    float ll     = ta.lowest(len)
    float n1     = (hh - ll) / len
    float n2     = (hh[len] - ll[len]) / len
    float n3     = (ta.highest(length) - ta.lowest(length)) / length
    float D      = math.log((n1 + n2) / n3) / math.log(2)
    float alpha  = math.exp(-4.6 * (D - 1))
    float result = ewma(source, alpha)


// @function                Calculates the value of the Fisher Transform indicator.
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Number of bars (length).
// @returns                 (float) The oscillator value.
export ft(series float source, simple int length) =>
    float value1 = 0.0
    float fish   = 0.0
    float hh = ta.highest(source, length)
    float ll = ta.lowest(source,  length)
    value1 := 0.66 * ((source - ll) / (hh - ll) - 0.5) + 0.67 * nz(value1[1])
    float value2 = value1 > 0.99 ? 0.999 : value1 < -0.99 ? -0.999 : value1
    fish := 0.5 * math.log((1 + value2) / (1 - value2)) + 0.5 * nz(fish[1])
    float result = fish


// @function                Tracks the highest value of a series since the last occurrence of a condition.
// @param cond              (series bool) A condition which, when \`true\`, resets the tracking of the highest \`source\`.
// @param source            (series int/float) Series of values to process. Optional. The default is \`high\`.
// @returns                 (float) The highest \`source\` value since the last time the \`cond\` was \`true\`.
export highestSince(series bool cond, series float source = high) =>
    var float result = na
    if cond
        result := source
    result := math.max(nz(source, result), nz(result, source))


// @function                Calculates the value of the Hilbert Transform indicator.
// @param source            (series int/float) Series of values to process.
// @returns                 (float) The oscillator value.
export ht(series float source) =>
    float result = 0.0962 * source + 0.5769 * nz(source[2]) - 0.5769 * nz(source[4]) - 0.0962 * nz(source[6])


// @function                Calculates the midpoint between the highest \`high\` and lowest \`low\` over \`length\` bars.
// @param length            (series int) Number of bars (length).
// @returns                 The midpoint of the data.
midpoint(series int length) =>
    float result = math.avg(ta.highest(length), ta.lowest(length))


// @function                Calculates values of the Ichimoku Cloud indicator, including tenkan, kijun, senkouSpan1,
//                          senkouSpan2, and chikou.
//                          NOTE: offsets forward or backward can be done using the \`offset\` argument in \`plot()\`.
// @param conLength         (series int) Length for the Conversion Line (Tenkan). The default is 9 periods, which
//                          returns the mid-point of the 9 period Donchian Channel.
// @param baseLength        (series int) Length for the Base Line (Kijun-sen). The default is 26 periods, which returns
//                          the mid-point of the 26 period Donchian Channel.
// @param senkouLength      (series int) Length for the Senkou Span 2 (Leading Span B). The default is 52 periods,
//                          which returns the mid-point of the 52 period Donchian Channel.
// @returns                 ([float, float, float, float, float]) A tuple of the Tenkan, Kijun, Senkou Span 1,
//                          Senkou Span 2, and Chikou Span values. NOTE: by default, the senkouSpan1 and senkouSpan2
//                          should be plotted 26 periods in the future, and the Chikou Span plotted 26 days in the past.
export ichimoku(series int conLength = 9, series int baseLength = 26, series int senkouLength = 52) =>
    float tenkan      = midpoint(conLength)
    float kijun       = midpoint(baseLength)
    float senkouSpan1 = math.avg(tenkan, kijun)
    float senkouSpan2 = midpoint(senkouLength)
    float chikou      = close
    [tenkan, kijun, senkouSpan1, senkouSpan2, chikou]


// @function                Calculates the value of the Inverse Fisher Transform indicator.
// @param source            (series int/float) Series of values to process.
// @returns                 (float) The oscillator value.
export ift(series float source) =>
    float exp    = math.exp(2.0 * source)
    float result = (exp - 1.0) / (1.0 + exp)


// @function                Calculates the values of the Klinger Volume Oscillator.
// @param fastLen           (simple int) Length for the fast moving average smoothing parameter calculation.
// @param slowLen           (simple int) Length for the slow moving average smoothing parameter calculation.
// @param trigLen           (simple int) Length for the trigger moving average smoothing parameter calculation.
// @returns                 ([float, float]) A tuple of the KVO value, and the trigger value.
export kvo(simple int fastLen, simple int slowLen, simple int trigLen) =>
    float trend   = math.sign(ta.change(hlc3)) * volume * 100
    float fast    = ta.ema(trend, fastLen)
    float slow    = ta.ema(trend, slowLen)
    float kvo     = fast - slow
    float trigger = ta.ema(kvo, trigLen)
    [kvo, trigger]


// @function                Tracks the lowest value of a series since the last occurrence of a condition.
// @param cond              (series bool) A condition which, when \`true\`, resets the tracking of the lowest \`source\`.
// @param source            (series int/float) Series of values to process. Optional. The default is \`low\`.
// @returns                 (float) The lowest \`source\` value since the last time the \`cond\` was \`true\`.
export lowestSince(series bool cond, series float source = low) =>
    var float result = na
    if cond
        result := source
    result := math.min(nz(source, result), nz(result, source))


// @function                The "zone" calculation used in \`pzo()\` and \`vzo()\` functions.
// @param source            (series float) Series of values to process.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @returns                 (float) The oscillator value.
zone(series float source, simple int length) =>
    float result = 100 * nz(ta.ema(math.sign(ta.change(close)) * source, length) / ta.ema(source, length))


// @function                Calculates the value of the Price Zone Oscillator.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @returns                 (float) The oscillator value.
export pzo(simple int length) =>
    float result = zone(close, length)


// @function                Calculates the volume since the last change in the time value from the
//                          \`anchorTimeframe\`, the historical average volume using bars from past periods
//                          that have the same relative time offset as the current bar from the start of its
//                          period, and the ratio of these volumes. The volume values are cumulative by default,
//                          but can be adjusted to non-accumulated with the \`isCumulative\` parameter.
// @param length            (simple int) The number of periods to use for the historical average calculation.
// @param anchorTimeframe   (simple string) The anchor timeframe used in the calculation. Optional. Default is "D".
// @param isCumulative      (simple bool) If \`true\`, the volume values will be accumulated since the start of the last
//                          \`anchorTimeframe\`. If \`false\`, values will be used without accumulation. Optional. The
//                          default is \`true\`.
// @param adjustRealtime    (simple bool) If \`true\`, estimates the cumulative value on unclosed bars based on the
//                          data since the last \`anchor\` condition. Optional. The default is \`false\`.
// @returns                 ([float, float, float]) A tuple of three float values. The first element is the current
//                          volume. The second is the average of volumes at equivalent time offsets from past
//                          anchors over the specified number of periods. The third is the ratio of the current volume
//                          to the historical average volume.
export relativeVolume(
     simple int  length,              simple string anchorTimeframe = "D",
     simple bool isCumulative = true, simple bool   adjustRealtime  = true
 ) =>
    bool  anchor   = timeframe.change(anchorTimeframe)
    float currVol  = isCumulative ? TVrv.calcCumulativeSeries(volume, anchor, adjustRealtime) : volume
    float pastVol  = TVrv.averageAtTime(volume, length, anchorTimeframe, isCumulative)
    float volRatio = currVol / pastVol
    [currVol, pastVol, volRatio]


// @function                Calculates sums of polarized (positive and negative) \`volume\` values within a bar on
//                          script's main timeframe and uses the sums to compute the bar's volume delta. The function
//                          also tracks the highest and lowest volume delta values observed within the bar.
//                          It uses the following logic based on \`open\` and \`close\` prices to categorize each \`volume\`
//                          value:
//                              - If the \`close\` is greater than the \`open\`, the \`volume\` is positive.
//                              - If the \`close\` is less than the \`open\`, the \`volume\` is negative.
//                              - If the current \`close\` equals the current \`open\` and the \`close\` is greater than its
//                                previous value, the \`volume\` is positive.
//                              - If the current \`close\` equals the current \`open\` and the \`close\` is less than its
//                                previous value, the \`volume\` negative.
//                              - If none of the above apply, the current bar's \`volume\` has the same positive/negative
//                                status as that of the previous bar.
//
//                          This function's result is usable in lower-timeframe \`request.*()\` calls, as demonstrated in
//                          \`requestUpAndDownVolume()\`. The results from such a request always represent volume data
//                          based on all intrabars within a *single bar* on the script's *main timeframe*, because the
//                          function resets its calculations at the open of each bar on the \`timeframe.main_period\`
//                          timeframe.
//                          In contrast to \`timeframe.period\`, the value of \`timeframe.main_period\` always represents
//                          the script's main timeframe, even in requested contexts.
// @returns                 ([float, float, float, float, float]) A tuple containing the following values:
//                              - The total positive (up) volume within the bar on the script's main timeframe.
//                              - The total negative (down) volume within the bar on the script's main timeframe,
//                                expressed as a negative quantity.
//                              - The bar's volume delta (i.e., the net difference between up and down volume).
//                              - The highest volume delta observed within the bar.
//                              - The lowest volume delta observed within the bar.
upAndDownVolumeCalc() =>
    var float posVol      = 0.0
    var float negVol      = 0.0
    var float hiVol       = 0.0
    var float loVol       = 0.0
    var bool  isBuyVolume = true
    if timeframe.change(timeframe.main_period)
        posVol := 0.0
        negVol := 0.0
        hiVol  := 0.0
        loVol  := 0.0
    switch
        close > open     => isBuyVolume := true
        close < open     => isBuyVolume := false
        close > close[1] => isBuyVolume := true
        close < close[1] => isBuyVolume := false
    if isBuyVolume
        posVol += volume
    else
        negVol -= volume
    float delta = posVol + negVol
    hiVol := math.max(delta, hiVol)
    loVol := math.min(delta, loVol)
    [posVol, negVol, delta, hiVol, loVol]


// @function                Checks whether a specified timeframe string represents a smaller timeframe than the
//                          script's main timeframe. If the specified string represents a higher timeframe, the
//                          function raises a runtime error.
// @param lowerTimeframe    (series string) The timeframe string to inspect.
// @returns                 (void) The function does not return a usable value.
checkLTF(series string lowerTimeframe) =>
    if timeframe.in_seconds(lowerTimeframe) > timeframe.in_seconds(timeframe.main_period)
        runtime.error(
             str.format(
                 "Invalid lower timeframe: {2}{0}{2}. The timeframe must be lower than or equal to {2}{1}{2}",
                 lowerTimeframe, timeframe.main_period, "'"
             )
         )


// @function                Requests data from a specified lower timeframe and categorizes the volume of each intrabar
//                          within the chart bar as positive (up) or negative (down). The function uses this polarized
//                          volume data to calculate the total positive volume, total negative volume, and volume delta
//                          for a bar on the script's main timeframe.
//
//                          Calls to this function count toward a script's \`request.*()\` call limit.
// @param lowerTimeframe    (series string) The timeframe of the requested intrabar data. Accepts a valid timeframe
//                          string (e.g., "5", "15", "1D"), an empty string, \`timeframe.period\`, or
//                          \`timeframe.main_period\`. Smaller timeframes provide higher precision but cover fewer bars
//                          on the script's main timeframe. Larger timeframes cover more bars on the script's main
//                          timeframe but offer less granularity. If the specified timeframe is higher than the script's
//                          main timeframe, it causes a runtime error.
// @returns                 ([float, float, float]) A tuple containing the following values:
//                              - The total positive (up) intrabar volume within the bar on the script's main timeframe.
//                              - The total negative (down) intrabar volume within the bar on the script's main
//                                timeframe, expressed as a negative quantity.
//                              - The bar's volume delta (i.e., the net difference between up and down intrabar volume).
export requestUpAndDownVolume(series string lowerTimeframe) =>
    checkLTF(lowerTimeframe)
    [posVol, negVol, delta, _, _] = request.security(syminfo.tickerid, lowerTimeframe, upAndDownVolumeCalc())
    [posVol, negVol, delta]


// @function                Requests data from a specified lower timeframe and categorizes the volume of each
//                          intrabar within a bar on the script's main timeframe as positive (up) or negative (down).
//                          The function uses this information to calculate the bar's volume delta, i.e., the difference
//                          between the total up and down intrabar volume.
//
//                          If the call specifies a \`cumulativePeriod\` argument representing a period larger than the
//                          main timeframe, it calculates the cumulative volume delta (CVD), which is a running sum
//                          of volume delta across all bars within the period. In addition, the function tracks the
//                          highest and lowest CVD values calculated within each bar over the period. The sum and
//                          highest/lowest calculations reset when a new period starts.
//
//                          Calls to this function count toward a script's \`request.*()\` call limit.
// @param lowerTimeframe    (series string) The timeframe of the requested intrabar data. Accepts a valid timeframe
//                          string (e.g., "5", "15", "1D"), an empty string, \`timeframe.period\`, or
//                          \`timeframe.main_period\`. Smaller timeframes provide higher precision but cover fewer bars
//                          on the script's main timeframe. Larger timeframes cover more bars on the script's main
//                          timeframe but offer less granularity. If the specified timeframe is higher than the script's
//                          main timeframe, it causes a runtime error.
// @param cumulativePeriod  (series string) Determines the span of the CVD period. Accepts a valid timeframe string
//                          (e.g., "5", "15", "1D"), an empty string, \`timeframe.period\`, or \`timeframe.main_period\`.
//                          The calculations reset after a new period starts. For example, a value of "1D" means that
//                          the function accumulates and tracks the values from each bar within a "1D" period and resets
//                          at the open of a new "1D" bar.
// @returns                 ([float, float, float, float]) A tuple containing the following values:
//                              - The opening volume delta/CVD at the start the bar on the script's main timeframe.
//                                This value is always 0 when a new cumulative period starts.
//                              - The maximum volume delta/CVD within the current cumulative period.
//                              - The minimum volume delta/CVD within the current cumulative period.
//                              - The current volume delta/CVD value.
export requestVolumeDelta(series string lowerTimeframe, series string cumulativePeriod = "") =>
    checkLTF(lowerTimeframe)
    [_, _, delta, maxVolume, minVolume] = request.security(syminfo.tickerid, lowerTimeframe, upAndDownVolumeCalc())
    var float lastVolume = 0.0
    bool anchorChange = str.length(str.trim(cumulativePeriod)) == 0 or
         timeframe.change(cumulativePeriod) or (not na(lastVolume) and na(lastVolume[1]))
    float openVolume = anchorChange ? 0.0 : lastVolume[1]
    float hiVolume  = openVolume + maxVolume
    float loVolume  = openVolume + minVolume
    lastVolume := openVolume + delta
    [openVolume, hiVolume, loVolume, lastVolume]


// @function                An alternate RMA function to the \`ta.rma()\` built-in, which allows a "series float"
//                          \`length\` argument.
// @param source            (series int/float) Series of values to process.
// @param length            (series int/float) Length for the smoothing parameter calculation.
// @returns                 (float) The rolling moving average of the \`source\`.
export rma2(series float source, series float length) =>
    float alpha  = 1.0 / math.max(1.0, length)
    float result = ewma(source, alpha)


// @function                Calculates the Root Mean Square of the \`source\` over the \`length\`.
// @param source            (series int/float) Series of values to process.
// @param length            (series int) Number of bars (length).
// @returns                 (float) The RMS value.
export rms(series float source, series int length) =>
    float result = math.sqrt(math.sum(math.pow(source, 2), length) / length)


// @function                Calculates the values of the Random Walk Index.
// @param length            (simple int) Lookback and ATR smoothing parameter length.
// @returns                 ([float, float]) A tuple of the \`rwiHigh\` and \`rwiLow\` values.
export rwi(simple int length) =>
    float divisor = ta.atr(length) * math.sqrt(length)
    float rwiHigh = (high - nz(low[length])) / divisor
    float rwiLow  = (nz(high[length]) - low) / divisor
    [rwiHigh, rwiLow]


// @function                Calculates the value of the Schaff Trend Cycle indicator.
// @param source            (series int/float) Series of values to process.
// @param fast              (simple int) Length for the MACD fast smoothing parameter calculation.
// @param slow              (simple int) Length for the MACD slow smoothing parameter calculation.
// @param cycle             (simple int) Number of bars for the Stochastic values (length).
// @param d1                (simple int) Length for the initial %D smoothing parameter calculation.
// @param d2                (simple int) Length for the final %D smoothing parameter calculation.
// @returns                 (float) The oscillator value.
export stc(series float source, simple int fast, simple int slow, simple int cycle, simple int d1, simple int d2) =>
    float macd   = ta.ema(source, fast) - ta.ema(source, slow)
    float k      = nz(fixnan(ta.stoch(macd, macd, macd, cycle)))
    float d      = ta.ema(k, d1)
    float kd     = nz(fixnan(ta.stoch(d, d, d, cycle)))
    float stc    = ta.ema(kd, d2)
    float result = math.max(math.min(stc, 100), 0)


// @function                Calculates the %K and %D values of the Full Stochastic indicator.
// @param periodK           (simple int) Number of bars for Stochastic calculation. (length).
// @param smoothK           (simple int) Number of bars for smoothing of the %K value (length).
// @param periodD           (simple int) Number of bars for smoothing of the %D value (length).
// @returns                 ([float, float]) A tuple of the slow %K and the %D moving average values.
export stochFull(simple int periodK, simple int smoothK, simple int periodD) =>
    float k = ta.sma(ta.stoch(close, high, low, periodK), smoothK)
    float d = ta.sma(k, periodD)
    [k, d]


// @function                Calculates the %K and %D values of the Stochastic RSI indicator.
// @param lengthRsi         (simple int) Length for the RSI smoothing parameter calculation.
// @param periodK           (simple int) Number of bars for Stochastic calculation. (length).
// @param smoothK           (simple int) Number of bars for smoothing of the %K value (length).
// @param periodD           (simple int) Number of bars for smoothing of the %D value (length).
// @param source            (series int/float) Series of values to process. Optional. The default is \`close\`.
// @returns                 ([float, float]) A tuple of the slow %K and the %D moving average values.
export stochRsi(
     simple int lengthRsi, simple int periodK, simple int smoothK, simple int periodD, series float source = close
 ) =>
    float rsi = ta.rsi(source, lengthRsi)
    float k   = ta.sma(ta.stoch(rsi, rsi, rsi, periodK), smoothK)
    float d   = ta.sma(k, periodD)
    [k, d]


// @function                Calculates the values of the SuperTrend indicator with the ability to take candle wicks
//                          into account, rather than only the closing price.
// @param factor            (series int/float) Multiplier for the ATR value.
// @param atrLength         (simple int) Length for the ATR smoothing parameter calculation.
// @param wicks             (simple bool) Condition to determine whether to take candle wicks into account when
//                          reversing trend, or to use the close price. Optional. Default is false.
// @returns                 ([float, int]) A tuple of the superTrend value and trend direction.
export supertrend(series float factor, simple int atrLength, simple bool wicks = false) =>
	float source        = hl2
    int   direction     = na
	float superTrend    = na
	float atr           = ta.atr(atrLength) * factor
	float upperBand     = source + atr
	float lowerBand     = source - atr
	float highPrice 	= wicks ? high : close
    float lowPrice  	= wicks ? low  : close
	float prevLowerBand = nz(lowerBand[1])
	float prevUpperBand = nz(upperBand[1])

	lowerBand := lowerBand > prevLowerBand or  lowPrice[1] < prevLowerBand ? lowerBand : prevLowerBand
	upperBand := upperBand < prevUpperBand or highPrice[1] > prevUpperBand ? upperBand : prevUpperBand
	float prevSuperTrend  = superTrend[1]
	if na(atr[1])
		direction := 1
	else if prevSuperTrend == prevUpperBand
		direction := highPrice > upperBand ? -1 : 1
	else
		direction := lowPrice < lowerBand ? 1 : -1
	superTrend := direction == -1 ? lowerBand : upperBand
	[superTrend, direction]


// @function                An alternate SuperTrend function to \`supertrend()\`, which allows a "series float"
//                          \`atrLength\` argument.
// @param factor            (series int/float) Multiplier for the ATR value.
// @param atrLength         (series int/float) Length for the ATR smoothing parameter calculation.
// @param wicks             (simple bool) Condition to determine whether to take candle wicks into account when
//                          reversing trend, or to use the close price. Optional. Default is false.
// @returns                 ([float, int]) A tuple of the superTrend value and trend direction.
export supertrend2(series float factor, series float atrLength, simple bool wicks = false) =>
	float source        = hl2
    int   direction     = na
	float superTrend    = na
	float atr           = atr2(atrLength) * factor
	float upperBand     = source + atr
	float lowerBand     = source - atr
	float highPrice 	= wicks ? high : close
    float lowPrice  	= wicks ? low  : close
	float prevLowerBand = nz(lowerBand[1])
	float prevUpperBand = nz(upperBand[1])

	lowerBand := lowerBand > prevLowerBand or  lowPrice[1] < prevLowerBand ? lowerBand : prevLowerBand
	upperBand := upperBand < prevUpperBand or highPrice[1] > prevUpperBand ? upperBand : prevUpperBand
	float prevSuperTrend  = superTrend[1]
	if na(atr[1])
		direction := 1
	else if prevSuperTrend == prevUpperBand
		direction := highPrice > upperBand ? -1 : 1
	else
		direction := lowPrice < lowerBand ? 1 : -1
	superTrend := direction == -1 ? lowerBand : upperBand
	[superTrend, direction]


// @function                Calculates the Generalized DEMA (GD) used in the \`t3()\` function.
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @param vf                (simple float) Volume factor. Affects the responsiveness.
// @returns                 (float) The GD value of the \`source\`.
gd(series float source, simple int length, simple float vf) =>
    float result = ta.ema(source, length) * (1 + vf) - ta.ema(ta.ema(source, length), length) * vf


// @function                Calculates the value of the Tilson Moving Average (T3).
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @param vf                (simple float) Volume factor. Affects the responsiveness.
// @returns                 (float) The Tilson moving average of the \`source\`.
export t3(series float source, simple int length, simple float vf = 0.7) =>
    float result = gd(gd(gd(source, length, vf), length, vf), length, vf)


// @function                An alternate Generalized DEMA (GD) function to \`gd()\`, which allows a "series float"
//                          \`length\` argument.
// @param source            (series int/float) Series of values to process.
// @param length            (series int/float) Length for the smoothing parameter calculation.
// @param vf                (simple float) Volume factor. Affects the responsiveness.
// @returns                 (float) The GD value of the \`source\`.
gd2(series float source, series float length, simple float vf) =>
    float result = ema2(source, length) * (1 + vf) - ema2(ema2(source, length), length) * vf


// @function                An alternate Tilson Moving Average (T3) function to \`t3()\`, which allows a "series float"
//                          \`length\` argument.
// @param source            (series int/float) Series of values to process.
// @param length            (series int/float) Length for the smoothing parameter calculation.
// @param vf                (simple float) Volume factor. Affects the responsiveness.
// @returns                 (float) The Tilson moving average of the \`source\`.
export t3Alt(series float source, series float length, simple float vf = 0.7) =>
    float result = gd2(gd2(gd2(source, length, vf), length, vf), length, vf)


// @function                Calculates the value of the Triple Exponential Moving Average (TEMA).
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @returns                 (float) The triple exponentially weighted moving average of the \`source\`.
export tema(series float source, simple int length) =>
    float ema1   = ta.ema(source,  length)
    float ema2   = ta.ema(ema1, length)
    float ema3   = ta.ema(ema2, length)
    float result = 3 * (ema1 - ema2) + ema3


// @function                An alternate Triple Exponential Moving Average (TEMA) function to \`tema()\`, which allows a
//                          "series float" \`length\` argument.
// @param source            (series int/float) Series of values to process.
// @param length            (series int/float) Length for the smoothing parameter calculation.
// @returns                 (float) The triple exponentially weighted moving average of the \`source\`.
export tema2(series float source, series float length) =>
    float ema1   = ema2(source,  length)
    float ema2   = ema2(ema1, length)
    float ema3   = ema2(ema2, length)
    float result = 3 * (ema1 - ema2) + ema3


// @function                Calculates the value of the Triangular Moving Average (TRIMA).
// @param source            (series int/float) Series of values to process.
// @param length            (series int) Number of bars (length).
// @returns                 (float) The triangular moving average of the \`source\`.
export trima(series float source, series int length) =>
    float result = ta.sma(ta.sma(source, math.ceil(length / 2)), math.floor(length / 2) + 1)


// @function                Calculates the values of the TRIX indicator.
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @param signalLength      (simple int) Length for smoothing the signal line.
// @param exponential       (simple bool) Condition to determine whether exponential or simple smoothing is used.
//                          Optional. The default is \`true\` (exponential smoothing).
// @returns                 ([float, float, float]) A tuple of the TRIX value, the signal value, and the histogram.
export trix(series float source, simple int length, simple int signalLength, simple bool exponential = true) =>
    float triple = ta.ema(ta.ema(ta.ema(source, length), length), length)
    float trix   = ta.roc(triple, 1)
    float signal = exponential ? ta.ema(trix, signalLength) : ta.sma(trix, signalLength)
    float hist   = trix - signal
    [trix, signal, hist]


// @function                Calculates the value of the Sentiment Zone Oscillator.
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @returns                 (float) The oscillator value.
export szo(series float source, simple int length) =>
    float trend   = math.sign(ta.change(source))
    float sentPos = tema(trend, length)
    float result  = 100 * sentPos / length


// @function                Calculates the weighted average used in the \`uo()\` function.
// @param bp                (series float) A source series representing the "Buying Pressure" value.
// @param trange            (series float) A source series representing the True Range value.
// @param length            (simple int) Number of bars (length).
// @returns                 (float) The weighted average value.
uoAverage(series float bp, series float trange, simple int length) =>
    float result = math.sum(bp, length) / math.sum(trange, length)


// @function                Calculates the value of the Ultimate Oscillator.
// @param fastLen           (series int) Number of bars for the fast smoothing average (length).
// @param midLen            (series int) Number of bars for the middle smoothing average (length).
// @param slowLen           (series int) Number of bars for the slow smoothing average (length).
// @returns                 (float) The oscillator value.
export uo(simple int fastLen, simple int midLen, simple int slowLen) =>
    float tMax   = math.max(high, close[1])
    float tMin   = math.min(low,  close[1])
    float tr     = tMax  - tMin
    float bp     = close - tMin
    float avg1   = uoAverage(bp, tr, fastLen)
    float avg2   = uoAverage(bp, tr, midLen)
    float avg3   = uoAverage(bp, tr, slowLen)
    float result = 100 * (4 * avg1 + 2 * avg2 + avg3) / 7


// @function                Calculates the value of the Vertical Horizontal Filter.
// @param source            (series int/float) Series of values to process.
// @param length            (simple int) Number of bars (length).
// @returns                 (float) The oscillator value.
export vhf(series float source, simple int length) =>
    float sumChanges = math.sum(math.abs(ta.change(source)), length)
    float result     = math.abs(ta.highest(source, length) - ta.lowest(source, length)) / sumChanges


// @function                Calculates the values of the Vortex Indicator.
// @param length            (simple int) Number of bars (length).
// @returns                 ([float, float]) A tuple of the viPlus and viMinus values.
export vi(simple int length) =>
    divisor = math.sum(ta.atr(1), length)
    viPlus  = math.sum(math.abs(high -  nz(low[1])), length) / divisor
    viMinus = math.sum(math.abs(low  - nz(high[1])), length) / divisor
    [viPlus, viMinus]


// @function                Calculates an ATR-based stop value that trails behind the \`source\`. Can serve as a
//                          possible stop-loss guide and trend identifier.
// @param source            (series int/float) Series of values that the stop trails behind.
// @param atrLength         (simple int) Length for the ATR smoothing parameter calculation.
// @param atrFactor         (series int/float) The multiplier of the ATR value. Affects the maximum distance between
//                          the stop and the \`source\` value. A value of 1 means the maximum distance is 100% of the
//                          ATR value. Optional. The default is 1.
// @returns                 ([float, bool]) A tuple of the volatility stop value and the trend direction as a "bool".
export vStop(series float source, simple int atrLength, series float atrFactor = 1) =>
    float src  = nz(source, close)
    float atrM = nz(ta.atr(atrLength) * atrFactor, ta.tr(true))
    var bool  trendUp = true
    var float max     = src
    var float min     = src
    var float stop    = 0.0
    max     := math.max(max, src)
    min     := math.min(min, src)
    stop    := nz(trendUp ? math.max(stop, max - atrM) : math.min(stop, min + atrM), src)
    trendUp := src - stop >= 0.0
    if trendUp != trendUp[1]
        max  := src
        min  := src
        stop := trendUp ? max - atrM : min + atrM
    [stop, trendUp]


// @function                An alternate Volatility Stop function to \`vStop()\`, which allows a "series float"
//                          \`atrLength\` argument.
// @param source            (series int/float) Series of values that the stop trails behind.
// @param atrLength         (series int/float) Length for the ATR smoothing parameter calculation.
// @param atrFactor         (series int/float) The multiplier of the ATR value. Affects the maximum distance between
//                          the stop and the \`source\` value. A value of 1 means the maximum distance is 100% of the
//                          ATR value. Optional. The default is 1.
// @returns                 ([float, bool]) A tuple of the volatility stop value and the trend direction as a "bool".
export vStop2(series float source, series float atrLength, series float atrFactor = 1) =>
    float src  = nz(source, close)
    float atrM = nz(atr2(atrLength) * atrFactor, ta.tr(true))
    var bool  trendUp = true
    var float max     = src
    var float min     = src
    var float stop    = 0.0
    max     := math.max(max, src)
    min     := math.min(min, src)
    stop    := nz(trendUp ? math.max(stop, max - atrM) : math.min(stop, min + atrM), src)
    trendUp := src - stop >= 0.0
    if trendUp != trendUp[1]
        max  := src
        min  := src
        stop := trendUp ? max - atrM : min + atrM
    [stop, trendUp]


// @function                Calculates the value of the Volume Zone Oscillator.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @returns                 (float) The oscillator value.
export vzo(simple int length) =>
    float result = zone(volume, length)


// @function                Detects Williams fractals (used by \`williamsFractal()\`).
// @param source            (series int/float) Series of values to process.
// @param n                 (series int) Lookback in bars.
// @param direction         (simple int) Direction of the fractal to detect (+1 for up, -1 for down).
// @returns                 (series bool) \`true\` when a fractal was detected, \`false\` otherwise.
flag(series float source, series int n, simple int direction) =>
    float src  = source * direction
    bool flag  = true
    bool flag0 = true
    bool flag1 = true
    bool flag2 = true
    bool flag3 = true
    bool flag4 = true
    for i = 1 to n
        flag  := flag  and (src[n - i] <  src[n])
        flag0 := flag0 and (src[n + i] <  src[n])
        flag1 := flag1 and (src[n + 1] <= src[n] and src[n + i + 1] < src[n])
        flag2 := flag2 and (src[n + 1] <= src[n] and src[n + 2] <= src[n] and src[n + i + 2] < src[n])
        flag3 := flag3 and (src[n + 1] <= src[n] and src[n + 2] <= src[n] and src[n + 3] <= src[n] and src[n + i + 3] < src[n])
        flag4 := flag4 and (src[n + 1] <= src[n] and src[n + 2] <= src[n] and src[n + 3] <= src[n] and src[n + 4] <= src[n] and src[n + i + 4] < src[n])
    bool flags = flag0 or flag1 or flag2 or flag3 or flag4
    bool result = (flag and flags)


// @function                Detects Williams Fractals.
// @param period            (series int) Number of bars (length).
// @returns                 ([bool, bool]) A tuple of an up fractal and down fractal. Variables are true when detected.
export williamsFractal(series int period) =>
    bool upFractal   = flag(high, period,  1)
    bool downFractal = flag(low,  period, -1)
    [upFractal, downFractal]


// @function                Calculates the value of the Wave Period Oscillator.
// @param length            (simple int) Length for the smoothing parameter calculation.
// @returns                 (float) The oscillator value.
export wpo(simple int length) =>
    float tt     = 2 * math.pi / math.asin(close[1] / high)
    float ti     = math.sign(ta.change(close)) * tt
    float result = ta.ema(ti, length)


plot(cagr(time[1], close[1], time, close))
`;
