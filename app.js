// ======================================================
// Hunter Mobile Pro - Full Engine
// ======================================================

// ------------------------------
// بخش ۱ — Data Layer + Chart Engine
// ------------------------------

let chart, candleSeries;

function createChart() {
    const chartElement = document.getElementById("chart");

    chart = LightweightCharts.createChart(chartElement, {
        layout: { background: { color: "#000" }, textColor: "#eee" },
        grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
        width: chartElement.clientWidth,
        height: chartElement.clientHeight
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: "#0f0",
        downColor: "#f00",
        borderUpColor: "#0f0",
        borderDownColor: "#f00",
        wickUpColor: "#0f0",
        wickDownColor: "#f00"
    });
}

async function fetchCandles(symbol, interval, limit = 200) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();

    return data.map(c => ({
        time: c[0] / 1000,
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4])
    }));
}

async function getDualTimeframes(symbol, ltf, htf) {
    const [ltfData, htfData] = await Promise.all([
        fetchCandles(symbol, ltf),
        fetchCandles(symbol, htf)
    ]);

    return { ltfData, htfData };
}

// ------------------------------
// بخش ۲ — Trend Engine
// ------------------------------

function SMA(data, length) {
    if (data.length < length) return null;
    const slice = data.slice(-length);
    const sum = slice.reduce((a, b) => a + b.close, 0);
    return sum / length;
}

function detectTrend(candles) {
    const ma20 = SMA(candles, 20);
    const ma50 = SMA(candles, 50);

    if (!ma20 || !ma50) return "نامشخص";
    if (ma20 > ma50) return "صعودی";
    if (ma20 < ma50) return "نزولی";
    return "رنج";
}

function trendAlignment(ltfTrend, htfTrend) {
    if (ltfTrend === "صعودی" && htfTrend === "صعودی") return "هم‌جهت صعودی";
    if (ltfTrend === "نزولی" && htfTrend === "نزولی") return "هم‌جهت نزولی";
    if (ltfTrend === "رنج" || htfTrend === "رنج") return "بازار رنج";
    return "تضاد روندها";
}

function trendEngine(ltfData, htfData) {
    const ltfTrend = detectTrend(ltfData);
    const htfTrend = detectTrend(htfData);
    const align = trendAlignment(ltfTrend, htfTrend);

    document.getElementById("trend-ltf").innerText = ltfTrend;
    document.getElementById("trend-htf").innerText = htfTrend;
    document.getElementById("trend-align").innerText = align;

    return { ltfTrend, htfTrend, align };
}

// ------------------------------
// بخش ۳ — Momentum + Impulse Engine
// ------------------------------

function getMomentum(ltfData) {
    const last = ltfData.at(-1);
    const prev = ltfData.at(-2);

    const diff = last.close - prev.close;
    const percent = (diff / prev.close) * 100;

    if (percent > 0.25) return "مومنتوم قوی صعودی";
    if (percent > 0.1) return "مومنتوم ملایم صعودی";
    if (percent < -0.25) return "مومنتوم قوی نزولی";
    if (percent < -0.1) return "مومنتوم ملایم نزولی";
    return "مومنتوم خنثی";
}

function getImpulse(ltfData) {
    const last = ltfData.at(-1);
    const prev = ltfData.at(-2);

    const diff = last.close - prev.close;
    const impulse = Math.abs(diff / prev.close) * 100;

    if (impulse > 0.5 && diff > 0) return "Impulse صعودی";
    if (impulse > 0.5 && diff < 0) return "Impulse نزولی";
    return "بدون Impulse";
}

function getSignalQuality(momentum, impulse) {
    if (momentum.includes("قوی") && impulse.includes("Impulse")) return "کیفیت عالی";
    if (momentum.includes("ملایم")) return "کیفیت متوسط";
    return "کیفیت ضعیف";
}

function momentumEngine(ltfData) {
    const momentum = getMomentum(ltfData);
    const impulse = getImpulse(ltfData);
    const quality = getSignalQuality(momentum, impulse);

    document.getElementById("momentum").innerText = momentum;
    document.getElementById("impulse").innerText = impulse;
    document.getElementById("signal-quality").innerText = quality;

    return { momentum, impulse, quality };
}

// ------------------------------
// بخش ۴ — Risk + Volatility + Noise Engine
// ------------------------------

function getVolatility(ltfData) {
    const last = ltfData.at(-1);
    const range = last.high - last.low;
    const vol = (range / last.close) * 100;

    if (vol > 1.2) return "نوسان بالا";
    if (vol > 0.6) return "نوسان متوسط";
    return "نوسان کم";
}

