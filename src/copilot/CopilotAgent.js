/**
 * CopilotAgent — Core orchestrator for the Retirement Copilot
 *
 * Manages conversation flow, dispatches classified intents to the appropriate
 * engine, maintains session context, and formats intelligent responses.
 */

import { classify, INTENTS, getSuggestions } from "./NLPEngine.js";
import {
  runProjection, compareScenario, monteCarloSimulation,
  sensitivityAnalysis, retirementReadinessScore, growthTimeline,
  findMilestones, breakevenAnalysis, compareFunds, fmt, pct,
} from "./FinancialEngine.js";
import { generateInsights, generateOptimizations, generateTalkingPoints } from "./RecommendationEngine.js";
import { searchKnowledge, getAllTopics } from "./KnowledgeBase.js";

// ─── Pacific Life Rate Lookup ────────────────────────────────────────────────

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

function getRate(incomeType, age) {
  const clamped = Math.min(80, Math.max(50, Math.round(age)));
  return PACIFIC_RATES[incomeType]?.[clamped] ?? PACIFIC_RATES[incomeType]?.[80] ?? 0.075;
}

// ─── State → Params Converter ────────────────────────────────────────────────

/**
 * Convert the calculator's React state into the params format our engines expect.
 */
export function stateToParams(calcState) {
  return {
    currentAge:          calcState.curAge ?? 51,
    retirementAge:       calcState.retAge ?? 67,
    initialInvestment:   calcState.pv ?? 15000,
    monthlyContribution: calcState.pmt ?? 1000,
    annualReturn:        calcState.r ?? 0.12965,
    withdrawalRate:      calcState.wdRate ?? 0.075,
    desiredMonthlyIncome:calcState.desiredMo ?? 5000,
    socialSecurity:      calcState.ss ?? 0,
    incomeType:          calcState.incomeType ?? "singleLife",
    fundTicker:          calcState.fund?.ticker ?? "BLEND",
  };
}

// ─── Response Builder ────────────────────────────────────────────────────────

function buildResponse(content, { type = "text", data = null, suggestions = [], chart = null } = {}) {
  return { content, type, data, suggestions, chart, timestamp: Date.now() };
}

// ─── Intent Handlers ─────────────────────────────────────────────────────────

