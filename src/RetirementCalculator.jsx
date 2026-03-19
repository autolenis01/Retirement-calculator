import React, { useMemo, useState, useCallback, memo } from "react";
import CopilotPanel from "./copilot/CopilotPanel.jsx";

// ─── Constants ───────────────────────────────────────────────────────────────

const FUND_OPTIONS = {
  ANWPX: { label: "New Perspective Fund A (ANWPX)", ticker: "ANWPX", annualReturn: 0.122, volatility: 0.155, description: "Global equity fund with broad diversification" },
  AGTHX: { label: "The Growth Fund of America A (AGTHX)", ticker: "AGTHX", annualReturn: 0.1373, volatility: 0.17, description: "Large-cap U.S. growth focused fund" },
  BLEND: { label: "50/50 Blend — ANWPX & AGTHX", ticker: "BLEND", annualReturn: 0.12965, volatility: 0.145, description: "Balanced blend for reduced volatility" },
};

const PACIFIC_RATES = {
  singleLife: {
    50:0.056,51:0.057,52:0.058,53:0.059,54:0.06,55:0.061,56:0.062,57:0.063,58:0.064,59:0.065,
    60:0.066,61:0.0675,62:0.069,63:0.0705,64:0.072,65:0.073,66:0.074,67:0.075,68:0.076,69:0.077,
    70:0.078,71:0.079,72:0.08,73:0.081,74:0.082,75:0.083,76:0.084,77:0.085,78:0.086,79:0.087,80:0.088,
  },
  jointLife: {
    50:0.051,51:0.052,52:0.053,53:0.054,54:0.055,55:0.056,56:0.057,57:0.058,58:0.059,59:0.06,
    60:0.061,61:0.0625,62:0.064,63:0.0655,64:0.067,65:0.068,66:0.069,67:0.07,68:0.071,69:0.072,
    70:0.073,71:0.074,72:0.075,73:0.076,74:0.077,75:0.078,76:0.079,77:0.08,78:0.081,79:0.082,80:0.083,
  },
};

const MIN_AGE = 50;
const MAX_AGE = 80;

const ADVISOR = {
  name: "Markist Athelus, Financial Services Agent, District 41",
  email: "mathelus@farmersagent.com",
  phone: "361-717-4215",
  company: "Farmers Financial Solutions, LLC",
  address: "12800 Westridge Dr, Frisco, TX 75035",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function clampAge(n) {
  if (!Number.isFinite(n)) return MIN_AGE;
  return Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(n)));
}

