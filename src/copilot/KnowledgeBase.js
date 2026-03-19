/**
 * KnowledgeBase — Domain knowledge for the Retirement Copilot
 *
 * Contains explanations of financial concepts, fund information,
 * Pacific Life product details, and retirement planning guidance.
 */

const KNOWLEDGE = {
  // ─── Funds ───────────────────────────────────────────────────────────────

  anwpx: {
    title: "New Perspective Fund A (ANWPX)",
    content: `**ANWPX — New Perspective Fund A** is a global equity fund managed by Capital Group (American Funds). It seeks long-term growth by investing in multinational companies positioned to benefit from global trade and changing economic patterns.

**Key Facts:**
• **Historical Avg. Return:** ~12.20% annually
• **Fund Family:** American Funds / Capital Group
• **Category:** World Large Stock
• **Investment Style:** Growth-oriented, globally diversified
• **Typical Volatility:** ~15.5%

**Why use it for retirement planning?** ANWPX provides global diversification with a strong long-term track record. It's suitable for accumulation-phase retirement portfolios where the investor has a multi-year time horizon.`,
    tags: ["anwpx", "new perspective", "fund", "global", "capital group", "american funds"],
  },

  agthx: {
    title: "Growth Fund of America A (AGTHX)",
    content: `**AGTHX — The Growth Fund of America A** is one of the largest actively managed growth funds in the U.S., run by Capital Group (American Funds). It focuses on large-cap U.S. growth stocks.

**Key Facts:**
• **Historical Avg. Return:** ~13.73% annually
• **Fund Family:** American Funds / Capital Group
• **Category:** Large Growth
• **Investment Style:** Aggressive growth, U.S.-focused
• **Typical Volatility:** ~17%

**Why use it for retirement planning?** AGTHX has historically outperformed its benchmark with strong risk-adjusted returns. Its higher volatility compared to ANWPX means greater potential upside but also more drawdown risk.`,
    tags: ["agthx", "growth fund", "fund", "large cap", "capital group", "american funds"],
  },

  blend: {
    title: "50/50 Blend — ANWPX & AGTHX",
    content: `**The 50/50 Blend** allocates equally between ANWPX (global equity) and AGTHX (U.S. growth), resulting in a diversified growth portfolio.

**Key Facts:**
• **Blended Return:** ~12.965% annually
• **Blended Volatility:** ~14.5% (lower than either fund alone due to diversification)
• **Diversification Benefit:** Combines global + domestic exposure

**Why use it?** The blend offers a middle ground — it captures most of the upside of AGTHX while benefiting from ANWPX's global diversification, resulting in a smoother ride with slightly lower overall volatility.`,
    tags: ["blend", "50/50", "diversification", "combined"],
  },

  // ─── Pacific Life ────────────────────────────────────────────────────────

  pacific_life: {
    title: "Pacific Life Lifetime Income Creator",
    content: `**Pacific Life Lifetime Income Creator** is a living benefit rider (Guaranteed Lifetime Withdrawal Benefit or GLWB) available on select Pacific Life variable annuity contracts.

**How it works:**
1. You invest in a variable annuity during the accumulation phase
2. The rider tracks a **benefit base** that may grow via annual step-ups
3. At your selected income start age, you can begin **guaranteed lifetime withdrawals** at the applicable payout rate
4. The payout rate depends on your age and whether you select Single Life or Joint Life

**Key Features:**
• **Single Life rates:** 5.6% (age 50) to 8.8% (age 80) — applied to the benefit base
• **Joint Life rates:** 5.1% (age 50) to 8.3% (age 80) — lower because it covers two lives
• **Guarantees:** Income is guaranteed for life regardless of market performance, subject to Pacific Life's claims-paying ability
• **Flexibility:** You choose when to start income and can delay for higher rates

**Important:** The payout rate is applied to the benefit base (not necessarily the account value). The benefit base may differ from the actual investment value.`,
    tags: ["pacific life", "lifetime income", "annuity", "withdrawal rate", "rider", "glwb", "guaranteed"],
  },

  withdrawal_rate: {
    title: "Withdrawal / Payout Rate",
    content: `**Withdrawal Rate** (also called payout rate) is the percentage of your retirement capital you withdraw each year to generate income.

**In this calculator:**
The withdrawal rate comes from Pacific Life's Lifetime Income Creator schedule. It varies by:
• **Age at income start:** Higher age = higher rate (5.6%–8.8% single, 5.1%–8.3% joint)
• **Coverage type:** Single Life pays more than Joint Life (since it only covers one person)

**The 4% Rule (for comparison):**
The traditional "4% rule" suggests withdrawing 4% of your portfolio in year one, then adjusting for inflation. Pacific Life's rates are higher because they include a guaranteed income floor backed by the insurance company.

**Required Capital Formula:**
\`Required Capital = (Annual Income Goal) / (Withdrawal Rate)\`
For example, to generate $60,000/year at a 7.3% rate: $60,000 / 0.073 = $821,918`,
    tags: ["withdrawal rate", "payout rate", "4% rule", "required capital", "income"],
  },

  // ─── Financial Concepts ──────────────────────────────────────────────────

  future_value: {
    title: "Future Value (FV)",
    content: `**Future Value** is the projected worth of an investment at a specific point in the future, assuming a given rate of return and regular contributions.

**Formula (monthly compounding):**
\`FV = PV × (1 + r/12)^n + PMT × ((1 + r/12)^n - 1) / (r/12)\`

Where:
• **PV** = Present Value (initial lump sum)
• **PMT** = Monthly payment/contribution
• **r** = Annual rate of return (decimal)
• **n** = Number of months

**Example:** $15,000 initial + $1,000/month for 16 years at 12.965% → approximately $777,000

The power of future value comes from **compound interest** — your returns earn returns, creating exponential growth over time.`,
    tags: ["future value", "fv", "compound interest", "growth", "projection"],
  },

  compound_interest: {
    title: "Compound Interest",
    content: `**Compound Interest** is interest earned on both the principal and previously accumulated interest. It's the fundamental force that makes long-term investing powerful.

**Why it matters for retirement:**
• Year 1: $10,000 at 10% → $1,000 interest
• Year 10: That same $10,000 → ~$25,937 (grew by $15,937)
• Year 20: → $67,275 (grew by $41,338 in the second decade alone!)

**The Rule of 72:** Divide 72 by your annual return to estimate how many years it takes to double your money.
• At 12% → doubles every 6 years
• At 8% → doubles every 9 years

**Key insight:** Time is the most powerful variable. Starting earlier — even with smaller amounts — almost always beats starting later with larger amounts.`,
    tags: ["compound interest", "compounding", "exponential growth", "rule of 72", "time value"],
  },

  required_capital: {
    title: "Required Capital",
    content: `**Required Capital** is the total nest egg you need at retirement to generate your desired income using the applicable withdrawal rate.

**Formula:**
\`Required Capital = Annual Income Goal / Withdrawal Rate\`

**Example:**
• Desired monthly income from investments: $5,000
• Annual need: $60,000
• Pacific Life rate at age 67: 7.50%
• Required Capital: $60,000 / 0.075 = $800,000

**Key considerations:**
• Social Security reduces the income you need from investments
• Higher withdrawal rates (older age) = less capital needed
• Joint Life rates are lower, so you need more capital for the same income`,
    tags: ["required capital", "nest egg", "target", "goal"],
  },

  social_security: {
    title: "Social Security Integration",
    content: `**Social Security** provides a government-guaranteed income floor in retirement. This calculator integrates it by subtracting your estimated SS benefit from your desired income to determine how much must come from investments.

**How it affects planning:**
• \`Net Investment Goal = Desired Income - Social Security\`
• Higher SS benefits → less capital needed from investments
• SS reduces the burden on your portfolio significantly

**Key considerations:**
• Full Retirement Age (FRA) is typically 66-67 depending on birth year
• Claiming early (62) reduces benefits by up to 30%
• Delaying to 70 increases benefits by 8% per year past FRA
• The amount entered in this calculator is a user estimate — verify with SSA.gov

**Example impact:** If you want $5,000/month and expect $2,000 from SS, you only need $3,000/month from investments — reducing required capital by 40%.`,
    tags: ["social security", "ss", "ssa", "government", "benefit", "claiming"],
  },

  variable_annuity: {
    title: "Variable Annuity",
    content: `A **Variable Annuity** is an insurance product that combines investment options with insurance guarantees. The Pacific Life Lifetime Income Creator is a rider attached to a variable annuity.

**Key features:**
• **Tax-deferred growth:** No taxes on gains until withdrawal
• **Investment choices:** Sub-accounts similar to mutual funds
• **Living benefits:** Optional riders (like the Income Creator) that guarantee lifetime income
• **Death benefits:** Minimum payout to beneficiaries

**Pros:** Guaranteed income floor, tax deferral, market participation
**Cons:** Higher fees than pure investments, surrender charges, complexity

**In this calculator:** We model the accumulation phase (growing the benefit base) and then apply the Pacific Life payout rate to estimate lifetime income.`,
    tags: ["annuity", "variable annuity", "insurance", "tax deferred", "guaranteed"],
  },

  inflation: {
    title: "Inflation & Purchasing Power",
    content: `**Inflation** erodes the purchasing power of money over time. A dollar today buys more than a dollar in 20 years.

**Impact on retirement planning:**
• At 3% inflation, $5,000/month today = ~$2,765 in purchasing power in 20 years
• Your retirement income needs will be higher in future dollars
• This calculator uses nominal (non-inflation-adjusted) returns

**Mitigation strategies:**
• Growth-oriented funds (ANWPX/AGTHX) have historically outpaced inflation
• Pacific Life's payout rates apply to the benefit base, which may include step-ups
• Social Security has a Cost of Living Adjustment (COLA)
• Consider building in a buffer above your bare minimum income needs`,
    tags: ["inflation", "purchasing power", "cola", "real return", "nominal"],
  },

  rmd: {
    title: "Required Minimum Distributions (RMDs)",
    content: `**Required Minimum Distributions** are mandatory annual withdrawals from tax-deferred retirement accounts starting at age 73 (as of SECURE 2.0 Act).

**Key rules:**
• Applies to Traditional IRAs, 401(k)s, 403(b)s, etc.
• Does NOT apply to Roth IRAs (during owner's lifetime)
• Penalty for missing RMDs: 25% excise tax (reduced from 50%)
• RMD amounts increase as you age (based on IRS life expectancy tables)

**Relevance to this calculator:** If the annuity is inside a tax-deferred account, RMD rules may affect withdrawal timing and amounts. The Pacific Life income rider payments may satisfy RMD requirements.`,
    tags: ["rmd", "required minimum distribution", "ira", "401k", "tax", "secure act"],
  },
};

