/**
 * FinancialEngine — Advanced financial calculations for the Retirement Copilot
 *
 * Provides Monte Carlo simulation, what-if scenario analysis, sensitivity
 * analysis, retirement readiness scoring, milestone projection, and
 * year-by-year growth timelines.
 */

// ─── Core Financial Formulas ─────────────────────────────────────────────────

/** Future value of a lump sum + annuity (monthly compounding). */
export function futureValue(pv, monthlyPmt, annualRate, months) {
  if (months <= 0) return pv;
  const mr = annualRate / 12;
  const gf = Math.pow(1 + mr, months);
  const pvFv = pv * gf;
  const pmtFv = mr === 0 ? monthlyPmt * months : monthlyPmt * ((gf - 1) / mr);
  return pvFv + pmtFv;
}

/** Required monthly payment to reach a target future value. */
export function requiredPayment(target, pv, annualRate, months) {
  if (months <= 0) return 0;
  const mr = annualRate / 12;
  const gf = Math.pow(1 + mr, months);
  const remaining = target - pv * gf;
  if (remaining <= 0) return 0;
  return mr === 0 ? remaining / months : (remaining * mr) / (gf - 1);
}

/** Format currency. */
export function fmt(n) {
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Format percentage. */
export function pct(n) {
  return `${(n * 100).toFixed(2)}%`;
}

// ─── What-If Scenario Engine ─────────────────────────────────────────────────

/**
 * Run a full projection with the given parameters (same logic as the calculator).
 * Returns a complete result object.
 */
export function runProjection({
  currentAge,
  retirementAge,
  initialInvestment,
  monthlyContribution,
  annualReturn,
  withdrawalRate,
  desiredMonthlyIncome,
  socialSecurity,
}) {
  const years = Math.max(0, retirementAge - currentAge);
  const months = years * 12;
  const projValue = futureValue(initialInvestment, monthlyContribution, annualReturn, months);

  const netMoGoal = Math.max(0, desiredMonthlyIncome - socialSecurity);
  const netAnnGoal = netMoGoal * 12;
  const reqCapital = withdrawalRate > 0 ? netAnnGoal / withdrawalRate : 0;

  const estAnnIncome = projValue * withdrawalRate;
  const estMoIncome = estAnnIncome / 12;
  const totalMoIncome = estMoIncome + socialSecurity;
  const moDiff = totalMoIncome - desiredMonthlyIncome;
  const capDiff = projValue - reqCapital;
  const meetsGoal = totalMoIncome >= desiredMonthlyIncome;
  const neededPmt = requiredPayment(reqCapital, initialInvestment, annualReturn, months);

  return {
    years, months, projValue, netMoGoal, netAnnGoal, reqCapital,
    estMoIncome, totalMoIncome, moDiff, capDiff, meetsGoal, neededPmt,
  };
}

/**
 * Compare current state with a modified scenario.
 */
export function compareScenario(currentParams, overrides) {
  const baseline = runProjection(currentParams);
  const scenario = runProjection({ ...currentParams, ...overrides });

  return {
    baseline,
    scenario,
    delta: {
      projValue: scenario.projValue - baseline.projValue,
      totalMoIncome: scenario.totalMoIncome - baseline.totalMoIncome,
      capDiff: scenario.capDiff - baseline.capDiff,
      neededPmt: scenario.neededPmt - baseline.neededPmt,
      meetsGoalChanged: baseline.meetsGoal !== scenario.meetsGoal,
    },
  };
}

// ─── Monte Carlo Simulation ──────────────────────────────────────────────────

/**
 * Simple Box-Muller transform for normal random variates.
 */
function normalRandom(mean, stddev) {
  let u, v, s;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt(-2 * Math.log(s) / s);
  return mean + stddev * u * mul;
}

/**
 * Run Monte Carlo simulation for retirement success probability.
 *
 * Simulates `numTrials` paths of annual returns drawn from a normal
 * distribution with mean = expected return and stddev = volatility.
 *
 * Returns success rate, percentile outcomes, and distribution stats.
 */
export function monteCarloSimulation({
  currentAge,
  retirementAge,
  initialInvestment,
  monthlyContribution,
  expectedReturn,
  volatility = 0.15,
  withdrawalRate,
  desiredMonthlyIncome,
  socialSecurity,
  numTrials = 2000,
}) {
  const years = Math.max(1, retirementAge - currentAge);
  const netMoGoal = Math.max(0, desiredMonthlyIncome - socialSecurity);
  const reqCapital = withdrawalRate > 0 ? (netMoGoal * 12) / withdrawalRate : 0;

  const outcomes = [];

  for (let trial = 0; trial < numTrials; trial++) {
    let balance = initialInvestment;
    for (let y = 0; y < years; y++) {
      const annualReturn = normalRandom(expectedReturn, volatility);
      // Apply monthly contributions with this year's return
      const mr = annualReturn / 12;
      for (let mo = 0; mo < 12; mo++) {
        balance = balance * (1 + mr) + monthlyContribution;
      }
      balance = Math.max(0, balance); // no negative balances
    }
    outcomes.push(balance);
  }

  // Sort for percentile analysis
  outcomes.sort((a, b) => a - b);

  const successCount = outcomes.filter(v => v >= reqCapital).length;
  const successRate = successCount / numTrials;

  const p = (pctile) => outcomes[Math.floor(pctile * numTrials)] || 0;
  const avg = outcomes.reduce((s, v) => s + v, 0) / numTrials;

  return {
    successRate,
    numTrials,
    requiredCapital: reqCapital,
    percentiles: {
      p5:  p(0.05),
      p10: p(0.10),
      p25: p(0.25),
      p50: p(0.50),  // median
      p75: p(0.75),
      p90: p(0.90),
      p95: p(0.95),
    },
    average: avg,
    worst: outcomes[0],
    best: outcomes[outcomes.length - 1],
    volatility,
  };
}

// ─── Sensitivity Analysis ────────────────────────────────────────────────────

/**
 * Measure how sensitive the outcome is to changes in each input variable.
 * Returns ranked list of variables by impact.
 */
export function sensitivityAnalysis(params) {
  const baseline = runProjection(params);
  const factors = [];

  // Test ±10% change in each numeric parameter
  const testCases = [
    { name: "Monthly Contribution", key: "monthlyContribution", delta: 0.10 },
    { name: "Initial Investment",   key: "initialInvestment",   delta: 0.10 },
    { name: "Annual Return",        key: "annualReturn",        delta: 0.10 },
    { name: "Retirement Age",       key: "retirementAge",       delta: null, bump: 2 },
    { name: "Desired Income",       key: "desiredMonthlyIncome",delta: 0.10 },
    { name: "Social Security",      key: "socialSecurity",      delta: 0.10 },
  ];

  for (const tc of testCases) {
    const val = params[tc.key];
    const upVal = tc.bump != null ? val + tc.bump : val * (1 + tc.delta);
    const downVal = tc.bump != null ? val - tc.bump : val * (1 - tc.delta);

    const up = runProjection({ ...params, [tc.key]: upVal });
    const down = runProjection({ ...params, [tc.key]: downVal });

    const impact = Math.abs(up.totalMoIncome - down.totalMoIncome);
    const direction = up.totalMoIncome > baseline.totalMoIncome ? "positive" : "negative";

    factors.push({
      name: tc.name,
      impact,
      impactPct: baseline.totalMoIncome > 0 ? impact / baseline.totalMoIncome : 0,
      direction,
      upValue: up.totalMoIncome,
      downValue: down.totalMoIncome,
      baseline: baseline.totalMoIncome,
    });
  }

  // Sort by impact descending
  factors.sort((a, b) => b.impact - a.impact);
  return factors;
}

// ─── Retirement Readiness Score ──────────────────────────────────────────────

/**
 * Calculate a comprehensive 0–100 retirement readiness score with
 * sub-component breakdown.
 */
export function retirementReadinessScore(params) {
  const proj = runProjection(params);

  // 1. Capital Adequacy (0-30 pts) — How close projected value is to required capital
  let capitalScore;
  if (proj.reqCapital <= 0) {
    capitalScore = 30;
  } else {
    const ratio = proj.projValue / proj.reqCapital;
    capitalScore = Math.min(30, Math.round(ratio * 30));
  }

  // 2. Income Replacement (0-25 pts) — Projected income vs desired
  let incomeScore;
  if (params.desiredMonthlyIncome <= 0) {
    incomeScore = 25;
  } else {
    const incRatio = proj.totalMoIncome / params.desiredMonthlyIncome;
    incomeScore = Math.min(25, Math.round(incRatio * 25));
  }

  // 3. Time Horizon (0-15 pts) — More years = better (more compounding)
  const yearsUntil = Math.max(0, params.retirementAge - params.currentAge);
  let timeScore;
  if (yearsUntil >= 20) timeScore = 15;
  else if (yearsUntil >= 10) timeScore = Math.round(10 + (yearsUntil - 10) * 0.5);
  else if (yearsUntil >= 5) timeScore = Math.round(5 + (yearsUntil - 5));
  else timeScore = yearsUntil;

  // 4. Contribution Effort (0-15 pts) — Current vs required contribution
  let contribScore;
  if (proj.neededPmt <= 0) {
    contribScore = 15;
  } else {
    const contribRatio = params.monthlyContribution / proj.neededPmt;
    contribScore = Math.min(15, Math.round(contribRatio * 15));
  }

  // 5. Diversification & SS Safety Net (0-15 pts)
  let diversScore = 0;
  // Social Security provides a floor
  if (params.socialSecurity > 0) {
    const ssCoverage = params.socialSecurity / Math.max(1, params.desiredMonthlyIncome);
    diversScore += Math.min(8, Math.round(ssCoverage * 20));
  }
  // Having reasonable (not extreme) return assumptions
  if (params.annualReturn >= 0.06 && params.annualReturn <= 0.12) {
    diversScore += 4;
  } else if (params.annualReturn < 0.06) {
    diversScore += 5; // conservative = safer
  } else {
    diversScore += 2; // aggressive = riskier
  }
  // Time diversification
  if (yearsUntil >= 10) diversScore += 3;
  else if (yearsUntil >= 5) diversScore += 2;
  else diversScore += 1;
  diversScore = Math.min(15, diversScore);

  const totalScore = capitalScore + incomeScore + timeScore + contribScore + diversScore;

  let grade, label, color;
  if (totalScore >= 90) { grade = "A+"; label = "Excellent"; color = "#059669"; }
  else if (totalScore >= 80) { grade = "A"; label = "Very Good"; color = "#059669"; }
  else if (totalScore >= 70) { grade = "B+"; label = "Good"; color = "#0d9488"; }
  else if (totalScore >= 60) { grade = "B"; label = "On Track"; color = "#2563eb"; }
  else if (totalScore >= 50) { grade = "C+"; label = "Needs Work"; color = "#d97706"; }
  else if (totalScore >= 40) { grade = "C"; label = "At Risk"; color = "#ea580c"; }
  else if (totalScore >= 30) { grade = "D"; label = "Behind"; color = "#dc2626"; }
  else { grade = "F"; label = "Critical"; color = "#991b1b"; }

  return {
    total: totalScore,
    grade, label, color,
    breakdown: {
      capitalAdequacy:    { score: capitalScore,  max: 30, label: "Capital Adequacy" },
      incomeReplacement:  { score: incomeScore,   max: 25, label: "Income Replacement" },
      timeHorizon:        { score: timeScore,     max: 15, label: "Time Horizon" },
      contributionEffort: { score: contribScore,  max: 15, label: "Contribution Effort" },
      diversification:    { score: diversScore,   max: 15, label: "Diversification & Safety" },
    },
    projection: proj,
  };
}

// ─── Year-by-Year Timeline ───────────────────────────────────────────────────

/**
 * Generate a year-by-year growth projection.
 */
export function growthTimeline(params) {
  const { currentAge, retirementAge, initialInvestment, monthlyContribution, annualReturn } = params;
  const years = Math.max(0, retirementAge - currentAge);
  const timeline = [];

  for (let y = 0; y <= years; y++) {
    const age = currentAge + y;
    const months = y * 12;
    const value = futureValue(initialInvestment, monthlyContribution, annualReturn, months);
    const totalContributed = initialInvestment + monthlyContribution * months;
    const growth = value - totalContributed;

    timeline.push({
      year: y,
      age,
      value,
      totalContributed,
      growth,
      growthPct: totalContributed > 0 ? growth / totalContributed : 0,
    });
  }

  return timeline;
}

// ─── Milestone Finder ────────────────────────────────────────────────────────

/**
 * Find when the portfolio reaches specific dollar milestones.
 */
export function findMilestones(params, targets = [100000, 250000, 500000, 750000, 1000000, 1500000, 2000000]) {
  const { currentAge, initialInvestment, monthlyContribution, annualReturn } = params;
  const milestones = [];

  for (const target of targets) {
    if (target <= initialInvestment) {
      milestones.push({ target, age: currentAge, years: 0, reached: true });
      continue;
    }

    // Binary search for the month when we cross the target
    let lo = 0, hi = 600; // up to 50 years
    let found = false;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const val = futureValue(initialInvestment, monthlyContribution, annualReturn, mid);
      if (val >= target) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    const monthsNeeded = lo;
    if (monthsNeeded <= 600) {
      const yearsNeeded = monthsNeeded / 12;
      milestones.push({
        target,
        age: Math.round((currentAge + yearsNeeded) * 10) / 10,
        years: Math.round(yearsNeeded * 10) / 10,
        reached: true,
      });
    } else {
      milestones.push({ target, age: null, years: null, reached: false });
    }
  }

  return milestones;
}

// ─── Breakeven Analysis ──────────────────────────────────────────────────────

/**
 * Calculate the breakeven point — how many years of retirement income
 * it takes to recoup total contributions.
 */
export function breakevenAnalysis(params) {
  const proj = runProjection(params);
  const totalContributed = params.initialInvestment + params.monthlyContribution * proj.months;
  const annualIncome = proj.totalMoIncome * 12;

  if (annualIncome <= 0) {
    return { years: Infinity, totalContributed, annualIncome: 0, feasible: false };
  }

  const yearsToBreakeven = totalContributed / annualIncome;

  return {
    years: Math.round(yearsToBreakeven * 10) / 10,
    totalContributed,
    annualIncome,
    feasible: yearsToBreakeven < 40,
    breakEvenAge: Math.round((params.retirementAge + yearsToBreakeven) * 10) / 10,
  };
}

// ─── Fund Comparison ─────────────────────────────────────────────────────────

const FUND_DATA = {
  ANWPX: { ticker: "ANWPX", name: "New Perspective Fund A", annualReturn: 0.122, volatility: 0.155 },
  AGTHX: { ticker: "AGTHX", name: "Growth Fund of America A", annualReturn: 0.1373, volatility: 0.17 },
  BLEND: { ticker: "BLEND", name: "50/50 Blend", annualReturn: 0.12965, volatility: 0.145 },
};

/**
 * Compare all three fund options with Monte Carlo for risk-adjusted analysis.
 */
export function compareFunds(params) {
  const results = {};

  for (const [key, fund] of Object.entries(FUND_DATA)) {
    const fundParams = { ...params, annualReturn: fund.annualReturn };
    const proj = runProjection(fundParams);
    const mc = monteCarloSimulation({
      ...fundParams,
      expectedReturn: fund.annualReturn,
      volatility: fund.volatility,
      numTrials: 1000,
    });

    results[key] = {
      ...fund,
      projection: proj,
      monteCarlo: mc,
      riskAdjustedReturn: fund.annualReturn - (fund.volatility * fund.volatility / 2),
      sharpeProxy: (fund.annualReturn - 0.04) / fund.volatility, // risk-free ≈ 4%
    };
  }

  // Rank by different criteria
  const byReturn = Object.entries(results).sort((a, b) => b[1].projection.projValue - a[1].projection.projValue);
  const byRisk = Object.entries(results).sort((a, b) => b[1].monteCarlo.successRate - a[1].monteCarlo.successRate);
  const bySharpe = Object.entries(results).sort((a, b) => b[1].sharpeProxy - a[1].sharpeProxy);

  return {
    funds: results,
    rankings: {
      byReturn: byReturn.map(([k]) => k),
      bySuccessRate: byRisk.map(([k]) => k),
      bySharpe: bySharpe.map(([k]) => k),
    },
  };
}
