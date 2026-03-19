/**
 * RecommendationEngine — Proactive intelligence for the Retirement Copilot
 *
 * Analyzes the current calculator state and generates actionable insights,
 * warnings, opportunities, and specific recommendations.
 */

import { runProjection, requiredPayment, futureValue, fmt, pct } from "./FinancialEngine.js";

// ─── Insight Types ───────────────────────────────────────────────────────────

const TYPE = {
  WARNING:     "warning",
  OPPORTUNITY: "opportunity",
  INFO:        "info",
  SUCCESS:     "success",
  ACTION:      "action",
};

const ICON = {
  [TYPE.WARNING]:     "⚠️",
  [TYPE.OPPORTUNITY]: "💡",
  [TYPE.INFO]:        "ℹ️",
  [TYPE.SUCCESS]:     "✅",
  [TYPE.ACTION]:      "🎯",
};

// ─── Insight Generation ──────────────────────────────────────────────────────

/**
 * Generate proactive insights based on the current calculator state.
 * Returns an array of insight objects sorted by priority.
 */
export function generateInsights(params) {
  const proj = runProjection(params);
  const insights = [];

  // 1. Goal Status
  if (proj.meetsGoal) {
    const surplusPct = proj.capDiff / proj.reqCapital;
    if (surplusPct > 0.5) {
      insights.push({
        type: TYPE.SUCCESS,
        priority: 1,
        title: "Strongly on track",
        message: `Your projected value exceeds required capital by ${fmt(proj.capDiff)} (${(surplusPct * 100).toFixed(0)}% surplus). You could potentially reduce contributions or increase your income goal.`,
        action: "Consider what additional goals this surplus could fund.",
      });
    } else {
      insights.push({
        type: TYPE.SUCCESS,
        priority: 2,
        title: "Income goal met",
        message: `You're projected to have ${fmt(proj.totalMoIncome)}/month — exceeding your ${fmt(params.desiredMonthlyIncome)} goal by ${fmt(proj.moDiff)}/month.`,
      });
    }
  } else {
    const shortfallPct = Math.abs(proj.capDiff) / proj.reqCapital;
    const severity = shortfallPct > 0.5 ? "significant" : shortfallPct > 0.2 ? "moderate" : "small";
    insights.push({
      type: TYPE.WARNING,
      priority: 1,
      title: `${severity.charAt(0).toUpperCase() + severity.slice(1)} income gap`,
      message: `You're ${fmt(Math.abs(proj.moDiff))}/month short of your goal. The capital shortfall is ${fmt(Math.abs(proj.capDiff))} (${(shortfallPct * 100).toFixed(0)}% gap).`,
      action: `Increase monthly contributions to ${fmt(proj.neededPmt)} to close the gap.`,
    });
  }

  // 2. Contribution Analysis
  if (proj.neededPmt > 0 && params.monthlyContribution > 0) {
    const contribRatio = params.monthlyContribution / proj.neededPmt;
    if (contribRatio < 0.5) {
      insights.push({
        type: TYPE.ACTION,
        priority: 2,
        title: "Contribution gap is large",
        message: `You're contributing ${fmt(params.monthlyContribution)}/month but need ${fmt(proj.neededPmt)} — that's only ${(contribRatio * 100).toFixed(0)}% of what's needed.`,
        action: "Even a partial increase would significantly impact your outcome.",
      });
    } else if (contribRatio >= 0.8 && contribRatio < 1) {
      insights.push({
        type: TYPE.OPPORTUNITY,
        priority: 3,
        title: "Almost there on contributions",
        message: `You're at ${(contribRatio * 100).toFixed(0)}% of the required contribution. Just ${fmt(proj.neededPmt - params.monthlyContribution)}/month more would close the gap entirely.`,
      });
    }
  }

  // 3. Time Horizon
  const years = params.retirementAge - params.currentAge;
  if (years <= 5 && !proj.meetsGoal) {
    insights.push({
      type: TYPE.WARNING,
      priority: 1,
      title: "Short time horizon",
      message: `With only ${years} years until income starts, there's limited time for compounding to work. Consider delaying income start age for significantly higher projected values and Pacific Life payout rates.`,
    });
  } else if (years >= 20) {
    insights.push({
      type: TYPE.INFO,
      priority: 5,
      title: "Long compounding runway",
      message: `With ${years} years ahead, compound growth is your biggest ally. Even small increases in contributions now will multiply significantly over time.`,
    });
  }

  // 4. Social Security Impact
  if (params.socialSecurity === 0 && params.desiredMonthlyIncome > 0) {
    insights.push({
      type: TYPE.OPPORTUNITY,
      priority: 3,
      title: "Social Security not included",
      message: "You haven't entered a Social Security estimate. Even a modest SS benefit ($1,500–$3,000/month) would significantly reduce the capital you need from investments.",
      action: "Visit SSA.gov to get your estimated benefit and enter it here.",
    });
  } else if (params.socialSecurity > 0) {
    const ssCoverage = params.socialSecurity / params.desiredMonthlyIncome;
    if (ssCoverage > 0.4) {
      insights.push({
        type: TYPE.INFO,
        priority: 4,
        title: "Strong Social Security foundation",
        message: `Social Security covers ${(ssCoverage * 100).toFixed(0)}% of your desired income, reducing the burden on your investment portfolio significantly.`,
      });
    }
  }

  // 5. Age-based Rate Optimization
  if (params.retirementAge < 65 && !proj.meetsGoal) {
    const laterAge = Math.min(70, params.retirementAge + 3);
    const laterParams = { ...params, retirementAge: laterAge };
    const laterProj = runProjection(laterParams);
    if (laterProj.meetsGoal && !proj.meetsGoal) {
      insights.push({
        type: TYPE.OPPORTUNITY,
        priority: 2,
        title: `Delaying to age ${laterAge} would meet your goal`,
        message: `Starting income at ${laterAge} instead of ${params.retirementAge} gives ${laterAge - params.retirementAge} more years of growth and a higher Pacific Life payout rate, projecting ${fmt(laterProj.totalMoIncome)}/month — enough to meet your goal.`,
      });
    }
  }

  // 6. Fund Selection Insight
  if (params.annualReturn === 0.122) { // ANWPX
    insights.push({
      type: TYPE.INFO,
      priority: 5,
      title: "Using ANWPX (global, moderate growth)",
      message: "ANWPX provides global diversification at 12.20%. Switching to AGTHX (13.73%) would boost projected value but adds volatility. The 50/50 blend offers a balance.",
    });
  } else if (params.annualReturn === 0.1373) { // AGTHX
    insights.push({
      type: TYPE.INFO,
      priority: 5,
      title: "Using AGTHX (aggressive growth)",
      message: "AGTHX's 13.73% assumption is the most aggressive option. While historically supported, it comes with higher volatility. Consider the blend for a more conservative projection.",
    });
  }

  // 7. Milestone proximity
  const projValue = proj.projValue;
  const milestones = [250000, 500000, 750000, 1000000, 1500000, 2000000];
  for (const m of milestones) {
    const ratio = projValue / m;
    if (ratio >= 0.85 && ratio < 1) {
      const extra = m - projValue;
      insights.push({
        type: TYPE.OPPORTUNITY,
        priority: 4,
        title: `Close to ${fmt(m)} milestone`,
        message: `Your projected value is ${fmt(projValue)} — just ${fmt(extra)} short of ${fmt(m)}. A small contribution increase could push you past this milestone.`,
      });
      break;
    }
  }

  // Sort by priority (lower = more important)
  insights.sort((a, b) => a.priority - b.priority);

  // Add icons
  return insights.map(i => ({ ...i, icon: ICON[i.type] }));
}

