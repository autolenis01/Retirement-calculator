/**
 * NLPEngine — Natural Language Processing for the Retirement Copilot
 *
 * Handles intent classification, entity extraction, and semantic matching
 * without any external API. Uses pattern-based NLU with fuzzy matching,
 * synonym expansion, and contextual disambiguation.
 */

// ─── Intent Definitions ──────────────────────────────────────────────────────

export const INTENTS = {
  // Scenario & What-if
  WHAT_IF_CONTRIBUTION:   "what_if_contribution",
  WHAT_IF_AGE:            "what_if_age",
  WHAT_IF_RETURN:         "what_if_return",
  WHAT_IF_INCOME_GOAL:    "what_if_income_goal",
  WHAT_IF_INITIAL:        "what_if_initial",
  WHAT_IF_SS:             "what_if_social_security",
  COMPARE_FUNDS:          "compare_funds",
  COMPARE_SCENARIOS:      "compare_scenarios",

  // Analysis
  RETIREMENT_SCORE:       "retirement_score",
  GAP_ANALYSIS:           "gap_analysis",
  SENSITIVITY:            "sensitivity_analysis",
  MONTE_CARLO:            "monte_carlo",
  TIMELINE:               "timeline",
  MILESTONE:              "milestone",
  BREAKEVEN:              "breakeven",

  // Recommendations
  OPTIMIZE:               "optimize",
  RECOMMEND:              "recommend",
  HOW_TO_CLOSE_GAP:       "how_to_close_gap",

  // Knowledge & Explanation
  EXPLAIN_CONCEPT:        "explain_concept",
  EXPLAIN_FUND:           "explain_fund",
  EXPLAIN_RATE:           "explain_rate",
  EXPLAIN_CALCULATION:    "explain_calculation",

  // State Queries
  CURRENT_STATUS:         "current_status",
  SUMMARIZE:              "summarize",
  PROJECT_VALUE:          "project_value",

  // Misc
  GREETING:               "greeting",
  HELP:                   "help",
  UNKNOWN:                "unknown",
};

// ─── Pattern Rules ───────────────────────────────────────────────────────────

