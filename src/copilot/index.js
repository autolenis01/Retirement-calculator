export { processMessage, getProactiveInsights, getQuickActions, stateToParams } from "./CopilotAgent.js";
export { default as CopilotPanel } from "./CopilotPanel.jsx";
export { classify, INTENTS } from "./NLPEngine.js";
export {
  runProjection, monteCarloSimulation, retirementReadinessScore,
  sensitivityAnalysis, compareFunds,
} from "./FinancialEngine.js";
export { searchKnowledge } from "./KnowledgeBase.js";
export { generateInsights, generateOptimizations } from "./RecommendationEngine.js";