function getRisk(ltfData) {
    const last = ltfData.at(-1);
    const body = Math.abs(last.close - last.open);
    const wick = (last.high - last.low) - body;

    if (wick > body * 2) return "ریسک بالا";
    if (wick > body) return "ریسک متوسط";
    return "ریسک کم";
}

function getNoise(ltfData) {
    const last = ltfData.at(-1);
    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;

    if (range === 0) return "نویز بالا";

    const ratio = body / range;

    if (ratio < 0.2) return "نویز بالا";
    if (ratio < 0.4) return "نویز متوسط";
    return "نویز کم";
}

function riskEngine(ltfData) {
    const vol = getVolatility(ltfData);
    const risk = getRisk(ltfData);
    const noise = getNoise(ltfData);

    document.getElementById("volatility").innerText = vol;
    document.getElementById("risk").innerText = risk;
    document.getElementById("noise").innerText = noise;

    return { vol, risk, noise };
}

// ------------------------------
// بخش ۵ — Structure Engine
// ------------------------------

function getSupportResistance(ltfData) {
    const last20 = ltfData.slice(-20);
    const highs = last20.map(c => c.high);
    const lows = last20.map(c => c.low);

    return {
        support: Math.min(...lows),
        resistance: Math.max(...highs)
    };
}

function getZone(ltfData) {
    const last = ltfData.at(-1);
    const pos = (last.close - last.low) / (last.high - last.low);

    if (pos > 0.7) return "بالای محدوده (قدرت خریدار)";
    if (pos < 0.3) return "پایین محدوده (قدرت فروشنده)";
    return "میانه محدوده (رنج)";
}

function structureEngine(ltfData) {
    const sr = getSupportResistance(ltfData);
    const zone = getZone(ltfData);

    document.getElementById("support").innerText = sr.support.toFixed(2);
    document.getElementById("resistance").innerText = sr.resistance.toFixed(2);
    document.getElementById("zone").innerText = zone;

    return { sr, zone };
}

// ------------------------------
// بخش ۶ — Final Signal Engine
// ------------------------------

function getFinalSignal(trendInfo, momentumInfo, riskInfo, structureInfo) {

    const { align } = trendInfo;
    const { momentum, impulse } = momentumInfo;
    const { risk, noise } = riskInfo;
    const { zone } = structureInfo;

    if (
        align === "هم‌جهت صعودی" &&
        momentum.includes("صعودی") &&
        impulse.includes("صعودی") &&
        risk !== "ریسک بالا" &&
        noise !== "نویز بالا" &&
        zone !== "پایین محدوده (قدرت فروشنده)"
    ) {
        return "سیگنال خرید (Long)";
    }

    if (
        align === "هم‌جهت نزولی" &&
        momentum.includes("نزولی") &&
        impulse.includes("نزولی") &&
        risk !== "ریسک بالا" &&
        noise !== "نویز بالا" &&
        zone !== "بالای محدوده (قدرت خریدار)"
    ) {
        return "سیگنال فروش (Short)";
    }

    return "No‑Trade (بدون معامله)";
}

// ------------------------------
// قدرت کلی بازار
// ------------------------------

function calculateStrength(trendInfo, momentumInfo, riskInfo) {
    let score = 50;

    if (trendInfo.align.includes("هم‌جهت")) score += 20;
    if (trendInfo.align.includes("تضاد")) score -= 15;

    if (momentumInfo.momentum.includes("قوی")) score += 15;
    if (momentumInfo.momentum.includes("ملایم")) score += 5;

    if (riskInfo.risk === "ریسک بالا") score -= 20;
    if (riskInfo.risk === "ریسک متوسط") score -= 10;

    if (riskInfo.noise === "نویز بالا") score -= 15;

    return Math.max(5, Math.min(95, score));
}

// ------------------------------
// اجرای نهایی
// ------------------------------

function runEngines(ltfData, htfData) {
    const trendInfo = trendEngine(ltfData, htfData);
    const momentumInfo = momentumEngine(ltfData);
    const riskInfo = riskEngine(ltfData);
    const structureInfo = structureEngine(ltfData);

    const finalSignal = getFinalSignal(trendInfo, momentumInfo, riskInfo, structureInfo);
    document.getElementById("signal-type").innerText = finalSignal;

    const strength = calculateStrength(trendInfo, momentumInfo, riskInfo);
    document.getElementById("strength").innerText = strength;
}

async function updateAll() {
    const symbol = document.getElementById("symbol").value;
    const ltf = document.getElementById("interval").value;
    const htf = "1h";

    const { ltfData, htfData } = await getDualTimeframes(symbol, ltf, htf);

    candleSeries.setData(ltfData);

    runEngines(ltfData, htfData);
}

createChart();
updateAll();

document.getElementById("symbol").addEventListener("change", updateAll);
document.getElementById("interval").addEventListener("change", updateAll);