// ─── Optimization Engine ─────────────────────────────────────────────────────

/**
 * Generate a set of specific, actionable optimizations to improve outcomes.
 */
export function generateOptimizations(params) {
  const proj = runProjection(params);
  const optimizations = [];

  // 1. Contribution optimization
  if (!proj.meetsGoal) {
    optimizations.push({
      category: "Contributions",
      title: "Increase monthly contributions",
      current: fmt(params.monthlyContribution),
      recommended: fmt(proj.neededPmt),
      impact: `Closes the ${fmt(Math.abs(proj.moDiff))}/month income gap entirely`,
      difficulty: proj.neededPmt / params.monthlyContribution > 2 ? "High" : "Medium",
    });

    // Partial increase option
    const partialIncrease = params.monthlyContribution * 1.25;
    const partialProj = runProjection({ ...params, monthlyContribution: partialIncrease });
    optimizations.push({
      category: "Contributions",
      title: "25% contribution increase",
      current: fmt(params.monthlyContribution),
      recommended: fmt(partialIncrease),
      impact: `Increases projected income to ${fmt(partialProj.totalMoIncome)}/month (+${fmt(partialProj.totalMoIncome - proj.totalMoIncome)})`,
      difficulty: "Low",
    });
  }

  // 2. Timing optimization
  const years = params.retirementAge - params.currentAge;
  if (years > 0 && !proj.meetsGoal) {
    for (const delay of [1, 2, 3, 5]) {
      const laterAge = params.retirementAge + delay;
      if (laterAge > 80) break;
      const laterProj = runProjection({ ...params, retirementAge: laterAge });
      if (laterProj.meetsGoal) {
        optimizations.push({
          category: "Timing",
          title: `Delay income start by ${delay} year${delay > 1 ? "s" : ""}`,
          current: `Age ${params.retirementAge}`,
          recommended: `Age ${laterAge}`,
          impact: `Projects ${fmt(laterProj.totalMoIncome)}/month — meets your goal with ${fmt(laterProj.capDiff)} surplus`,
          difficulty: "Low",
        });
        break;
      }
    }
  }

  // 3. Lump sum optimization
  if (!proj.meetsGoal) {
    const additionalNeeded = Math.abs(proj.capDiff);
    const lumpSumNeeded = additionalNeeded / Math.pow(1 + params.annualReturn / 12, years * 12);
    if (lumpSumNeeded > 0) {
      optimizations.push({
        category: "Lump Sum",
        title: "One-time additional investment",
        current: fmt(params.initialInvestment),
        recommended: fmt(params.initialInvestment + lumpSumNeeded),
        impact: `A ${fmt(lumpSumNeeded)} lump sum today would grow to cover the capital shortfall`,
        difficulty: lumpSumNeeded > 50000 ? "High" : "Medium",
      });
    }
  }

  // 4. Income Type optimization
  if (params.incomeType === "jointLife") {
    const singleProj = runProjection({
      ...params,
      withdrawalRate: params.withdrawalRate * 1.08, // rough single vs joint delta
    });
    if (singleProj.meetsGoal && !proj.meetsGoal) {
      optimizations.push({
        category: "Income Type",
        title: "Consider Single Life option",
        current: "Joint Life",
        recommended: "Single Life",
        impact: "Higher payout rate would meet your income goal (only covers one life)",
        difficulty: "Low",
      });
    }
  }

  return optimizations;
}