const PATTERNS = [
  // Greetings
  { intent: INTENTS.GREETING, patterns: [/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup|what'?s?\s*up)/i], priority: 1 },
  { intent: INTENTS.HELP, patterns: [/\b(help|what\s+can\s+you\s+do|commands?|menu|options|capabilities)\b/i], priority: 2 },

  // What-if: Contribution
  { intent: INTENTS.WHAT_IF_CONTRIBUTION, patterns: [
    /what\s*(if|happens?|would)\s*.*(contribut|save|put\s*in|invest)\s*\$?[\d,]+/i,
    /\b(change|increase|decrease|raise|lower|double|triple)\s*(my\s*)?(monthly\s*)?(contribut|saving|payment)/i,
    /contribut.*\$?[\d,]+/i,
    /if\s+i\s+(save|contribute|put|invest)\s*\$?[\d,]+/i,
    /how\s+much.*if.*contribut/i,
  ], priority: 10 },

  // What-if: Age
  { intent: INTENTS.WHAT_IF_AGE, patterns: [
    /what\s*(if|happens?|would)\s*.*(retire|start\s*(income|taking)|wait)\s*(at|until)\s*\d+/i,
    /\b(retire|delay|postpone|move)\s*(at|to|until)\s*\d+/i,
    /retire\s*(early|late|earlier|later|sooner)/i,
    /delay\s*(retirement|income)/i,
    /if\s+i\s+(retire|wait|start)\s*(at|until)\s*\d+/i,
  ], priority: 10 },

  // What-if: Return rate
  { intent: INTENTS.WHAT_IF_RETURN, patterns: [
    /what\s*(if|happens?|would)\s*.*(return|growth|rate|perform|market)\s*(is|was|were|at|of)?\s*\d/i,
    /\b(assume|expect|get)\s*\d+%?\s*(return|growth|annual)/i,
    /(lower|higher|worse|better)\s*(return|market|growth|performance)/i,
    /market\s*(crash|downturn|correction|bear|drop)/i,
    /if.*returns?\s*(are|were|was|is|drop|fall|increase)/i,
  ], priority: 10 },

  // What-if: Income Goal
  { intent: INTENTS.WHAT_IF_INCOME_GOAL, patterns: [
    /what\s*(if|happens?)\s*.*(need|want|desire|goal)\s*\$?[\d,]+/i,
    /\b(need|want)\s*\$?[\d,]+\s*(a|per)?\s*month/i,
    /income\s*(goal|target|need)\s*.*\$?[\d,]+/i,
  ], priority: 10 },

  // What-if: Initial investment
  { intent: INTENTS.WHAT_IF_INITIAL, patterns: [
    /what\s*(if|happens?)\s*.*(start|begin|initial|lump\s*sum)\s*(with)?\s*\$?[\d,]+/i,
    /lump\s*sum\s*.*\$?[\d,]+/i,
    /(add|deposit|rollover|roll\s*over)\s*\$?[\d,]+/i,
  ], priority: 10 },

  // What-if: Social Security
  { intent: INTENTS.WHAT_IF_SS, patterns: [
    /what\s*(if|happens?)\s*.*(social\s*security|ss|ssa)\s*(is|was|were|at|of)?\s*\$?[\d,]+/i,
    /social\s*security\s*.*\$?[\d,]+/i,
    /(include|add|with|get)\s*\$?[\d,]+\s*(in|from|of)?\s*social\s*security/i,
  ], priority: 10 },

  // Compare Funds
  { intent: INTENTS.COMPARE_FUNDS, patterns: [
    /\bcompare\s*(funds?|options?|investments?)/i,
    /\b(ANWPX|AGTHX|blend)\s*(vs?\.?|versus|or|compared?\s*to)\s*(ANWPX|AGTHX|blend)/i,
    /which\s*(fund|investment|option)\s*(is\s*)?(best|better|worse)/i,
    /\bdifference\s*(between|in)\s*(the\s*)?(funds?|options?)/i,
  ], priority: 9 },

  // Compare Scenarios
  { intent: INTENTS.COMPARE_SCENARIOS, patterns: [
    /compare\s*(scenario|plan|strateg|option)/i,
    /side\s*by\s*side/i,
    /(best|worst)\s*case/i,
    /scenario\s*(analysis|comparison)/i,
  ], priority: 9 },

  // Monte Carlo
  { intent: INTENTS.MONTE_CARLO, patterns: [
    /monte\s*carlo/i,
    /\b(probability|odds|chance|likelihood|risk)\s*(of|that|i)?\s*(success|reaching|meeting|hitting|making|fail|running\s*out)/i,
    /how\s*(likely|probable|confident|certain|sure)/i,
    /success\s*(rate|probability|chance)/i,
    /risk\s*(analysis|assessment|level|tolerance)/i,
    /simulate/i,
  ], priority: 9 },

  // Retirement Score
  { intent: INTENTS.RETIREMENT_SCORE, patterns: [
    /\b(retirement|readiness|preparedness)\s*(score|grade|rating|number)/i,
    /how\s*(ready|prepared|am\s*i\s*doing|close)/i,
    /score\s*(me|my|this)/i,
    /rate\s*(my|this)\s*(plan|strategy|progress)/i,
    /am\s*i\s*on\s*(track|pace|target)/i,
  ], priority: 8 },

  // Gap Analysis
  { intent: INTENTS.GAP_ANALYSIS, patterns: [
    /gap\s*(analysis)?/i,
    /\b(shortfall|deficit|short|behind|lack|missing|need\s*more)/i,
    /how\s*(much|far)\s*(more|behind|short|away)/i,
    /what\s*(am\s*i|do\s*i)\s*(missing|lack|need\s*more)/i,
  ], priority: 8 },

  // Sensitivity
  { intent: INTENTS.SENSITIVITY, patterns: [
    /sensitiv(ity|e)\s*(analysis)?/i,
    /what\s*(matters?|affect|impact)\s*(most|the\s*most)/i,
    /which\s*(variable|factor|input)\s*(matters?|has|affect|impact)/i,
    /most\s*(important|sensitive|impactful)\s*(factor|variable|input)/i,
  ], priority: 8 },

  // Timeline
  { intent: INTENTS.TIMELINE, patterns: [
    /timeline/i,
    /year\s*by\s*year/i,
    /\b(growth|projection)\s*(chart|table|timeline|path|trajectory)/i,
    /show\s*(me\s*)?(the\s*)?(projection|growth|path)/i,
  ], priority: 7 },

  // Milestone
  { intent: INTENTS.MILESTONE, patterns: [
    /milestone/i,
    /when\s*(will|do|would)\s*(i|we)\s*(reach|hit|get\s*to|have)\s*\$?[\d,]+/i,
    /how\s*long\s*(until|to\s*reach|before|till)/i,
    /when.*\$?[\d,]+/i,
  ], priority: 7 },

  // Breakeven
  { intent: INTENTS.BREAKEVEN, patterns: [
    /break\s*even/i,
    /when\s*(will|do|does)\s*(the\s*)?(annuity|income)\s*(break\s*even|pay\s*(off|back|for\s*itself))/i,
    /pay\s*(for\s*itself|itself\s*back|back)/i,
  ], priority: 7 },

  // Optimize
  { intent: INTENTS.OPTIMIZE, patterns: [
    /\b(optimi[sz]e|maximize|best\s*strategy|ideal)\b/i,
    /\b(best|optimal|ideal|perfect)\s*(plan|strategy|approach|contribution|allocation)/i,
    /how\s*(can|do|should)\s*(i|we)\s*(maximize|optimize|improve|boost|get\s*the\s*most)/i,
  ], priority: 8 },

  // Recommend
  { intent: INTENTS.RECOMMEND, patterns: [
    /\brecommend/i,
    /what\s*(should|would\s*you|do\s*you)\s*(suggest|recommend|advise)/i,
    /\b(suggest|advice|advise|tip|guidance)\b/i,
    /what\s*would\s*you\s*do/i,
  ], priority: 7 },

  // How to close gap
  { intent: INTENTS.HOW_TO_CLOSE_GAP, patterns: [
    /\b(close|bridge|fill|cover|fix|solve|address)\s*(the\s*)?(gap|shortfall|deficit|difference)/i,
    /how\s*(can|do)\s*(i|we)\s*(close|bridge|fix|make\s*up|cover|reach|meet|hit)\s*(the\s*)?(gap|goal|target|shortfall)/i,
    /what\s*(do\s*i|should\s*i)\s*(need\s*to\s*)?(do|change)\s*(to\s*)?(meet|reach|hit|close)/i,
  ], priority: 8 },

  // Explain Concept
  { intent: INTENTS.EXPLAIN_CONCEPT, patterns: [
    /\b(what\s*is|explain|define|tell\s*me\s*about|how\s*does)\s*(a\s*)?(the\s*)?(future\s*value|present\s*value|compound\s*interest|annuit|4%\s*rule|withdrawal\s*rate|required\s*capital|income\s*rider|living\s*benefit|variable\s*annuit|fixed\s*annuit|rmd|required\s*minimum|dollar[\s-]cost|tax[\s-]deferred|roth|ira|401k|403b|pension|inflation|sequence[\s-]of[\s-]return)/i,
    /\bexplain\b/i,
  ], priority: 6 },

  // Explain Fund
  { intent: INTENTS.EXPLAIN_FUND, patterns: [
    /\b(tell\s*me\s*about|what\s*is|explain|info\s*(on|about)?)\s*(ANWPX|AGTHX|new\s*perspective|growth\s*fund|american\s*funds|capital\s*group)/i,
    /\b(ANWPX|AGTHX)\s*(fund|info|details?|performance)/i,
  ], priority: 7 },

  // Explain Rate
  { intent: INTENTS.EXPLAIN_RATE, patterns: [
    /\b(explain|what\s*is|tell\s*me\s*about|how\s*does)\s*(the\s*)?(pacific\s*life|withdrawal|payout|income\s*creator|lifetime\s*income|rider)\s*(rate|work|mean)/i,
    /pacific\s*life/i,
  ], priority: 6 },

  // Explain Calculation
  { intent: INTENTS.EXPLAIN_CALCULATION, patterns: [
    /how\s*(is|are|did|does)\s*(the\s*)?(this|that|it|calculation|number|result|value|projection|income)\s*(calculated|computed|determined|derived|work)/i,
    /show\s*(me\s*)?(the\s*)?(math|formula|calculation)/i,
    /walk\s*me\s*through/i,
  ], priority: 6 },

  // Current Status
  { intent: INTENTS.CURRENT_STATUS, patterns: [
    /\b(current|my)\s*(status|situation|position|standing|numbers?|plan|state)/i,
    /where\s*(do\s*i|am\s*i)\s*stand/i,
    /\bgive\s*me\s*(a\s*)?(rundown|overview|snapshot|summary)\b/i,
  ], priority: 5 },

  // Summarize
  { intent: INTENTS.SUMMARIZE, patterns: [
    /\bsummar/i,
    /\b(overview|recap|brief|tldr|tl;?dr|bottom\s*line|key\s*(points?|takeaway|finding))\b/i,
  ], priority: 5 },

  // Project Value
  { intent: INTENTS.PROJECT_VALUE, patterns: [
    /how\s*much\s*(will|would|can|could)\s*(i|we|my|the)\s*(have|accumulate|save|build|grow|end\s*up)/i,
    /projected?\s*(value|balance|nest\s*egg|portfolio|amount|total|savings?)/i,
    /\b(nest\s*egg|portfolio|savings?|balance)\s*(at|by|in)\s*\d+/i,
  ], priority: 6 },
];

// ─── Entity Extraction ───────────────────────────────────────────────────────

const ENTITY_PATTERNS = {
  money: /\$\s*([\d,]+(?:\.\d{1,2})?)|(?:^|\s)([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd|\$|per\s*month|\/\s*mo(?:nth)?|a\s*month)/gi,
  percentage: /([\d.]+)\s*%/g,
  age: /(?:age\s*|at\s*|until\s*|to\s*)(\d{2})/gi,
  years: /(\d+)\s*(?:years?|yrs?)/gi,
  fund: /\b(ANWPX|AGTHX|blend|new\s*perspective|growth\s*fund)/gi,
  number: /(?:^|\s)\$?([\d,]+(?:\.\d{1,2})?)(?:\s|$|\/)/g,
};

/**
 * Extract numeric entities from user input.
 */
export function extractEntities(text) {
  const entities = { money: [], percentages: [], ages: [], years: [], funds: [], numbers: [] };

  let m;
  // Money
  const moneyRe = /\$\s*([\d,]+(?:\.\d{1,2})?)/g;
  while ((m = moneyRe.exec(text))) entities.money.push(parseFloat(m[1].replace(/,/g, "")));
  // Also catch "5000 per month", "5000 a month"
  const moneyAlt = /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|per\s*month|\/\s*mo(?:nth)?|a\s*month)/gi;
  while ((m = moneyAlt.exec(text))) entities.money.push(parseFloat(m[1].replace(/,/g, "")));

  // Percentages
  const pctRe = /([\d.]+)\s*%/g;
  while ((m = pctRe.exec(text))) entities.percentages.push(parseFloat(m[1]));

  // Ages
  const ageRe = /(?:age|at|until|to|retire\s*(?:at)?)\s*(\d{2})/gi;
  while ((m = ageRe.exec(text))) entities.ages.push(parseInt(m[1], 10));

  // Years
  const yearsRe = /(\d+)\s*(?:years?|yrs?)/gi;
  while ((m = yearsRe.exec(text))) entities.years.push(parseInt(m[1], 10));

  // Funds
  const fundRe = /\b(ANWPX|AGTHX|blend)\b/gi;
  while ((m = fundRe.exec(text))) entities.funds.push(m[1].toUpperCase());

  // Raw numbers (fallback)
  const numRe = /(?:^|\s)([\d,]+(?:\.\d{1,2})?)(?=\s|$|[.,!?])/g;
  while ((m = numRe.exec(text))) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (n > 0 && !entities.money.includes(n)) entities.numbers.push(n);
  }

  return entities;
}

// ─── Intent Classification ───────────────────────────────────────────────────

/**
 * Classify user input into an intent with confidence and extracted entities.
 */
export function classify(text) {
  if (!text || typeof text !== "string") {
    return { intent: INTENTS.UNKNOWN, confidence: 0, entities: {}, raw: "" };
  }

  const cleaned = text.trim();
  const entities = extractEntities(cleaned);

  let bestIntent = INTENTS.UNKNOWN;
  let bestScore = 0;
  let bestPriority = 0;

  for (const rule of PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(cleaned)) {
        const score = rule.priority;
        if (score > bestScore || (score === bestScore && rule.priority > bestPriority)) {
          bestIntent = rule.intent;
          bestScore = score;
          bestPriority = rule.priority;
        }
      }
    }
  }

  // Confidence heuristic: high priority + entity presence = higher confidence
  let confidence = Math.min(1, bestScore / 10);
  if (entities.money.length > 0 || entities.percentages.length > 0 || entities.ages.length > 0) {
    confidence = Math.min(1, confidence + 0.15);
  }

  return {
    intent: bestIntent,
    confidence,
    entities,
    raw: cleaned,
  };
}