function parseNum(str) {
  const n = Number(String(str).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function pct(n) {
  return `${(n * 100).toFixed(2)}%`;
}

function fv(pv, pmt, r, months) {
  if (months <= 0) return pv;
  const mr = r / 12;
  const gf = Math.pow(1 + mr, months);
  const pvFv = pv * gf;
  const pmtFv = mr === 0 ? pmt * months : pmt * ((gf - 1) / mr);
  return pvFv + pmtFv;
}

function requiredPMT(target, pv, r, months) {
  if (months <= 0) return 0;
  const mr = r / 12;
  const gf = Math.pow(1 + mr, months);
  const remaining = target - pv * gf;
  if (remaining <= 0) return 0;
  return mr === 0 ? remaining / months : (remaining * mr) / (gf - 1);
}

function buildGrowthTimeline(pv, pmt, r, curAge, retAge) {
  const timeline = [];
  let totalContributed = pv;
  for (let age = curAge; age <= retAge; age++) {
    const yearsElapsed = age - curAge;
    const months = yearsElapsed * 12;
    const value = fv(pv, pmt, r, months);
    const contributed = pv + pmt * months;
    totalContributed = contributed;
    timeline.push({
      age,
      year: yearsElapsed,
      value,
      contributed,
      growth: value - contributed,
      totalReturnPct: contributed > 0 ? ((value - contributed) / contributed) : 0,
    });
  }
  return timeline;
}


// ─── CSS-in-JS Styles ────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .print-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
    @page { size: letter; margin: 0.5in; }
  }
  input:focus, select:focus { outline: none; }
  .tab-btn { cursor: pointer; transition: all 0.25s ease; }
  .tab-btn:hover { background: rgba(255,255,255,0.12) !important; transform: translateY(-1px); }
  .card-hover { transition: all 0.25s ease; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(15,23,42,0.1) !important; }
  .metric-hover { transition: all 0.25s ease; }
  .metric-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(15,23,42,0.08) !important; }
  .btn-hover { transition: all 0.2s ease; }
  .btn-hover:hover { transform: translateY(-1px); opacity: 0.92; }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); }
    50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
  }
  @keyframes progressFill {
    from { width: 0; }
  }
  .animate-in { animation: fadeInUp 0.5s ease-out both; }
  .animate-scale { animation: scaleIn 0.4s ease-out both; }
  .rate-row { transition: all 0.15s ease; }
  .rate-row:hover { background: #eff6ff !important; }
  .growth-bar { animation: progressFill 1s ease-out both; }
  @keyframes drawLine {
    from { stroke-dashoffset: 2000; }
    to { stroke-dashoffset: 0; }
  }
`;


// ─── Sub-components ───────────────────────────────────────────────────────────

const InputField = memo(function InputField({ label, id, value, onChange, hint, inputMode = "text", prefix, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8", pointerEvents: "none", fontFamily: "'DM Sans', sans-serif" }}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          value={value}
          onChange={onChange}
          inputMode={inputMode}
          style={{
            border: "1.5px solid #e2e8f0",
            borderRadius: 12,
            padding: prefix ? "12px 14px 12px 28px" : "12px 14px",
            fontSize: 15,
            color: "#0f172a",
            background: "#fff",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            fontFamily: "'DM Sans', sans-serif",
            width: "100%",
            boxSizing: "border-box",
          }}
          onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          {...props}
        />
      </div>
      {hint && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{hint}</p>}
    </div>
  );
});

const SelectField = memo(({ label, value, onChange, options }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: "1.5px solid #e2e8f0",
          borderRadius: 12,
          padding: "12px 14px",
          fontSize: 15,
          color: "#0f172a",
          background: "#fff",
          outline: "none",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: 36,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          width: "100%",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={e => { e.target.style.borderColor = "#3b82f6"; }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
});

function SectionLabel({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #e2e8f0, transparent)" }} />
    </div>
  );
}

const MetricTile = memo(function MetricTile({ label, value, sub, accent, large, icon }) {
  return (
    <div className="metric-hover" style={{
      background: accent ? "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)" : "#fff",
      border: accent ? "none" : "1.5px solid #e8eef6",
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      position: "relative",
      overflow: "hidden",
    }}>
      {accent && <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 16, opacity: accent ? 0.8 : 0.6 }}>{icon}</span>}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: accent ? "rgba(255,255,255,0.7)" : "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      </div>
      <span style={{ fontSize: large ? 28 : 22, fontWeight: 700, color: accent ? "#fff" : "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: accent ? "rgba(255,255,255,0.55)" : "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>{sub}</span>}
    </div>
  );
});

const SummaryRow = memo(({ label, value, highlight }) => {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 16px",
      borderRadius: 10,
      background: highlight ? "#eff6ff" : "transparent",
      border: highlight ? "1px solid #bfdbfe" : "1px solid transparent",
      borderBottom: highlight ? undefined : "1px solid #f1f5f9",
    }}>
      <span style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? "#1e40af" : "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
    </div>
  );
});

// ─── Readiness Score Gauge ───────────────────────────────────────────────────

const ReadinessGauge = memo(function ReadinessGauge({ score, label, grade, color }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const pctFill = Math.min(100, Math.max(0, score)) / 100;
  const offset = circumference * (1 - pctFill * 0.75);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 180, height: 140 }}>
        <svg viewBox="0 0 180 140" width="180" height="140">
          <path
            d="M 20 130 A 70 70 0 1 1 160 130"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 20 130 A 70 70 0 1 1 160 130"
            fill="none"
            stroke={color || "#3b82f6"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
          />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -10%)", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: color || "#0f172a", lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>{score}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>/ 100</div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <span style={{ display: "inline-block", background: (color || "#3b82f6") + "18", color: color || "#3b82f6", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
          {grade} — {label}
        </span>
      </div>
    </div>
  );
});

// ─── Portfolio Growth Chart (pure SVG) ───────────────────────────────────────

const GrowthChart = memo(function GrowthChart({ timeline, retAge, reqCapital }) {
  if (!timeline || timeline.length < 2) return null;

  const width = 700;
  const height = 280;
  const padL = 70, padR = 20, padT = 20, padB = 40;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxVal = Math.max(...timeline.map(t => t.value), reqCapital || 0) * 1.1;
  const minAge = timeline[0].age;
  const maxAge = timeline[timeline.length - 1].age;
  const ageRange = maxAge - minAge || 1;

  const x = (age) => padL + ((age - minAge) / ageRange) * chartW;
  const y = (val) => padT + chartH - (val / maxVal) * chartH;

  const valueLine = timeline.map((t, i) => `${i === 0 ? "M" : "L"} ${x(t.age)} ${y(t.value)}`).join(" ");
  const contributedLine = timeline.map((t, i) => `${i === 0 ? "M" : "L"} ${x(t.age)} ${y(t.contributed)}`).join(" ");

  const areaPath = valueLine + ` L ${x(maxAge)} ${y(0)} L ${x(minAge)} ${y(0)} Z`;

  const gridLines = [];
  const numGridLines = 5;
  for (let i = 0; i <= numGridLines; i++) {
    const val = (maxVal / numGridLines) * i;
    gridLines.push({ y: y(val), label: fmt(val) });
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: width, display: "block", margin: "0 auto" }}>
        {/* Grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="'DM Sans', sans-serif">{g.label}</text>
          </g>
        ))}

        {/* Required capital line */}
        {reqCapital > 0 && reqCapital <= maxVal && (
          <g>
            <line x1={padL} y1={y(reqCapital)} x2={width - padR} y2={y(reqCapital)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" />
            <text x={width - padR} y={y(reqCapital) - 6} textAnchor="end" fontSize="10" fill="#ef4444" fontWeight="600" fontFamily="'DM Sans', sans-serif">
              Required: {fmt(reqCapital)}
            </text>
          </g>
        )}

        {/* Area fill */}
        <path d={areaPath} fill="url(#growthGradient)" opacity="0.15" />
        <defs>
          <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Contributed line */}
        <path d={contributedLine} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />

        {/* Value line */}
        <path d={valueLine} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* End point */}
        <circle cx={x(maxAge)} cy={y(timeline[timeline.length - 1].value)} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />

        {/* Age labels */}
        {timeline.filter((_, i) => i % Math.max(1, Math.floor(timeline.length / 8)) === 0 || i === timeline.length - 1).map((t, i) => (
          <text key={i} x={x(t.age)} y={height - 10} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="'DM Sans', sans-serif">
            {t.age}
          </text>
        ))}

        {/* Final value label */}
        <text x={x(maxAge)} y={y(timeline[timeline.length - 1].value) - 12} textAnchor="middle" fontSize="11" fill="#1e40af" fontWeight="700" fontFamily="'DM Sans', sans-serif">
          {fmt(timeline[timeline.length - 1].value)}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#64748b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 3, background: "#3b82f6", borderRadius: 2 }} />
          Portfolio Value
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 2, borderTop: "2px dashed #94a3b8" }} />
          Total Contributed
        </div>
        {reqCapital > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 2, borderTop: "2px dashed #ef4444" }} />
            Required Capital
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Retirement Readiness Score Calculator ───────────────────────────────────

function computeReadinessScore(calc) {
  let total = 0;
  const breakdown = {};

  // Capital adequacy (0-30)
  const capRatio = calc.reqCapital > 0 ? calc.projValue / calc.reqCapital : 1;
  const capScore = Math.min(30, Math.round(capRatio * 30));
  breakdown.capitalAdequacy = capScore;
  total += capScore;

  // Income replacement (0-25)
  const incomeRatio = calc.desiredMo > 0 ? calc.totalMo / calc.desiredMo : 1;
  const incomeScore = Math.min(25, Math.round(incomeRatio * 25));
  breakdown.incomeReplacement = incomeScore;
  total += incomeScore;

  // Time horizon (0-15)
  const timeScore = calc.years >= 20 ? 15 : calc.years >= 10 ? 12 : calc.years >= 5 ? 8 : 4;
  breakdown.timeHorizon = timeScore;
  total += timeScore;

  // Contribution effort (0-15)
  const contribRatio = calc.neededPMT > 0 ? Math.min(1, calc.pmt / calc.neededPMT) : 1;
  const contribScore = Math.min(15, Math.round(contribRatio * 15));
  breakdown.contributionEffort = contribScore;
  total += contribScore;

  // Safety & diversification (0-15)
  let safetyScore = 5;
  if (calc.ss > 0) safetyScore += 5;
  if (calc.years >= 10) safetyScore += 3;
  if (calc.r <= 0.14) safetyScore += 2;
  safetyScore = Math.min(15, safetyScore);
  breakdown.safetyNet = safetyScore;
  total += safetyScore;

  total = Math.min(100, total);

  let grade, label, color;
  if (total >= 90) { grade = "A+"; label = "Excellent"; color = "#059669"; }
  else if (total >= 80) { grade = "A"; label = "Very Strong"; color = "#10b981"; }
  else if (total >= 70) { grade = "B+"; label = "Good"; color = "#3b82f6"; }
  else if (total >= 60) { grade = "B"; label = "On Track"; color = "#6366f1"; }
  else if (total >= 50) { grade = "C+"; label = "Needs Attention"; color = "#f59e0b"; }
  else if (total >= 40) { grade = "C"; label = "At Risk"; color = "#f97316"; }
  else if (total >= 25) { grade = "D"; label = "Significant Gap"; color = "#ef4444"; }
  else { grade = "F"; label = "Critical"; color = "#dc2626"; }

  return { total, grade, label, color, breakdown };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RetirementCalculator() {
  const [clientName, setClientName] = useState("");
  const [advisorName, setAdvisorName] = useState(ADVISOR.name);
  const [currentAge, setCurrentAge] = useState("51");
  const [incomeStartAge, setIncomeStartAge] = useState("67");
  const [incomeType, setIncomeType] = useState("singleLife");
  const [initialInvestment, setInitialInvestment] = useState("15000");
  const [monthlyContribution, setMonthlyContribution] = useState("1000");
  const [desiredMonthlyIncome, setDesiredMonthlyIncome] = useState("5000");
  const [socialSecurityIncome, setSocialSecurityIncome] = useState("0");
  const [fundKey, setFundKey] = useState("BLEND");
  const [activeTab, setActiveTab] = useState("inputs");
  const [copilotOpen, setCopilotOpen] = useState(false);

  const calc = useMemo(() => {
    const curAge = clampAge(parseNum(currentAge));
    const retAge = clampAge(parseNum(incomeStartAge));
    const pv = parseNum(initialInvestment);
    const pmt = parseNum(monthlyContribution);
    const desiredMo = parseNum(desiredMonthlyIncome);
    const ss = parseNum(socialSecurityIncome);
    const fund = FUND_OPTIONS[fundKey];
    const r = fund.annualReturn;
    const years = Math.max(0, retAge - curAge);
    const months = years * 12;
    const wdRate = PACIFIC_RATES[incomeType][retAge] ?? PACIFIC_RATES[incomeType][MAX_AGE];

    const projValue = fv(pv, pmt, r, months);

    const netMoGoal = Math.max(0, desiredMo - ss);
    const netAnnGoal = netMoGoal * 12;
    const reqCapital = wdRate > 0 ? netAnnGoal / wdRate : 0;

    const estAnnInv = projValue * wdRate;
    const estMoInv = estAnnInv / 12;
    const totalMo = estMoInv + ss;
    const moDiff = totalMo - desiredMo;
    const capDiff = projValue - reqCapital;
    const meetsGoal = totalMo >= desiredMo;

    const neededPMT = requiredPMT(reqCapital, pv, r, months);

    return {
      curAge, retAge, pv, pmt, desiredMo, ss,
      years, months, wdRate, projValue,
      netMoGoal, netAnnGoal, reqCapital,
      estMoInv, totalMo, moDiff, capDiff, meetsGoal, neededPMT,
      fund, r,
    };
  }, [currentAge, incomeStartAge, initialInvestment, monthlyContribution, desiredMonthlyIncome, socialSecurityIncome, fundKey, incomeType]);

  // Readiness score
  const readiness = useMemo(() => computeReadinessScore(calc), [calc]);

  // Growth timeline
  const timeline = useMemo(() => buildGrowthTimeline(calc.pv, calc.pmt, calc.r, calc.curAge, calc.retAge), [calc]);

  // State object for the copilot agent
  const copilotCalcState = useMemo(() => ({
    curAge: calc.curAge,
    retAge: calc.retAge,
    pv: calc.pv,
    pmt: calc.pmt,
    desiredMo: calc.desiredMo,
    ss: calc.ss,
    r: calc.r,
    wdRate: calc.wdRate,
    incomeType,
    fund: calc.fund,
  }), [calc, incomeType]);

  const buildReport = useCallback(() => {
    const c = calc;
    const clientSafe = (clientName || "client").replace(/[^a-z0-9 ]/gi, "");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Retirement Income Projection</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #0f172a; background: #fff; padding: 0.5in; font-size: 13px; }
    h1 { font-family: Georgia, serif; font-size: 22px; margin-bottom: 4px; }
    h2 { font-family: Georgia, serif; font-size: 16px; margin: 20px 0 10px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .header { background: #1e3a8a; color: #fff; padding: 20px 24px; margin-bottom: 24px; }
    .header p { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 6px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 2px 10px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
    .advisor { font-size: 12px; color: #64748b; margin-bottom: 20px; line-height: 1.7; }
    .advisor strong { color: #0f172a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; padding: 7px 12px; background: #f8fafc; }
    .row.hl { background: #eff6ff; }
    .row span:first-child { color: #64748b; }
    .row span:last-child { font-weight: 600; }
    .row.hl span:last-child { color: #1e40af; }
    .banner { background: ${c.meetsGoal ? "#ecfdf5" : "#fef2f2"}; border: 1.5px solid ${c.meetsGoal ? "#a7f3d0" : "#fecaca"}; padding: 16px 20px; margin-bottom: 16px; }
    .banner .status { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${c.meetsGoal ? "#059669" : "#dc2626"}; margin-bottom: 6px; }
    .banner .amount { font-family: Georgia, serif; font-size: 26px; font-weight: 700; margin-bottom: 4px; }
    .banner .sub { font-size: 12px; color: #64748b; }
    .bdetail { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 10px; font-size: 12px; }
    .bdetail .k { color: #64748b; } .bdetail .v { font-weight: 600; }
    .talking { background: #1e3a8a; color: #fff; padding: 16px 20px; margin: 20px 0 16px; }
    .talking .lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
    .talking p { font-family: Georgia, serif; font-size: 13px; line-height: 1.75; color: rgba(255,255,255,0.92); }
    .disclaimer { font-size: 10px; color: #94a3b8; line-height: 1.7; border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th { background: #f0f6ff; padding: 9px 12px; text-align: left; font-weight: 700; color: #1e3a8a; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    tr.active td { background: #dbeafe; font-weight: 600; color: #1e3a8a; }
    .tip { background: #fefce8; border: 1px solid #fde047; padding: 10px 16px; font-size: 12px; color: #713f12; margin-bottom: 20px; }
    @media print { .tip { display: none !important; } @page { size: letter; margin: 0.4in; } }
  </style>
</head>
<body>
  <div class="tip">
    <strong>To save as PDF:</strong> When the print dialog opens, change the Destination/Printer to <strong>"Save as PDF"</strong> and click Save.
  </div>
  <div class="header">
    <div class="badge">Internal Use Only</div>
    <h1>Retirement Income Projection</h1>
    <p>ANWPX &middot; AGTHX &middot; Pacific Life Lifetime Income Creator &middot; Social Security integration</p>
  </div>
  <div class="advisor">
    <strong>Prepared For:</strong> ${clientSafe || "&mdash;"}<br/>
    <strong>Prepared By:</strong> ${advisorName} &middot; ${ADVISOR.company}<br/>
    ${ADVISOR.phone} &middot; ${ADVISOR.email} &middot; ${ADVISOR.address}
  </div>
  <div class="banner">
    <div class="status">${c.meetsGoal ? "&#10003; Income Goal Met" : "&#10007; Income Goal Not Met"}</div>
    <div class="amount">${fmt(c.totalMo)} <span style="font-size:14px;font-weight:400;color:#64748b">/mo total</span></div>
    <div class="sub">${c.meetsGoal ? "Exceeds desired income by " + fmt(c.moDiff) + "/mo" : "Short of desired income by " + fmt(Math.abs(c.moDiff)) + "/mo"}</div>
    <div class="bdetail">
      <span class="k">Investment income</span><span class="v">${fmt(c.estMoInv)}/mo</span>
      <span class="k">Social Security</span><span class="v">${fmt(c.ss)}/mo</span>
      <span class="k">Net needed from investments</span><span class="v">${fmt(c.netMoGoal)}/mo</span>
    </div>
  </div>
  <h2>Assumptions</h2>
  <div class="grid">
    <div class="row"><span>Current Age</span><span>${c.curAge}</span></div>
    <div class="row"><span>Income Start Age</span><span>${c.retAge}</span></div>
    <div class="row"><span>Income Type</span><span>${incomeType === "singleLife" ? "Single Life" : "Joint Life"}</span></div>
    <div class="row"><span>Years Until Income</span><span>${c.years}</span></div>
    <div class="row"><span>Initial Investment</span><span>${fmt(c.pv)}</span></div>
    <div class="row"><span>Monthly Contribution</span><span>${fmt(c.pmt)}</span></div>
    <div class="row"><span>Growth Assumption</span><span>${c.fund.ticker} &mdash; ${pct(c.r)}</span></div>
    <div class="row"><span>Pacific Life Rate</span><span>${pct(c.wdRate)}</span></div>
  </div>
  <h2>Income Goal &amp; Projection Results</h2>
  <div class="grid">
    <div class="row"><span>Desired Monthly Income</span><span>${fmt(c.desiredMo)}</span></div>
    <div class="row"><span>Estimated Social Security</span><span>${fmt(c.ss)}</span></div>
    <div class="row hl"><span>Net Goal From Investments</span><span>${fmt(c.netMoGoal)}</span></div>
    <div class="row"><span>Projected Retirement Value</span><span>${fmt(c.projValue)}</span></div>
    <div class="row hl"><span>Required Capital</span><span>${fmt(c.reqCapital)}</span></div>
    <div class="row"><span>Capital ${c.capDiff >= 0 ? "Surplus" : "Shortfall"}</span><span>${c.capDiff >= 0 ? "+" : "-"}${fmt(Math.abs(c.capDiff))}</span></div>
    <div class="row"><span>Est. Monthly Investment Income</span><span>${fmt(c.estMoInv)}</span></div>
    <div class="row hl"><span>Est. Total Monthly Income</span><span>${fmt(c.totalMo)}</span></div>
    <div class="row"><span>Required Monthly Contribution</span><span>${fmt(c.neededPMT)}</span></div>
  </div>
  <div class="talking">
    <div class="lbl">Advisor Talking Point</div>
    <p>${c.meetsGoal
      ? "Based on the selected assumptions, the current strategy is on pace to support the desired retirement income objective. Estimated total monthly retirement income is " + fmt(c.totalMo) + ", which includes " + fmt(c.estMoInv) + " from investments and " + fmt(c.ss) + " from Social Security. The current strategy projects a capital surplus of " + fmt(Math.abs(c.capDiff)) + "."
      : "Based on the selected assumptions, the current strategy is not yet on pace to support the desired retirement income objective. The projection estimates " + fmt(c.totalMo) + "/month total — " + fmt(c.estMoInv) + " from investments plus " + fmt(c.ss) + " from Social Security — falling short by " + fmt(Math.abs(c.moDiff)) + "/month. The required capital shortfall is " + fmt(Math.abs(c.capDiff)) + ". To close this gap, the modeled monthly contribution would need to be approximately " + fmt(c.neededPMT) + "."
    }</p>
  </div>
  <h2>Pacific Life Lifetime Income Creator &mdash; Rate Table</h2>
  <table>
    <thead><tr><th>Age</th><th>Single Life</th><th>Joint Life</th></tr></thead>
    <tbody>${Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i).map(age =>
      "<tr class=\"" + (age === c.retAge ? "active" : "") + "\"><td>" + age + (age === c.retAge ? " &#9733;" : "") + "</td><td>" + pct(PACIFIC_RATES.singleLife[age]) + "</td><td>" + pct(PACIFIC_RATES.jointLife[age]) + "</td></tr>"
    ).join("")}</tbody>
  </table>
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This illustration is for internal planning purposes only. Historical return assumptions are used for ANWPX and AGTHX. Pacific Life Lifetime Income Creator payout rates are applied at the selected income start age. Social Security income is a user-supplied estimate and is not verified. Results do not represent guaranteed future investment performance or income. Past performance does not guarantee future results. Any income guarantees are subject to Pacific Life contract terms, rider terms, and the claims-paying ability of the issuing insurer.
  </div>
  <script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;
  }, [calc, clientName, advisorName, incomeType]);

  const handlePrint = useCallback(() => {
    const html = buildReport();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [buildReport]);

  const handleExportHTML = useCallback(() => {
    const html = buildReport();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = (clientName || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = safe + "-retirement-projection.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [buildReport, clientName]);


  const c = calc;
  const goalColor = c.meetsGoal ? "#059669" : "#dc2626";
  const goalBg = c.meetsGoal ? "#ecfdf5" : "#fef2f2";
  const goalBorder = c.meetsGoal ? "#a7f3d0" : "#fecaca";

  const rateRows = useMemo(() =>
    Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i).map(age => ({
      age,
      single: PACIFIC_RATES.singleLife[age],
      joint: PACIFIC_RATES.jointLife[age],
    })), []);

  const tabs = ["inputs", "results", "projections", "summary", "rates"];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f0f4ff 0%, #f8fafc 40%, #f0f9ff 100%)",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      color: "#0f172a",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══════════════════════════════════════════════════════════════════════
           HEADER
          ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0f1e4a 30%, #1e3a8a 65%, #2563eb 100%)",
        padding: "32px 32px 0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative elements */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(59,130,246,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: "20%", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, left: "60%", width: 100, height: 100, borderRadius: "50%", background: "rgba(59,130,246,0.05)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(147,197,253,0.9)" }}>
                  Internal Use Only
                </span>
                <span style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, padding: "4px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6ee7b7" }}>
                  Live Calculations
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: 32, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Retirement Income<br />Projection Calculator
              </h1>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(148,163,184,0.8)", maxWidth: 520, lineHeight: 1.7 }}>
                ANWPX · AGTHX · Pacific Life Lifetime Income Creator · Social Security Integration
              </p>
            </div>
            <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn-hover" onClick={handlePrint} style={{
                background: "#fff", color: "#1e3a8a", border: "none", borderRadius: 12,
                padding: "11px 22px", fontWeight: 600,
                fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}>
                🖨️ Print Report
              </button>
              <button className="btn-hover" onClick={handleExportHTML} style={{
                background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 12, padding: "11px 22px",
                fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                backdropFilter: "blur(10px)",
              }}>
                ⬇️ Export HTML
              </button>
            </div>
          </div>

          {/* Quick stats bar */}
          <div className="no-print" style={{ display: "flex", gap: 24, flexWrap: "wrap", margin: "20px 0 24px", padding: "14px 20px", background: "rgba(255,255,255,0.06)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>📊</span>
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>Score</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: readiness.color }}>{readiness.total}</span>
              <span style={{ fontSize: 11, color: readiness.color, fontWeight: 600 }}>{readiness.grade}</span>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>💰</span>
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>Projected</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{fmt(c.projValue)}</span>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>{c.meetsGoal ? "✅" : "⚠️"}</span>
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>Income</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.meetsGoal ? "#6ee7b7" : "#fca5a5" }}>{fmt(c.totalMo)}/mo</span>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>⏱</span>
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>Timeline</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.years} years</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="no-print" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab;
              const labels = {
                inputs: "📋 Inputs",
                results: "📊 Results",
                projections: "📈 Projections",
                summary: "📄 Summary",
                rates: "🔒 Rate Table",
              };
              return (
                <button
                  key={tab}
                  className="tab-btn"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                    border: isActive ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                    borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                    borderRadius: "10px 10px 0 0",
                    padding: "10px 20px",
                    color: isActive ? "#fff" : "rgba(148,163,184,0.6)",
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           CONTENT AREA
          ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", width: "100%", flex: 1 }}>

        {/* ── INPUTS TAB ── */}
        {(activeTab === "inputs") && (
          <div className="animate-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>

            {/* Profile Card */}
            <div className="print-card card-hover" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="👤">Profile</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <InputField label="Client Name" id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Enter client name" />
                <InputField label="Prepared By" id="advisorName" value={advisorName} onChange={e => setAdvisorName(e.target.value)} />
              </div>
            </div>

            {/* Retirement Profile */}
            <div className="print-card card-hover" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="🎂">Retirement Profile</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <InputField label="Current Age" id="curAge" value={currentAge} onChange={e => setCurrentAge(e.target.value)} inputMode="numeric" hint="Ages 50–80" />
                <InputField label="Income Start Age" id="retAge" value={incomeStartAge} onChange={e => setIncomeStartAge(e.target.value)} inputMode="numeric" hint="Ages 50–80" />
              </div>
              <div style={{ marginTop: 16 }}>
                <SelectField
                  label="Income Type"
                  value={incomeType}
                  onChange={setIncomeType}
                  options={[
                    { value: "singleLife", label: "Single Life" },
                    { value: "jointLife", label: "Joint Life" },
                  ]}
                />
              </div>
              <div style={{ marginTop: 16, background: "linear-gradient(135deg, #eff6ff, #f0f9ff)", borderRadius: 12, padding: "14px 16px", border: "1px solid #bfdbfe" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1e40af" }}>
                  ⏱ <strong>{c.years} years</strong> until income begins · Pacific Life rate: <strong>{pct(c.wdRate)}</strong>
                </p>
              </div>
            </div>

            {/* Investment Assumptions */}
            <div className="print-card card-hover" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="📈">Investment Assumptions</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <InputField label="Initial Investment" id="pv" value={initialInvestment} onChange={e => setInitialInvestment(e.target.value)} inputMode="decimal" prefix="$" />
                  <InputField label="Monthly Contribution" id="pmt" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} inputMode="decimal" prefix="$" />
                </div>
                <SelectField
                  label="Growth Assumption"
                  value={fundKey}
                  onChange={setFundKey}
                  options={[
                    { value: "ANWPX", label: "ANWPX — New Perspective Fund A (12.20%)" },
                    { value: "AGTHX", label: "AGTHX — Growth Fund of America A (13.73%)" },
                    { value: "BLEND", label: "50/50 Blend ANWPX + AGTHX (12.97%)" },
                  ]}
                />
                {/* Fund info badge */}
                <div style={{ background: "linear-gradient(135deg, #eff6ff, #f0f9ff)", borderRadius: 12, padding: "14px 16px", border: "1px solid #bfdbfe" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#1e40af" }}>
                    📈 Selected rate: <strong>{pct(c.r)}</strong> annually · Projected value at retirement: <strong>{fmt(c.projValue)}</strong>
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6b7280" }}>
                    {FUND_OPTIONS[fundKey].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Income Goal */}
            <div className="print-card card-hover" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="🎯">Income Goal</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <InputField
                  label="Desired Monthly Retirement Income"
                  id="desiredIncome"
                  value={desiredMonthlyIncome}
                  onChange={e => setDesiredMonthlyIncome(e.target.value)}
                  inputMode="decimal"
                  prefix="$"
                />
                <InputField
                  label="Monthly Social Security"
                  id="ss"
                  value={socialSecurityIncome}
                  onChange={e => setSocialSecurityIncome(e.target.value)}
                  inputMode="decimal"
                  prefix="$"
                  hint="User estimate — not verified"
                />
                <div style={{ background: "linear-gradient(135deg, #eff6ff, #f0f9ff)", borderRadius: 12, padding: "14px 16px", border: "1px solid #bfdbfe" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#1e40af" }}>
                    💡 Net from investments: <strong>{fmt(c.netMoGoal)}/mo</strong> · Required capital: <strong>{fmt(c.reqCapital)}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {(activeTab === "results") && (
          <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Top row: Status banner + Readiness Score */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "stretch" }}>
              {/* Status Banner */}
              <div style={{
                background: goalBg,
                border: `2px solid ${goalBorder}`,
                borderRadius: 20,
                padding: "28px 32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: goalColor }}>
                    {c.meetsGoal ? "✓ Income Goal Met" : "✗ Income Goal Not Met"}
                  </p>
                  <p style={{ margin: "10px 0 0", fontSize: 36, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.02em" }}>
                    {fmt(c.totalMo)}<span style={{ fontSize: 16, fontWeight: 400, color: "#64748b" }}> /mo total</span>
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
                    {c.meetsGoal
                      ? `Exceeds desired income by ${fmt(c.moDiff)}/mo`
                      : `Short of desired income by ${fmt(Math.abs(c.moDiff))}/mo`}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "6px 20px", marginTop: 14 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Investment income</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{fmt(c.estMoInv)}/mo</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Social Security</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{fmt(c.ss)}/mo</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Net needed from investments</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e40af" }}>{fmt(c.netMoGoal)}/mo</span>
                  </div>
                </div>
              </div>

              {/* Readiness Score */}
              <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: "24px 32px", boxShadow: "0 4px 24px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 220 }}>
                <ReadinessGauge score={readiness.total} label={readiness.label} grade={readiness.grade} color={readiness.color} />
                <p style={{ margin: "12px 0 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>Retirement Readiness</p>
              </div>
            </div>

            {/* Metric Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <MetricTile label="Projected Retirement Value" value={fmt(c.projValue)} icon="🏦" sub={`After ${c.years} yrs at ${pct(c.r)}`} accent />
              <MetricTile label="Required Capital" value={fmt(c.reqCapital)} icon="🎯" sub={`Net goal ÷ ${pct(c.wdRate)} rate`} />
              <MetricTile label="Capital Surplus / Shortfall" value={`${c.capDiff >= 0 ? "+" : "-"}${fmt(Math.abs(c.capDiff))}`} icon={c.capDiff >= 0 ? "✅" : "⚠️"} sub="Projected vs. required" />
              <MetricTile label="Net Monthly Goal" value={fmt(c.netMoGoal)} icon="💼" sub="After Social Security" />
              <MetricTile label="Required Monthly Contribution" value={fmt(c.neededPMT)} icon="📅" sub="To hit capital goal" />
              <MetricTile label="Pacific Life Rate" value={pct(c.wdRate)} icon="🔒" sub={`Age ${c.retAge} · ${incomeType === "singleLife" ? "Single" : "Joint"} Life`} />
            </div>

            {/* Readiness Score Breakdown */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="📊">Readiness Score Breakdown</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
                {[
                  { label: "Capital Adequacy", value: readiness.breakdown.capitalAdequacy, max: 30, color: "#3b82f6" },
                  { label: "Income Replacement", value: readiness.breakdown.incomeReplacement, max: 25, color: "#6366f1" },
                  { label: "Time Horizon", value: readiness.breakdown.timeHorizon, max: 15, color: "#8b5cf6" },
                  { label: "Contribution Effort", value: readiness.breakdown.contributionEffort, max: 15, color: "#f59e0b" },
                  { label: "Safety & Diversification", value: readiness.breakdown.safetyNet, max: 15, color: "#10b981" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}/{item.max}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                      <div className="growth-bar" style={{ height: "100%", borderRadius: 3, background: item.color, width: `${(item.value / item.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logic Flow */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="🔗">Calculation Logic Flow</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
                {[
                  { label: "Desired Monthly Income", val: fmt(c.desiredMo) + "/mo" },
                  { arrow: true },
                  { label: "Subtract Social Security", val: "− " + fmt(c.ss) },
                  { arrow: true },
                  { label: "Net Goal From Investments", val: fmt(c.netMoGoal) + "/mo" },
                  { arrow: true },
                  { label: "Required Capital (÷ rate)", val: fmt(c.reqCapital) },
                ].map((item, i) => item.arrow ? (
                  <div key={i} style={{ padding: "0 10px", color: "#94a3b8", fontSize: 20 }}>→</div>
                ) : (
                  <div key={i} style={{ background: "linear-gradient(135deg, #f0f6ff, #eff6ff)", borderRadius: 12, padding: "12px 16px", textAlign: "center", minWidth: 140, border: "1px solid #bfdbfe" }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>{item.label}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 15, fontWeight: 700, color: "#1e3a8a" }}>{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECTIONS TAB ── */}
        {(activeTab === "projections") && (
          <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Portfolio Growth Chart */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="📈">Portfolio Growth Projection</SectionLabel>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
                Projected portfolio value from age {c.curAge} to {c.retAge} assuming {pct(c.r)} annual return with {fmt(c.pmt)}/mo contributions.
              </p>
              <GrowthChart timeline={timeline} retAge={c.retAge} reqCapital={c.reqCapital} />
            </div>

            {/* Key Milestones */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="🏆">Key Milestones</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[100000, 250000, 500000, 750000, 1000000].map((target) => {
                  const hit = timeline.find(t => t.value >= target);
                  const reached = !!hit;
                  return (
                    <div key={target} style={{
                      padding: "16px 18px",
                      borderRadius: 14,
                      background: reached ? "#f0fdf4" : "#fef2f2",
                      border: `1.5px solid ${reached ? "#bbf7d0" : "#fecaca"}`,
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: reached ? "#059669" : "#dc2626" }}>
                        {fmt(target)}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {reached ? `Reached at age ${hit.age}` : "Not reached in timeline"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Year-by-Year Table */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="📋">Year-by-Year Growth Timeline</SectionLabel>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f0f6ff" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Year</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Age</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Portfolio Value</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Contributed</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Growth</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Total Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((row, i) => {
                      const isLast = i === timeline.length - 1;
                      return (
                        <tr key={row.age} className="rate-row" style={{
                          background: isLast ? "#dbeafe" : i % 2 === 0 ? "#f8fafc" : "#fff",
                          borderLeft: isLast ? "4px solid #1e40af" : "4px solid transparent",
                        }}>
                          <td style={{ padding: "10px 16px", color: "#64748b" }}>{row.year}</td>
                          <td style={{ padding: "10px 16px", fontWeight: isLast ? 700 : 500, color: isLast ? "#1e3a8a" : "#0f172a" }}>
                            {row.age}
                            {isLast && <span style={{ fontSize: 10, background: "#1e40af", color: "#fff", borderRadius: 6, padding: "2px 6px", marginLeft: 6 }}>Retirement</span>}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: isLast ? 700 : 500, color: isLast ? "#1e3a8a" : "#0f172a", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{fmt(row.value)}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{fmt(row.contributed)}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: row.growth >= 0 ? "#059669" : "#dc2626", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500 }}>
                            {row.growth >= 0 ? "+" : ""}{fmt(row.growth)}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{(row.totalReturnPct * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SUMMARY TAB ── */}
        {(activeTab === "summary") && (
          <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 32, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 20, borderBottom: "2px solid #f1f5f9", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8" }}>Prepared For</p>
                  <h2 style={{ margin: "6px 0 0", fontSize: 28, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#0f172a" }}>{clientName || "Client Name"}</h2>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", textAlign: "right", lineHeight: 1.8 }}>
                  <div><strong style={{ color: "#0f172a" }}>{advisorName}</strong></div>
                  <div>{ADVISOR.company}</div>
                  <div>{ADVISOR.phone} · {ADVISOR.email}</div>
                  <div style={{ fontSize: 11 }}>{ADVISOR.address}</div>
                </div>
              </div>

              {/* Summary rows */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 6 }}>
                <SummaryRow label="Current Age" value={`${c.curAge}`} />
                <SummaryRow label="Income Start Age" value={`${c.retAge}`} />
                <SummaryRow label="Income Type" value={incomeType === "singleLife" ? "Single Life" : "Joint Life"} />
                <SummaryRow label="Years Until Income" value={`${c.years}`} />
                <SummaryRow label="Initial Investment" value={fmt(c.pv)} />
                <SummaryRow label="Monthly Contribution" value={fmt(c.pmt)} />
                <SummaryRow label="Growth Assumption" value={`${c.fund.ticker} — ${pct(c.r)}`} />
                <SummaryRow label="Pacific Life Withdrawal Rate" value={pct(c.wdRate)} />
                <SummaryRow label="Desired Monthly Income" value={fmt(c.desiredMo)} />
                <SummaryRow label="Estimated Monthly Social Security" value={fmt(c.ss)} />
                <SummaryRow label="Net Monthly Goal From Investments" value={fmt(c.netMoGoal)} highlight />
                <SummaryRow label="Projected Retirement Value" value={fmt(c.projValue)} />
                <SummaryRow label="Required Capital" value={fmt(c.reqCapital)} />
                <SummaryRow label="Capital Surplus / Shortfall" value={`${c.capDiff >= 0 ? "+" : "-"}${fmt(Math.abs(c.capDiff))}`} />
                <SummaryRow label="Est. Monthly Investment Income" value={fmt(c.estMoInv)} />
                <SummaryRow label="Estimated Total Monthly Income" value={fmt(c.totalMo)} highlight />
                <SummaryRow label="Required Monthly Contribution" value={fmt(c.neededPMT)} />
                <SummaryRow label="Retirement Readiness Score" value={`${readiness.total}/100 (${readiness.grade})`} highlight />
              </div>

              {/* Advisor Talking Point */}
              <div style={{ marginTop: 24, background: "linear-gradient(135deg, #0a1628, #1e3a8a)", borderRadius: 16, padding: 28, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(59,130,246,0.1)" }} />
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(147,197,253,0.6)" }}>
                  Advisor Talking Point
                </p>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.92)", fontFamily: "'Georgia', serif", position: "relative", zIndex: 1 }}>
                  {c.meetsGoal
                    ? `Based on the selected assumptions, the current strategy is on pace to support the desired retirement income objective. Estimated total monthly retirement income is ${fmt(c.totalMo)}, which includes ${fmt(c.estMoInv)} from investments and ${fmt(c.ss)} from Social Security. The current strategy projects a capital surplus of ${fmt(Math.abs(c.capDiff))}.`
                    : `Based on the selected assumptions, the current strategy is not yet on pace to support the desired retirement income objective. The projection estimates ${fmt(c.totalMo)}/month total — ${fmt(c.estMoInv)} from investments plus ${fmt(c.ss)} from Social Security — falling short by ${fmt(Math.abs(c.moDiff))}/month. The required capital shortfall is ${fmt(Math.abs(c.capDiff))}. To close this gap, the modeled monthly contribution would need to be approximately ${fmt(c.neededPMT)}.`}
                </p>
              </div>

              {/* Disclaimer */}
              <div style={{ marginTop: 20, padding: "16px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e8eef6" }}>
                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: "#94a3b8" }}>
                  <strong style={{ color: "#64748b" }}>Disclaimer:</strong> This illustration is for internal planning purposes only. Historical return assumptions are used for ANWPX and AGTHX. Pacific Life Lifetime Income Creator payout rates are applied at the selected income start age. Social Security income is a user-supplied estimate and is not verified. Results do not represent guaranteed future investment performance or income. Past performance does not guarantee future results. Any income guarantees are subject to Pacific Life contract terms, rider terms, and the claims-paying ability of the issuing insurer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── RATE TABLE TAB ── */}
        {(activeTab === "rates") && (
          <div className="animate-in">
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel icon="🔒">Pacific Life Lifetime Income Creator — Payout Rate Table</SectionLabel>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
                Highlighted row shows your selected income start age ({c.retAge}). Rates shown are annual withdrawal percentages applied to account value.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f0f6ff" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Age</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Single Life</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Joint Life</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", letterSpacing: "0.04em" }}>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateRows.map((row, i) => {
                      const isActive = row.age === c.retAge;
                      return (
                        <tr key={row.age} className="rate-row" style={{
                          background: isActive ? "#dbeafe" : i % 2 === 0 ? "#f8fafc" : "#fff",
                          borderLeft: isActive ? "4px solid #1e40af" : "4px solid transparent",
                        }}>
                          <td style={{ padding: "10px 16px", fontWeight: isActive ? 700 : 500, color: isActive ? "#1e3a8a" : "#0f172a" }}>
                            {row.age} {isActive && <span style={{ fontSize: 10, background: "#1e40af", color: "#fff", borderRadius: 6, padding: "2px 6px", marginLeft: 6 }}>Selected</span>}
                          </td>
                          <td style={{ padding: "10px 16px", color: isActive ? "#1e3a8a" : "#374151", fontWeight: isActive ? 600 : 400 }}>{pct(row.single)}</td>
                          <td style={{ padding: "10px 16px", color: isActive ? "#1e3a8a" : "#374151", fontWeight: isActive ? 600 : 400 }}>{pct(row.joint)}</td>
                          <td style={{ padding: "10px 16px", color: "#94a3b8", fontSize: 12 }}>{pct(row.single - row.joint)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           FOOTER
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="no-print" style={{
        background: "linear-gradient(135deg, #0a1628, #0f1e4a)",
        padding: "24px 32px",
        marginTop: "auto",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(148,163,184,0.6)", lineHeight: 1.7 }}>
              <strong style={{ color: "rgba(148,163,184,0.8)" }}>{ADVISOR.company}</strong> · {ADVISOR.address}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(148,163,184,0.4)" }}>
              For internal planning purposes only. Not a guarantee of future investment performance.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "rgba(148,163,184,0.5)" }}>
            <span>{ADVISOR.phone}</span>
            <span>·</span>
            <span>{ADVISOR.email}</span>
          </div>
        </div>
      </div>

      {/* AI Copilot Panel */}
      <CopilotPanel
        calcState={copilotCalcState}
        isOpen={copilotOpen}
        onToggle={() => setCopilotOpen(prev => !prev)}
      />
    </div>
  );
}