// ─── Search / Lookup ─────────────────────────────────────────────────────────

/**
 * Search the knowledge base for relevant entries.
 * Returns the best matching entry or null.
 */
export function searchKnowledge(query) {
  if (!query) return null;

  const q = query.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [key, entry] of Object.entries(KNOWLEDGE)) {
    let score = 0;

    // Exact key match
    if (q.includes(key.replace(/_/g, " "))) score += 10;

    // Tag matching
    for (const tag of entry.tags) {
      if (q.includes(tag)) score += 5;
      // Partial tag match
      const words = tag.split(" ");
      for (const w of words) {
        if (w.length > 3 && q.includes(w)) score += 2;
      }
    }

    // Title word matching
    const titleWords = entry.title.toLowerCase().split(/\s+/);
    for (const w of titleWords) {
      if (w.length > 3 && q.includes(w)) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore >= 4 ? bestMatch : null;
}

/**
 * Get a specific knowledge entry by key.
 */
export function getKnowledge(key) {
  return KNOWLEDGE[key] || null;
}

/**
 * Get all knowledge entries (for browsing).
 */
export function getAllTopics() {
  return Object.entries(KNOWLEDGE).map(([key, entry]) => ({
    key,
    title: entry.title,
  }));
}

export default KNOWLEDGE;
