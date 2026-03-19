import React, { useMemo, useState, useCallback, memo } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const FUND_OPTIONS = {
  ANWPX: { label: "New Perspective Fund A (ANWPX)", ticker: "ANWPX", annualReturn: 0.122 },
  AGTHX: { label: "The Growth Fund of America A (AGTHX)", ticker: "AGTHX", annualReturn: 0.1373 },
  BLEND: { label: "50/50 Blend — ANWPX & AGTHX", ticker: "BLEND", annualReturn: 0.12965 },
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


// ─── Sub-components ───────────────────────────────────────────────────────────

const InputField = memo(function InputField({ label, id, value, onChange, hint, inputMode = "text", ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        style={{
          border: "1.5px solid #e2e8f0",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 15,
          color: "#0f172a",
          background: "#f8fafc",
          outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          fontFamily: "inherit",
          width: "100%",
          boxSizing: "border-box",
        }}
        onFocus={e => { e.target.style.borderColor = "#1e40af"; e.target.style.boxShadow = "0 0 0 3px rgba(30,64,175,0.12)"; }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
        {...props}
      />
      {hint && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{hint}</p>}
    </div>
  );
});

const SelectField = memo(({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: "1.5px solid #e2e8f0",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 15,
          color: "#0f172a",
          background: "#f8fafc",
          outline: "none",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: 36,
          cursor: "pointer",
          fontFamily: "inherit",
          width: "100%",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
        onFocus={e => { e.target.style.borderColor = "#1e40af"; }}
        onBlur={e => { e.target.style.borderColor = "#e2e8f0"; }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
});

function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
    </div>
  );
}

const MetricTile = memo(function MetricTile({ label, value, sub, accent, large, icon }) {
  return (
    <div style={{
      background: accent ? "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)" : "#f8fafc",
      border: accent ? "none" : "1.5px solid #e8eef6",
      borderRadius: 16,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon && <span style={{ fontSize: 14, opacity: accent ? 0.7 : 0.5 }}>{icon}</span>}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: accent ? "rgba(255,255,255,0.65)" : "#64748b" }}>{label}</span>
      </div>
      <span style={{ fontSize: large ? 26 : 20, fontWeight: 700, color: accent ? "#fff" : "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: accent ? "rgba(255,255,255,0.55)" : "#94a3b8" }}>{sub}</span>}
    </div>
  );
});

const SummaryRow = memo(({ label, value, highlight }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "9px 14px",
      borderRadius: 10,
      background: highlight ? "#eff6ff" : "#f8fafc",
      border: highlight ? "1px solid #bfdbfe" : "1px solid transparent",
    }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? "#1e40af" : "#0f172a" }}>{value}</span>
    </div>
  );
});

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

  const handleExportPDF = useCallback(() => {
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

  const tabs = ["inputs", "results", "summary", "rates"];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f0f4ff 0%, #f8fafc 40%, #f0f9ff 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#0f172a",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          @page { size: letter; margin: 0.5in; }
        }
        input:focus, select:focus { outline: none; }
        .tab-btn { cursor: pointer; transition: all 0.2s; }
        .tab-btn:hover { background: rgba(30,64,175,0.06) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f1e4a 0%, #1e3a8a 50%, #1e40af 100%)",
        padding: "28px 32px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "30%", width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
                Internal Use Only
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              Retirement Income<br />Projection Calculator
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif", maxWidth: 520, lineHeight: 1.6 }}>
              ANWPX · AGTHX · Pacific Life Lifetime Income Creator · Social Security integration
            </p>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handlePrint} style={{
              background: "#fff", color: "#1e3a8a", border: "none", borderRadius: 12,
              padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
              fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}>
              🖨️ Print
            </button>
            <button onClick={handleExportPDF} style={{
              background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 12, padding: "10px 20px", fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}>
              ⬇️ Export PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="no-print" style={{ maxWidth: 1200, margin: "20px auto 0", display: "flex", gap: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              className="tab-btn"
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "rgba(255,255,255,0.18)" : "transparent",
                border: activeTab === tab ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
                borderRadius: 10,
                padding: "8px 18px",
                color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.55)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "capitalize",
                cursor: "pointer",
              }}
            >
              {tab === "inputs" ? "📋 Inputs" : tab === "results" ? "📊 Results" : tab === "summary" ? "📄 Summary" : "📈 Rate Table"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── INPUTS TAB ── */}
        {(activeTab === "inputs") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>

            {/* Profile Card */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel>Profile</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <InputField label="Client Name" id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} />
                <InputField label="Prepared By" id="advisorName" value={advisorName} onChange={e => setAdvisorName(e.target.value)} />
              </div>
            </div>

            {/* Retirement Profile */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel>Retirement Profile</SectionLabel>
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
              <div style={{ marginTop: 16, background: "#f0f6ff", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#1e40af", fontFamily: "'DM Sans', sans-serif" }}>
                  ⏱ <strong>{c.years} years</strong> until income begins · Pacific Life rate: <strong>{pct(c.wdRate)}</strong>
                </p>
              </div>
            </div>

            {/* Investment Assumptions */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel>Investment Assumptions</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <InputField label="Initial Investment ($)" id="pv" value={initialInvestment} onChange={e => setInitialInvestment(e.target.value)} inputMode="decimal" />
                  <InputField label="Monthly Contribution ($)" id="pmt" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} inputMode="decimal" />
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
                <div style={{ background: "#f0f6ff", borderRadius: 12, padding: "12px 16px" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#1e40af", fontFamily: "'DM Sans', sans-serif" }}>
                    📈 Selected rate: <strong>{pct(c.r)}</strong> annually · Projected value: <strong>{fmt(c.projValue)}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Income Goal */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel>Income Goal</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <InputField
                  label="Desired Monthly Retirement Income ($)"
                  id="desiredIncome"
                  value={desiredMonthlyIncome}
                  onChange={e => setDesiredMonthlyIncome(e.target.value)}
                  inputMode="decimal"
                />
                <InputField
                  label="Monthly Social Security ($)"
                  id="ss"
                  value={socialSecurityIncome}
                  onChange={e => setSocialSecurityIncome(e.target.value)}
                  inputMode="decimal"
                  hint="User estimate"
                />
                <div style={{ background: "#f0f6ff", borderRadius: 12, padding: "12px 16px" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#1e40af", fontFamily: "'DM Sans', sans-serif" }}>
                    💡 Net from investments: <strong>{fmt(c.netMoGoal)}/mo</strong> · Required capital: <strong>{fmt(c.reqCapital)}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {(activeTab === "results") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Status Banner */}
            <div style={{
              background: goalBg,
              border: `2px solid ${goalBorder}`,
              borderRadius: 20,
              padding: "24px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: goalColor, fontFamily: "'DM Sans', sans-serif" }}>
                  {c.meetsGoal ? "✓ Income Goal Met" : "✗ Income Goal Not Met"}
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.02em" }}>
                  {fmt(c.totalMo)}<span style={{ fontSize: 16, fontWeight: 400, color: "#64748b" }}>/mo total</span>
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                  {c.meetsGoal
                    ? `Exceeds desired income by ${fmt(c.moDiff)}/mo`
                    : `Short of desired income by ${fmt(Math.abs(c.moDiff))}/mo`}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "8px 24px", fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Investment income</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{fmt(c.estMoInv)}/mo</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>Social Security</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{fmt(c.ss)}/mo</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>Net needed from investments</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e40af" }}>{fmt(c.netMoGoal)}/mo</span>
              </div>
            </div>

            {/* Metric Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <MetricTile label="Projected Retirement Value" value={fmt(c.projValue)} icon="🏦" sub={`After ${c.years} yrs at ${pct(c.r)}`} />
              <MetricTile label="Required Capital" value={fmt(c.reqCapital)} icon="🎯" sub={`Net goal ÷ ${pct(c.wdRate)} rate`} />
              <MetricTile label="Capital Surplus / Shortfall" value={`${c.capDiff >= 0 ? "+" : "-"}${fmt(Math.abs(c.capDiff))}`} icon={c.capDiff >= 0 ? "✅" : "⚠️"} sub="Projected vs. required" />
              <MetricTile label="Net Monthly Goal (Investments)" value={fmt(c.netMoGoal)} icon="💼" sub="After Social Security" />
              <MetricTile label="Required Monthly Contribution" value={fmt(c.neededPMT)} icon="📅" sub="To hit net capital goal" />
              <MetricTile label="Pacific Life Withdrawal Rate" value={pct(c.wdRate)} icon="🔒" sub={`Age ${c.retAge} · ${incomeType === "singleLife" ? "Single" : "Joint"} Life`} />
            </div>

            {/* Logic Flow */}
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <SectionLabel>Calculation Logic Flow</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0, fontFamily: "'DM Sans', sans-serif" }}>
                {[
                  { label: "Desired Monthly Income", val: fmt(c.desiredMo) + "/mo" },
                  { arrow: true },
                  { label: "Subtract Social Security", val: "− " + fmt(c.ss) },
                  { arrow: true },
                  { label: "Net Goal From Investments", val: fmt(c.netMoGoal) + "/mo" },
                  { arrow: true },
                  { label: "Required Capital (÷ rate)", val: fmt(c.reqCapital) },
                ].map((item, i) => item.arrow ? (
                  <div key={i} style={{ padding: "0 8px", color: "#94a3b8", fontSize: 18 }}>→</div>
                ) : (
                  <div key={i} style={{ background: "#f0f6ff", borderRadius: 12, padding: "10px 14px", textAlign: "center", minWidth: 130 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>{item.label}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#1e3a8a" }}>{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SUMMARY TAB ── */}
        {(activeTab === "summary") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 32, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 20, borderBottom: "2px solid #f1f5f9", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>Prepared For</p>
                  <h2 style={{ margin: "6px 0 0", fontSize: 26, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#0f172a" }}>{clientName || "Client Name"}</h2>
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#64748b", textAlign: "right", lineHeight: 1.8 }}>
                  <div><strong style={{ color: "#0f172a" }}>{advisorName}</strong></div>
                  <div>{ADVISOR.company}</div>
                  <div>{ADVISOR.phone} · {ADVISOR.email}</div>
                  <div style={{ fontSize: 11 }}>{ADVISOR.address}</div>
                </div>
              </div>

              {/* Summary rows */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
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
              </div>

              {/* Advisor Talking Point */}
              <div style={{ marginTop: 24, background: "linear-gradient(135deg, #0f1e4a, #1e40af)", borderRadius: 16, padding: 24 }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", fontFamily: "'DM Sans', sans-serif" }}>
                  Advisor Talking Point
                </p>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.9)", fontFamily: "'Georgia', serif" }}>
                  {c.meetsGoal
                    ? `Based on the selected assumptions, the current strategy is on pace to support the desired retirement income objective. Estimated total monthly retirement income is ${fmt(c.totalMo)}, which includes ${fmt(c.estMoInv)} from investments and ${fmt(c.ss)} from Social Security. The current strategy projects a capital surplus of ${fmt(Math.abs(c.capDiff))}.`
                    : `Based on the selected assumptions, the current strategy is not yet on pace to support the desired retirement income objective. The projection estimates ${fmt(c.totalMo)}/month total — ${fmt(c.estMoInv)} from investments plus ${fmt(c.ss)} from Social Security — falling short by ${fmt(Math.abs(c.moDiff))}/month. The required capital shortfall is ${fmt(Math.abs(c.capDiff))}. To close this gap, the modeled monthly contribution would need to be approximately ${fmt(c.neededPMT)}.`}
                </p>
              </div>

              {/* Disclaimer */}
              <div style={{ marginTop: 20, padding: "16px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e8eef6" }}>
                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}>
                  <strong style={{ color: "#64748b" }}>Disclaimer:</strong> This illustration is for internal planning purposes only. Historical return assumptions are used for ANWPX and AGTHX. Pacific Life Lifetime Income Creator payout rates are applied at the selected income start age. Social Security income is a user-supplied estimate and is not verified. Results do not represent guaranteed future investment performance or income. Past performance does not guarantee future results. Any income guarantees are subject to Pacific Life contract terms, rider terms, and the claims-paying ability of the issuing insurer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── RATE TABLE TAB ── */}
        {(activeTab === "rates") && (
          <div className="print-card" style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e8eef6", padding: 28, boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
            <SectionLabel>Pacific Life Lifetime Income Creator — Payout Rate Table</SectionLabel>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
              Highlighted row shows your selected income start age ({c.retAge}). Rates shown are annual withdrawal percentages applied to account value.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
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
                      <tr key={row.age} style={{
                        background: isActive ? "#dbeafe" : i % 2 === 0 ? "#f8fafc" : "#fff",
                        borderLeft: isActive ? "4px solid #1e40af" : "4px solid transparent",
                        transition: "background 0.1s",
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
        )}

      </div>
    </div>
  );
}