/**
 * Generate follow-up suggestions based on the current intent.
 */
export function getSuggestions(intent) {
  const suggestions = {
    [INTENTS.GREETING]:            ["How's my retirement plan looking?", "Run a Monte Carlo simulation", "Compare all three funds"],
    [INTENTS.CURRENT_STATUS]:      ["What's my retirement score?", "How can I close the gap?", "Run a risk analysis"],
    [INTENTS.RETIREMENT_SCORE]:    ["How can I improve my score?", "What if I increase contributions?", "Run Monte Carlo"],
    [INTENTS.GAP_ANALYSIS]:        ["How do I close the gap?", "What if I delay retirement?", "Optimize my plan"],
    [INTENTS.MONTE_CARLO]:         ["What if returns drop to 8%?", "Optimize my contributions", "Compare funds"],
    [INTENTS.COMPARE_FUNDS]:       ["Which fund is best for me?", "What about a bear market?", "Show my timeline"],
    [INTENTS.WHAT_IF_CONTRIBUTION]: ["What's my new score?", "Compare all scenarios", "Run Monte Carlo"],
    [INTENTS.WHAT_IF_AGE]:         ["What's the breakeven?", "Show the timeline", "Optimize my plan"],
    [INTENTS.OPTIMIZE]:            ["Run Monte Carlo", "Compare funds", "Show me the gap analysis"],
    [INTENTS.HELP]:                ["What's my retirement score?", "Run Monte Carlo", "Compare funds", "What if I contribute $2000?", "Optimize my plan"],
  };
  return suggestions[intent] || ["What's my retirement score?", "Run Monte Carlo", "Compare funds"];
}