// ─── Talking Points Generator ────────────────────────────────────────────────

/**
 * Generate advisor-ready talking points for client conversations.
 */
export function generateTalkingPoints(params) {
  const proj = runProjection(params);
  const points = [];

  if (proj.meetsGoal) {
    points.push(
      `Your current savings strategy is projected to generate ${fmt(proj.totalMoIncome)} per month in retirement income — that's ${fmt(proj.moDiff)} above your ${fmt(params.desiredMonthlyIncome)} monthly goal.`,
      `At age ${params.retirementAge}, your projected portfolio of ${fmt(proj.projValue)} exceeds the required capital of ${fmt(proj.reqCapital)} by ${fmt(proj.capDiff)}.`,
      `This projection assumes a ${pct(params.annualReturn)} average annual return. Even with some market variation, you have a comfortable buffer.`,
    );
  } else {
    points.push(
      `Based on current projections, we're estimating ${fmt(proj.totalMoIncome)} per month at retirement — ${fmt(Math.abs(proj.moDiff))} short of the ${fmt(params.desiredMonthlyIncome)} goal.`,
      `To close this gap, we have several options: increase monthly contributions to ${fmt(proj.neededPmt)}, add a lump sum, or extend the accumulation period.`,
      `The good news is that with ${params.retirementAge - params.currentAge} years until income begins, even moderate adjustments can make a significant impact thanks to compound growth.`,
    );
  }

  if (params.socialSecurity > 0) {
    points.push(
      `Social Security contributes ${fmt(params.socialSecurity)}/month to your income floor, which reduces the investment portfolio's burden and provides a government-backed safety net.`,
    );
  }

  return points;
}