const handlers = {
  // ── Greetings ────────────────────────────────────────────────────────────
  [INTENTS.GREETING]: (_, params) => {
    const proj = runProjection(params);
    const status = proj.meetsGoal
      ? `Good news — your plan is currently **on track** to meet your ${fmt(params.desiredMonthlyIncome)}/month income goal! 🎉`
      : `Your plan currently projects ${fmt(proj.totalMoIncome)}/month, which is ${fmt(Math.abs(proj.moDiff))} short of your goal. Let's explore ways to close that gap.`;

    return buildResponse(
      `Hello! I'm your Retirement Copilot 🧠\n\n${status}\n\nI can run simulations, analyze scenarios, explain concepts, and help optimize your retirement strategy. What would you like to explore?`,
      { suggestions: getSuggestions(INTENTS.GREETING) },
    );
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  [INTENTS.HELP]: () => {
    return buildResponse(
      `## 🧠 Retirement Copilot — What I Can Do\n\n` +
      `**📊 Analysis**\n` +
      `• "What's my retirement score?" — Get a 0-100 readiness score\n` +
      `• "Run Monte Carlo" — Probability-based risk analysis (2,000 simulations)\n` +
      `• "Sensitivity analysis" — See which factors matter most\n` +
      `• "Show my timeline" — Year-by-year growth projection\n\n` +
      `**🔮 What-If Scenarios**\n` +
      `• "What if I contribute $2,000/month?"\n` +
      `• "What if I retire at 70?"\n` +
      `• "What if returns drop to 8%?"\n` +
      `• "What if I need $8,000/month?"\n\n` +
      `**💡 Recommendations**\n` +
      `• "How do I close the gap?" — Actionable steps\n` +
      `• "Optimize my plan" — Best strategy suggestions\n` +
      `• "Compare funds" — ANWPX vs AGTHX vs Blend\n\n` +
      `**📚 Knowledge**\n` +
      `• "Explain future value" — Financial concept explanations\n` +
      `• "Tell me about Pacific Life" — Product details\n` +
      `• "What is compound interest?" — Educational content\n\n` +
      `Just ask me anything in plain English! 💬`,
      { suggestions: getSuggestions(INTENTS.HELP) },
    );
  },

  // ── Current Status ───────────────────────────────────────────────────────
  [INTENTS.CURRENT_STATUS]: (_, params) => {
    const proj = runProjection(params);
    const score = retirementReadinessScore(params);
    const goalStatus = proj.meetsGoal ? "✅ **GOAL MET**" : "❌ **GAP EXISTS**";

    return buildResponse(
      `## 📊 Current Plan Status\n\n` +
      `${goalStatus} | Readiness Score: **${score.total}/100 (${score.grade})**\n\n` +
      `| Metric | Value |\n|---|---|\n` +
      `| Projected Portfolio | ${fmt(proj.projValue)} |\n` +
      `| Required Capital | ${fmt(proj.reqCapital)} |\n` +
      `| Capital ${proj.capDiff >= 0 ? "Surplus" : "Shortfall"} | ${fmt(Math.abs(proj.capDiff))} |\n` +
      `| Est. Monthly Income | ${fmt(proj.totalMoIncome)} |\n` +
      `| Income Goal | ${fmt(params.desiredMonthlyIncome)} |\n` +
      `| Monthly ${proj.moDiff >= 0 ? "Surplus" : "Gap"} | ${fmt(Math.abs(proj.moDiff))} |\n` +
      `| Required Contribution | ${fmt(proj.neededPmt)} |\n\n` +
      `*${params.retirementAge - params.currentAge} years until income at age ${params.retirementAge} · ${pct(params.annualReturn)} growth · ${pct(params.withdrawalRate)} Pacific Life rate*`,
      { type: "status", data: { projection: proj, score }, suggestions: getSuggestions(INTENTS.CURRENT_STATUS) },
    );
  },

  // ── Retirement Score ─────────────────────────────────────────────────────
  [INTENTS.RETIREMENT_SCORE]: (_, params) => {
    const score = retirementReadinessScore(params);
    const bd = score.breakdown;

    let barChart = "";
    for (const [, item] of Object.entries(bd)) {
      const filled = Math.round((item.score / item.max) * 10);
      const empty = 10 - filled;
      barChart += `${item.label}: ${"█".repeat(filled)}${"░".repeat(empty)} ${item.score}/${item.max}\n`;
    }

    return buildResponse(
      `## 🏆 Retirement Readiness Score\n\n` +
      `# ${score.total}/100 — ${score.grade} (${score.label})\n\n` +
      `\`\`\`\n${barChart}\`\`\`\n\n` +
      `**What this means:** ${
        score.total >= 80 ? "You're in excellent shape. Your current strategy is well-positioned to meet your retirement goals." :
        score.total >= 60 ? "You're on a reasonable track, but there's room for improvement. Small adjustments could make a big difference." :
        score.total >= 40 ? "Your plan needs attention. Consider increasing contributions or adjusting your timeline." :
        "Your plan has significant gaps that need to be addressed. Let's explore optimization strategies."
      }\n\n` +
      `Ask me *"How can I improve my score?"* for specific actions.`,
      { type: "score", data: score, suggestions: ["How can I improve my score?", "Run Monte Carlo", "Optimize my plan"] },
    );
  },

  // ── Monte Carlo ──────────────────────────────────────────────────────────
  [INTENTS.MONTE_CARLO]: (_, params) => {
    const mc = monteCarloSimulation({
      ...params,
      expectedReturn: params.annualReturn,
      volatility: params.annualReturn > 0.13 ? 0.17 : params.annualReturn > 0.12 ? 0.155 : 0.145,
      numTrials: 2000,
    });

    const successPct = (mc.successRate * 100).toFixed(1);
    const emoji = mc.successRate >= 0.8 ? "🟢" : mc.successRate >= 0.6 ? "🟡" : "🔴";

    return buildResponse(
      `## 🎲 Monte Carlo Simulation (${mc.numTrials.toLocaleString()} trials)\n\n` +
      `### ${emoji} Success Probability: ${successPct}%\n\n` +
      `This means in ${successPct}% of simulated market scenarios, your portfolio reaches the ${fmt(mc.requiredCapital)} needed to fund your income goal.\n\n` +
      `**Portfolio Distribution at Retirement:**\n` +
      `| Percentile | Projected Value |\n|---|---|\n` +
      `| Worst Case | ${fmt(mc.worst)} |\n` +
      `| 5th (pessimistic) | ${fmt(mc.percentiles.p5)} |\n` +
      `| 25th | ${fmt(mc.percentiles.p25)} |\n` +
      `| **50th (median)** | **${fmt(mc.percentiles.p50)}** |\n` +
      `| 75th | ${fmt(mc.percentiles.p75)} |\n` +
      `| 95th (optimistic) | ${fmt(mc.percentiles.p95)} |\n` +
      `| Best Case | ${fmt(mc.best)} |\n\n` +
      `**Average outcome:** ${fmt(mc.average)} | **Required capital:** ${fmt(mc.requiredCapital)}\n\n` +
      `*Simulated with ${pct(params.annualReturn)} expected return and ${pct(mc.volatility)} annual volatility using normal distribution.*`,
      { type: "monteCarlo", data: mc, suggestions: ["What if returns drop to 8%?", "Compare funds", "How can I improve?"] },
    );
  },

  // ── Sensitivity Analysis ─────────────────────────────────────────────────
  [INTENTS.SENSITIVITY]: (_, params) => {
    const factors = sensitivityAnalysis(params);

    let table = "| Rank | Factor | Impact on Monthly Income | Direction |\n|---|---|---|---|\n";
    factors.forEach((f, i) => {
      table += `| ${i + 1} | ${f.name} | ${fmt(f.impact)} (${(f.impactPct * 100).toFixed(1)}%) | ${f.direction === "positive" ? "📈" : "📉"} |\n`;
    });

    return buildResponse(
      `## 🔬 Sensitivity Analysis\n\n` +
      `*Which factors have the biggest impact on your retirement income?*\n\n` +
      `${table}\n` +
      `**Key Takeaway:** **${factors[0].name}** has the most impact. A ±10% change in this factor swings your monthly income by ${fmt(factors[0].impact)}.` +
      (factors[0].name === "Retirement Age" ? ` Each year of delay adds more growth time AND increases the Pacific Life payout rate.` : ""),
      { type: "sensitivity", data: factors, suggestions: ["Optimize my plan", "What if I increase contributions?", "Compare funds"] },
    );
  },

  // ── What-If: Contribution ────────────────────────────────────────────────
  [INTENTS.WHAT_IF_CONTRIBUTION]: (classified, params) => {
    const newPmt = classified.entities.money[0]
      ?? classified.entities.numbers[0]
      ?? params.monthlyContribution * 1.5;

    const result = compareScenario(params, { monthlyContribution: newPmt });
    const b = result.baseline;
    const s = result.scenario;
    const d = result.delta;

    return buildResponse(
      `## 🔮 What If: ${fmt(newPmt)}/month contribution\n\n` +
      `| Metric | Current (${fmt(params.monthlyContribution)}/mo) | Scenario (${fmt(newPmt)}/mo) | Change |\n|---|---|---|---|\n` +
      `| Projected Value | ${fmt(b.projValue)} | ${fmt(s.projValue)} | ${d.projValue >= 0 ? "+" : ""}${fmt(d.projValue)} |\n` +
      `| Monthly Income | ${fmt(b.totalMoIncome)} | ${fmt(s.totalMoIncome)} | ${d.totalMoIncome >= 0 ? "+" : ""}${fmt(d.totalMoIncome)} |\n` +
      `| Meets Goal | ${b.meetsGoal ? "✅" : "❌"} | ${s.meetsGoal ? "✅" : "❌"} | ${d.meetsGoalChanged ? "⚡ Changed!" : "—"} |\n\n` +
      (d.meetsGoalChanged && s.meetsGoal
        ? `🎉 **Great news!** At ${fmt(newPmt)}/month, you'd meet your income goal with ${fmt(s.totalMoIncome)}/month!`
        : s.meetsGoal
          ? `✅ You'd still meet your goal, with an even larger surplus of ${fmt(s.moDiff)}/month.`
          : `The gap narrows by ${fmt(Math.abs(d.totalMoIncome))}/month, but you'd still need ${fmt(s.neededPmt)}/month to fully close it.`),
      { type: "whatIf", data: result, suggestions: ["What's my new score?", "Run Monte Carlo", "What if I also delay retirement?"] },
    );
  },

  // ── What-If: Age ─────────────────────────────────────────────────────────
  [INTENTS.WHAT_IF_AGE]: (classified, params) => {
    const newAge = classified.entities.ages[0]
      ?? Math.min(80, params.retirementAge + 3);
    const clampedAge = Math.min(80, Math.max(50, newAge));
    const newRate = getRate(params.incomeType ?? "singleLife", clampedAge);

    const result = compareScenario(params, { retirementAge: clampedAge, withdrawalRate: newRate });
    const b = result.baseline;
    const s = result.scenario;
    const d = result.delta;

    return buildResponse(
      `## 🔮 What If: Start income at age ${clampedAge}\n\n` +
      `| Metric | Current (age ${params.retirementAge}) | Scenario (age ${clampedAge}) | Change |\n|---|---|---|---|\n` +
      `| Years Until Income | ${params.retirementAge - params.currentAge} | ${clampedAge - params.currentAge} | ${clampedAge - params.retirementAge > 0 ? "+" : ""}${clampedAge - params.retirementAge} years |\n` +
      `| Pacific Life Rate | ${pct(params.withdrawalRate)} | ${pct(newRate)} | ${newRate > params.withdrawalRate ? "📈 Higher" : "📉 Lower"} |\n` +
      `| Projected Value | ${fmt(b.projValue)} | ${fmt(s.projValue)} | ${d.projValue >= 0 ? "+" : ""}${fmt(d.projValue)} |\n` +
      `| Monthly Income | ${fmt(b.totalMoIncome)} | ${fmt(s.totalMoIncome)} | ${d.totalMoIncome >= 0 ? "+" : ""}${fmt(d.totalMoIncome)} |\n` +
      `| Meets Goal | ${b.meetsGoal ? "✅" : "❌"} | ${s.meetsGoal ? "✅" : "❌"} | ${d.meetsGoalChanged ? "⚡ Changed!" : "—"} |\n\n` +
      `*${clampedAge > params.retirementAge ? "Delaying" : "Starting earlier"} gives ${Math.abs(clampedAge - params.retirementAge)} ${clampedAge > params.retirementAge ? "more" : "fewer"} years of compounding and a ${newRate > params.withdrawalRate ? "higher" : "lower"} payout rate.*`,
      { type: "whatIf", data: result, suggestions: ["What if I also increase contributions?", "Show breakeven analysis", "Optimize my plan"] },
    );
  },

  // ── What-If: Return Rate ─────────────────────────────────────────────────
  [INTENTS.WHAT_IF_RETURN]: (classified, params) => {
    let newRate = classified.entities.percentages[0];
    if (newRate != null) {
      newRate = newRate / 100; // convert "8%" → 0.08
    } else {
      // Check for market crash / bear scenario
      if (/crash|bear|worst|drop|down/i.test(classified.raw)) {
        newRate = 0.06;
      } else {
        newRate = 0.08;
      }
    }

    const result = compareScenario(params, { annualReturn: newRate });
    const b = result.baseline;
    const s = result.scenario;
    const d = result.delta;

    return buildResponse(
      `## 🔮 What If: ${pct(newRate)} annual return\n\n` +
      `| Metric | Current (${pct(params.annualReturn)}) | Scenario (${pct(newRate)}) | Change |\n|---|---|---|---|\n` +
      `| Projected Value | ${fmt(b.projValue)} | ${fmt(s.projValue)} | ${d.projValue >= 0 ? "+" : ""}${fmt(d.projValue)} |\n` +
      `| Monthly Income | ${fmt(b.totalMoIncome)} | ${fmt(s.totalMoIncome)} | ${d.totalMoIncome >= 0 ? "+" : ""}${fmt(d.totalMoIncome)} |\n` +
      `| Required Contribution | ${fmt(b.neededPmt)} | ${fmt(s.neededPmt)} | ${d.neededPmt >= 0 ? "+" : ""}${fmt(d.neededPmt)} |\n` +
      `| Meets Goal | ${b.meetsGoal ? "✅" : "❌"} | ${s.meetsGoal ? "✅" : "❌"} | ${d.meetsGoalChanged ? "⚡ Changed!" : "—"} |\n\n` +
      (newRate < params.annualReturn
        ? `⚠️ A lower return rate significantly impacts your outcome. ${!s.meetsGoal ? `You'd need ${fmt(s.neededPmt)}/month to compensate.` : "But you'd still meet your goal!"}`
        : `📈 Higher returns would boost your projected value by ${fmt(d.projValue)}.`),
      { type: "whatIf", data: result, suggestions: ["Run Monte Carlo for risk analysis", "What if I increase contributions?", "Compare all funds"] },
    );
  },

  // ── What-If: Income Goal ────────────────────────────────────────────────
  [INTENTS.WHAT_IF_INCOME_GOAL]: (classified, params) => {
    const newGoal = classified.entities.money[0] ?? classified.entities.numbers[0] ?? params.desiredMonthlyIncome * 1.5;
    const result = compareScenario(params, { desiredMonthlyIncome: newGoal });
    const s = result.scenario;

    return buildResponse(
      `## 🔮 What If: ${fmt(newGoal)}/month income goal\n\n` +
      `At ${fmt(newGoal)}/month, you'd need:\n` +
      `• **Net from investments:** ${fmt(s.netMoGoal)}/month (after ${fmt(params.socialSecurity)} SS)\n` +
      `• **Required capital:** ${fmt(s.reqCapital)}\n` +
      `• **Monthly contribution needed:** ${fmt(s.neededPmt)}\n\n` +
      `${s.meetsGoal ? `✅ Your current plan can support this goal!` : `❌ You'd be ${fmt(Math.abs(s.moDiff))}/month short. Required capital gap: ${fmt(Math.abs(s.capDiff))}.`}`,
      { type: "whatIf", data: result, suggestions: ["How do I close the gap?", "What if I delay retirement?", "Optimize my plan"] },
    );
  },

  // ── What-If: Initial Investment ──────────────────────────────────────────
  [INTENTS.WHAT_IF_INITIAL]: (classified, params) => {
    const additional = classified.entities.money[0] ?? classified.entities.numbers[0] ?? 50000;
    const newInitial = params.initialInvestment + additional;
    const result = compareScenario(params, { initialInvestment: newInitial });
    const s = result.scenario;
    const d = result.delta;

    return buildResponse(
      `## 🔮 What If: Add ${fmt(additional)} lump sum\n\n` +
      `Total initial investment: ${fmt(params.initialInvestment)} + ${fmt(additional)} = **${fmt(newInitial)}**\n\n` +
      `| Metric | Current | With Lump Sum | Change |\n|---|---|---|---|\n` +
      `| Projected Value | ${fmt(result.baseline.projValue)} | ${fmt(s.projValue)} | +${fmt(d.projValue)} |\n` +
      `| Monthly Income | ${fmt(result.baseline.totalMoIncome)} | ${fmt(s.totalMoIncome)} | +${fmt(d.totalMoIncome)} |\n` +
      `| Meets Goal | ${result.baseline.meetsGoal ? "✅" : "❌"} | ${s.meetsGoal ? "✅" : "❌"} | ${d.meetsGoalChanged ? "⚡" : "—"} |\n\n` +
      `*That ${fmt(additional)} would grow to ${fmt(additional * Math.pow(1 + params.annualReturn / 12, (params.retirementAge - params.currentAge) * 12))} over ${params.retirementAge - params.currentAge} years at ${pct(params.annualReturn)}.*`,
      { type: "whatIf", data: result, suggestions: ["What if I also increase contributions?", "Run Monte Carlo", "Optimize my plan"] },
    );
  },

  // ── What-If: Social Security ────────────────────────────────────────────
  [INTENTS.WHAT_IF_SS]: (classified, params) => {
    const newSS = classified.entities.money[0] ?? classified.entities.numbers[0] ?? 2000;
    const result = compareScenario(params, { socialSecurity: newSS });
    const s = result.scenario;

    return buildResponse(
      `## 🔮 What If: ${fmt(newSS)}/month Social Security\n\n` +
      `| Metric | Current | With SS | Change |\n|---|---|---|---|\n` +
      `| Social Security | ${fmt(params.socialSecurity)} | ${fmt(newSS)} | +${fmt(newSS - params.socialSecurity)} |\n` +
      `| Net Needed From Investments | ${fmt(result.baseline.netMoGoal)} | ${fmt(s.netMoGoal)} | -${fmt(result.baseline.netMoGoal - s.netMoGoal)} |\n` +
      `| Required Capital | ${fmt(result.baseline.reqCapital)} | ${fmt(s.reqCapital)} | -${fmt(result.baseline.reqCapital - s.reqCapital)} |\n` +
      `| Total Monthly Income | ${fmt(result.baseline.totalMoIncome)} | ${fmt(s.totalMoIncome)} | +${fmt(s.totalMoIncome - result.baseline.totalMoIncome)} |\n` +
      `| Meets Goal | ${result.baseline.meetsGoal ? "✅" : "❌"} | ${s.meetsGoal ? "✅" : "❌"} |\n\n` +
      `💡 Social Security reduces the capital you need by **${fmt(result.baseline.reqCapital - s.reqCapital)}** — that's a major impact!`,
      { type: "whatIf", data: result, suggestions: ["Optimize my plan", "Run Monte Carlo", "What's my score?"] },
    );
  },

  // ── Compare Funds ────────────────────────────────────────────────────────
  [INTENTS.COMPARE_FUNDS]: (_, params) => {
    const comparison = compareFunds(params);
    const funds = comparison.funds;

    let table = "| Fund | Projected Value | Monthly Income | Success Rate | Sharpe Ratio |\n|---|---|---|---|---|\n";
    for (const [key, f] of Object.entries(funds)) {
      table += `| **${f.ticker}** (${pct(f.annualReturn)}) | ${fmt(f.projection.projValue)} | ${fmt(f.projection.totalMoIncome)} | ${(f.monteCarlo.successRate * 100).toFixed(0)}% | ${f.sharpeProxy.toFixed(2)} |\n`;
    }

    const best = comparison.rankings.bySharpe[0];

    return buildResponse(
      `## 📊 Fund Comparison\n\n${table}\n` +
      `**Rankings:**\n` +
      `• Highest projected value: **${comparison.rankings.byReturn[0]}**\n` +
      `• Highest success probability: **${comparison.rankings.bySuccessRate[0]}**\n` +
      `• Best risk-adjusted (Sharpe): **${comparison.rankings.bySharpe[0]}**\n\n` +
      `💡 **Recommendation:** **${best}** offers the best risk-adjusted return. ` +
      (best === "BLEND" ? "The 50/50 blend benefits from diversification, providing strong returns with lower volatility." :
       best === "ANWPX" ? "ANWPX's global diversification provides a smoother ride with solid returns." :
       "AGTHX has the highest raw returns, but also the most volatility."),
      { type: "comparison", data: comparison, suggestions: ["What if returns drop to 8%?", "Run Monte Carlo", "Optimize my plan"] },
    );
  },

  // ── Gap Analysis ─────────────────────────────────────────────────────────
  [INTENTS.GAP_ANALYSIS]: (_, params) => {
    const proj = runProjection(params);
    if (proj.meetsGoal) {
      return buildResponse(
        `## ✅ No Gap — You're On Track!\n\n` +
        `Your projected income of ${fmt(proj.totalMoIncome)}/month exceeds your ${fmt(params.desiredMonthlyIncome)} goal by ${fmt(proj.moDiff)}/month.\n\n` +
        `**Capital surplus:** ${fmt(proj.capDiff)} above the required ${fmt(proj.reqCapital)}.`,
        { suggestions: ["What if I need more income?", "Run Monte Carlo", "What's my score?"] },
      );
    }

    const opts = generateOptimizations(params);
    let optList = opts.map(o =>
      `### ${o.category}: ${o.title}\n` +
      `• Current: ${o.current} → Recommended: ${o.recommended}\n` +
      `• Impact: ${o.impact}\n` +
      `• Difficulty: ${o.difficulty}`
    ).join("\n\n");

    return buildResponse(
      `## 📉 Gap Analysis\n\n` +
      `**Monthly income gap:** ${fmt(Math.abs(proj.moDiff))}/month\n` +
      `**Capital shortfall:** ${fmt(Math.abs(proj.capDiff))}\n` +
      `**Currently projecting:** ${fmt(proj.projValue)} (need ${fmt(proj.reqCapital)})\n\n` +
      `---\n\n## 🎯 Ways to Close the Gap\n\n${optList}`,
      { type: "gap", data: { projection: proj, optimizations: opts }, suggestions: ["What if I contribute more?", "What if I delay retirement?", "Compare funds"] },
    );
  },

  // ── How to Close Gap ─────────────────────────────────────────────────────
  [INTENTS.HOW_TO_CLOSE_GAP]: (classified, params) => {
    // Delegate to gap analysis
    return handlers[INTENTS.GAP_ANALYSIS](classified, params);
  },

  // ── Optimize ─────────────────────────────────────────────────────────────
  [INTENTS.OPTIMIZE]: (_, params) => {
    const opts = generateOptimizations(params);
    const insights = generateInsights(params);
    const score = retirementReadinessScore(params);

    let content = `## 🎯 Plan Optimization Report\n\n`;
    content += `**Current Score:** ${score.total}/100 (${score.grade})\n\n`;

    if (opts.length > 0) {
      content += `### Top Optimizations\n\n`;
      opts.forEach((o, i) => {
        content += `**${i + 1}. ${o.title}** (${o.difficulty} effort)\n`;
        content += `   ${o.current} → ${o.recommended}\n`;
        content += `   *${o.impact}*\n\n`;
      });
    }

    if (insights.length > 0) {
      content += `### 💡 Key Insights\n\n`;
      insights.slice(0, 4).forEach(ins => {
        content += `${ins.icon} **${ins.title}** — ${ins.message}\n\n`;
      });
    }

    return buildResponse(content, {
      type: "optimization",
      data: { optimizations: opts, insights, score },
      suggestions: ["Run Monte Carlo", "Compare funds", "Show me the timeline"],
    });
  },

  // ── Recommend ────────────────────────────────────────────────────────────
  [INTENTS.RECOMMEND]: (classified, params) => {
    return handlers[INTENTS.OPTIMIZE](classified, params);
  },

  // ── Timeline ─────────────────────────────────────────────────────────────
  [INTENTS.TIMELINE]: (_, params) => {
    const timeline = growthTimeline(params);
    const step = timeline.length > 20 ? 2 : 1;

    let table = "| Age | Year | Portfolio Value | Total Contributed | Growth |\n|---|---|---|---|---|\n";
    timeline.forEach((row, i) => {
      if (i % step === 0 || i === timeline.length - 1) {
        table += `| ${row.age} | ${row.year} | ${fmt(row.value)} | ${fmt(row.totalContributed)} | ${fmt(row.growth)} (${(row.growthPct * 100).toFixed(0)}%) |\n`;
      }
    });

    const last = timeline[timeline.length - 1];
    return buildResponse(
      `## 📈 Growth Timeline (${timeline.length - 1} years)\n\n${table}\n` +
      `**Final projected value:** ${fmt(last.value)}\n` +
      `**Total contributed:** ${fmt(last.totalContributed)} | **Growth:** ${fmt(last.growth)} (${(last.growthPct * 100).toFixed(0)}% return on contributions)`,
      { type: "timeline", data: timeline, suggestions: ["When do I hit $1,000,000?", "Run Monte Carlo", "What's my score?"] },
    );
  },

  // ── Milestones ───────────────────────────────────────────────────────────
  [INTENTS.MILESTONE]: (classified, params) => {
    const customTarget = classified.entities.money[0] ?? classified.entities.numbers[0];
    const targets = customTarget
      ? [customTarget]
      : [100000, 250000, 500000, 750000, 1000000, 1500000, 2000000];

    const milestones = findMilestones(params, targets);

    let table = "| Milestone | Age | Years From Now | Status |\n|---|---|---|---|\n";
    milestones.forEach(m => {
      if (m.reached) {
        const yearsFromNow = m.age - params.currentAge;
        table += `| ${fmt(m.target)} | ${m.age.toFixed(1)} | ${m.years.toFixed(1)} yrs | ${yearsFromNow <= 0 ? "✅ Already passed" : "📍 On track"} |\n`;
      } else {
        table += `| ${fmt(m.target)} | — | — | ⏳ Beyond projection |\n`;
      }
    });

    return buildResponse(
      `## 🏁 Portfolio Milestones\n\n${table}`,
      { type: "milestones", data: milestones, suggestions: ["Show the full timeline", "What if I increase contributions?", "Optimize my plan"] },
    );
  },

  // ── Breakeven ────────────────────────────────────────────────────────────
  [INTENTS.BREAKEVEN]: (_, params) => {
    const be = breakevenAnalysis(params);

    return buildResponse(
      `## ⚖️ Breakeven Analysis\n\n` +
      `**Total contributions over ${params.retirementAge - params.currentAge} years:** ${fmt(be.totalContributed)}\n` +
      `**Projected annual income in retirement:** ${fmt(be.annualIncome)}\n\n` +
      `**Breakeven point:** ${be.feasible ? `**${be.years} years** of retirement income to recoup contributions (by age ${be.breakEvenAge})` : "Not feasible with current projections."}\n\n` +
      (be.feasible
        ? `💡 After the breakeven point, every year of income is pure return on your investment. With the Pacific Life guarantee, this income continues for life.`
        : `Consider adjusting your plan to improve this outcome.`),
      { type: "breakeven", data: be, suggestions: ["Show the timeline", "Optimize my plan", "Compare funds"] },
    );
  },

  // ── Explain Concept ──────────────────────────────────────────────────────
  [INTENTS.EXPLAIN_CONCEPT]: (classified) => {
    const entry = searchKnowledge(classified.raw);
    if (entry) {
      return buildResponse(
        `## 📚 ${entry.title}\n\n${entry.content}`,
        { type: "knowledge", suggestions: ["What's my retirement score?", "Run Monte Carlo", "Tell me about Pacific Life"] },
      );
    }

    const topics = getAllTopics();
    const topicList = topics.map(t => `• ${t.title}`).join("\n");
    return buildResponse(
      `I don't have a specific entry for that topic, but I can explain these:\n\n${topicList}\n\nOr ask me a more specific question!`,
      { suggestions: ["Explain future value", "Tell me about Pacific Life", "What is compound interest?"] },
    );
  },

  // ── Explain Fund ─────────────────────────────────────────────────────────
  [INTENTS.EXPLAIN_FUND]: (classified) => {
    return handlers[INTENTS.EXPLAIN_CONCEPT](classified);
  },

  // ── Explain Rate ─────────────────────────────────────────────────────────
  [INTENTS.EXPLAIN_RATE]: (classified) => {
    return handlers[INTENTS.EXPLAIN_CONCEPT](classified);
  },

  // ── Explain Calculation ──────────────────────────────────────────────────
  [INTENTS.EXPLAIN_CALCULATION]: (_, params) => {
    const proj = runProjection(params);
    return buildResponse(
      `## 🔢 How The Numbers Are Calculated\n\n` +
      `### Step 1: Future Value (Accumulation)\n` +
      `\`FV = PV × (1 + r/12)^n + PMT × ((1 + r/12)^n - 1) / (r/12)\`\n\n` +
      `• PV = ${fmt(params.initialInvestment)} (initial investment)\n` +
      `• PMT = ${fmt(params.monthlyContribution)}/month\n` +
      `• r = ${pct(params.annualReturn)} annually\n` +
      `• n = ${proj.months} months (${proj.years} years)\n` +
      `• **Result: ${fmt(proj.projValue)}**\n\n` +
      `### Step 2: Net Income Goal\n` +
      `\`Net Monthly Goal = Desired Income - Social Security\`\n` +
      `• ${fmt(params.desiredMonthlyIncome)} - ${fmt(params.socialSecurity)} = **${fmt(proj.netMoGoal)}/month**\n\n` +
      `### Step 3: Required Capital\n` +
      `\`Required Capital = (Net Goal × 12) / Withdrawal Rate\`\n` +
      `• (${fmt(proj.netMoGoal)} × 12) / ${pct(params.withdrawalRate)} = **${fmt(proj.reqCapital)}**\n\n` +
      `### Step 4: Income from Investments\n` +
      `\`Monthly Income = (Projected Value × Withdrawal Rate) / 12\`\n` +
      `• (${fmt(proj.projValue)} × ${pct(params.withdrawalRate)}) / 12 = **${fmt(proj.estMoIncome)}/month**\n\n` +
      `### Result\n` +
      `Total = ${fmt(proj.estMoIncome)} (investments) + ${fmt(params.socialSecurity)} (SS) = **${fmt(proj.totalMoIncome)}/month**`,
      { type: "explanation", suggestions: ["What is compound interest?", "Tell me about Pacific Life", "Optimize my plan"] },
    );
  },

  // ── Summarize ────────────────────────────────────────────────────────────
  [INTENTS.SUMMARIZE]: (_, params) => {
    const proj = runProjection(params);
    const score = retirementReadinessScore(params);
    const points = generateTalkingPoints(params);

    return buildResponse(
      `## 📋 Executive Summary\n\n` +
      `**Score:** ${score.total}/100 (${score.grade} — ${score.label}) | ` +
      `**Status:** ${proj.meetsGoal ? "✅ Goal Met" : "❌ Gap Exists"}\n\n` +
      `### Key Numbers\n` +
      `• Projected at age ${params.retirementAge}: **${fmt(proj.projValue)}**\n` +
      `• Monthly income: **${fmt(proj.totalMoIncome)}** (goal: ${fmt(params.desiredMonthlyIncome)})\n` +
      `• ${proj.meetsGoal ? "Surplus" : "Gap"}: **${fmt(Math.abs(proj.moDiff))}/month**\n\n` +
      `### Advisor Talking Points\n` +
      points.map(p => `> ${p}`).join("\n\n"),
      { type: "summary", data: { projection: proj, score }, suggestions: ["Run Monte Carlo", "Optimize my plan", "Compare funds"] },
    );
  },

  // ── Project Value ────────────────────────────────────────────────────────
  [INTENTS.PROJECT_VALUE]: (_, params) => {
    const proj = runProjection(params);
    const totalContributed = params.initialInvestment + params.monthlyContribution * proj.months;
    const growth = proj.projValue - totalContributed;

    return buildResponse(
      `## 💰 Projected Portfolio Value\n\n` +
      `At age **${params.retirementAge}** (${proj.years} years from now), your portfolio is projected to be worth:\n\n` +
      `# ${fmt(proj.projValue)}\n\n` +
      `| Component | Amount |\n|---|---|\n` +
      `| Initial Investment | ${fmt(params.initialInvestment)} |\n` +
      `| Total Monthly Contributions | ${fmt(params.monthlyContribution * proj.months)} |\n` +
      `| **Total You Put In** | **${fmt(totalContributed)}** |\n` +
      `| Investment Growth | ${fmt(growth)} |\n` +
      `| Growth Multiple | ${(proj.projValue / totalContributed).toFixed(1)}× your contributions |\n\n` +
      `*${pct(params.annualReturn)} annual return over ${proj.years} years, compounded monthly.*`,
      { suggestions: ["Show the full timeline", "When do I hit $1M?", "Run Monte Carlo"] },
    );
  },

  // ── Compare Scenarios ────────────────────────────────────────────────────
  [INTENTS.COMPARE_SCENARIOS]: (_, params) => {
    // Compare conservative, moderate, aggressive scenarios
    const scenarios = [
      { label: "Conservative", overrides: { annualReturn: 0.08, monthlyContribution: params.monthlyContribution } },
      { label: "Current Plan", overrides: {} },
      { label: "Aggressive", overrides: { annualReturn: 0.14, monthlyContribution: params.monthlyContribution * 1.5 } },
    ];

    let table = "| Scenario | Growth Rate | Contribution | Projected Value | Monthly Income | Meets Goal |\n|---|---|---|---|---|---|\n";
    for (const s of scenarios) {
      const p = runProjection({ ...params, ...s.overrides });
      table += `| ${s.label} | ${pct(s.overrides.annualReturn ?? params.annualReturn)} | ${fmt(s.overrides.monthlyContribution ?? params.monthlyContribution)} | ${fmt(p.projValue)} | ${fmt(p.totalMoIncome)} | ${p.meetsGoal ? "✅" : "❌"} |\n`;
    }

    return buildResponse(
      `## 🔄 Scenario Comparison\n\n${table}\n` +
      `*Conservative uses 8% return. Aggressive uses 14% return + 50% higher contributions.*`,
      { type: "comparison", suggestions: ["Run Monte Carlo", "Optimize my plan", "Compare funds"] },
    );
  },

  // ── Unknown ──────────────────────────────────────────────────────────────
  [INTENTS.UNKNOWN]: (classified) => {
    // Try knowledge base as fallback
    const entry = searchKnowledge(classified.raw);
    if (entry) {
      return buildResponse(
        `## 📚 ${entry.title}\n\n${entry.content}`,
        { type: "knowledge", suggestions: getSuggestions(INTENTS.HELP) },
      );
    }

    return buildResponse(
      `I'm not sure I understood that. Here are some things I can help with:\n\n` +
      `• **"What's my retirement score?"** — Get your readiness rating\n` +
      `• **"Run Monte Carlo"** — Probability analysis\n` +
      `• **"What if I contribute $2,000?"** — Scenario modeling\n` +
      `• **"Compare funds"** — ANWPX vs AGTHX vs Blend\n` +
      `• **"Optimize my plan"** — Get specific recommendations\n` +
      `• **"Explain [concept]"** — Financial education\n\n` +
      `Try rephrasing or type **"help"** for the full menu.`,
      { suggestions: getSuggestions(INTENTS.HELP) },
    );
  },
};

// ─── Main Agent Interface ────────────────────────────────────────────────────

/**
 * Process a user message and return an intelligent response.
 *
 * @param {string} message — The user's natural language input
 * @param {object} calcState — Current calculator state (from the calc useMemo)
 * @returns {object} — Response with content, type, data, suggestions
 */
export function processMessage(message, calcState) {
  const params = stateToParams(calcState);
  const classified = classify(message);

  const handler = handlers[classified.intent] || handlers[INTENTS.UNKNOWN];
  const response = handler(classified, params);

  return {
    ...response,
    intent: classified.intent,
    confidence: classified.confidence,
  };
}

/**
 * Get proactive insights for the current calculator state.
 * Used to show insight cards without user prompt.
 */
export function getProactiveInsights(calcState) {
  const params = stateToParams(calcState);
  return generateInsights(params);
}

/**
 * Get quick actions available for the current state.
 */
export function getQuickActions(calcState) {
  const params = stateToParams(calcState);
  const proj = runProjection(params);

  const actions = [
    { label: "📊 My Score", message: "What's my retirement score?" },
    { label: "🎲 Monte Carlo", message: "Run Monte Carlo simulation" },
    { label: "📈 Compare Funds", message: "Compare all three funds" },
    { label: "📋 Summary", message: "Summarize my plan" },
  ];

  if (!proj.meetsGoal) {
    actions.unshift({ label: "🎯 Close the Gap", message: "How do I close the gap?" });
  }

  return actions;
}
