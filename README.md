# Retirement Income Calculator

A professional-grade retirement income projection tool built with React and Vite, featuring an **AI-powered Copilot Agent** for intelligent financial planning assistance.

## 🧠 AI Copilot Agent

The built-in Retirement Copilot is a comprehensive financial AI assistant that provides:

### Analysis & Simulations
- **Retirement Readiness Score** — 0-100 composite score with 5 sub-components
- **Monte Carlo Simulation** — 2,000-trial probability analysis with percentile breakdowns
- **Sensitivity Analysis** — Ranks which factors matter most to your outcome
- **Growth Timeline** — Year-by-year portfolio projection
- **Milestone Tracking** — When you'll hit $100K, $500K, $1M, etc.
- **Breakeven Analysis** — How long until retirement income recoups contributions

### What-If Scenarios
- "What if I contribute $2,000/month?"
- "What if I retire at 70?"
- "What if returns drop to 8%?"
- "What if I need $8,000/month?"
- "What if I add a $50,000 lump sum?"
- "What if I get $2,000/month Social Security?"

### Smart Recommendations
- Gap analysis with actionable steps to close income shortfalls
- Plan optimization with difficulty ratings
- Advisor talking points for client meetings
- Proactive insight cards that surface automatically

### Fund Comparison
- Side-by-side analysis of ANWPX, AGTHX, and 50/50 Blend
- Monte Carlo success rates per fund
- Risk-adjusted rankings (Sharpe ratio proxy)

### Financial Education
- Explains compound interest, future value, required capital
- Pacific Life variable annuity details
- Withdrawal rate mechanics
- Social Security integration

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── RetirementCalculator.jsx    # Main calculator component (4 tabs)
├── App.jsx                     # App wrapper
├── main.jsx                    # React entry point
└── copilot/
    ├── index.js                # Public API exports
    ├── CopilotAgent.js         # Core orchestrator — intent dispatch & response formatting
    ├── CopilotPanel.jsx        # React UI — sliding chat panel with insights
    ├── NLPEngine.js            # Natural language processing — 30+ intent patterns
    ├── FinancialEngine.js      # Financial calculations — Monte Carlo, projections, scoring
    ├── KnowledgeBase.js        # Domain knowledge — funds, concepts, products
    └── RecommendationEngine.js # Smart recommendations — insights, optimizations, talking points
```

## Features

- **4-Tab Interface**: Inputs → Results → Summary → Rate Table
- **Pacific Life Integration**: Single & Joint Life withdrawal rates (ages 50-80)
- **Fund Options**: ANWPX (12.20%), AGTHX (13.73%), 50/50 Blend (12.965%)
- **PDF Export**: Generate professional client reports
- **Responsive Design**: Works on desktop and mobile
- **AI Copilot**: Click the 🧠 button to open the intelligent assistant

## Built By

Markist Athelus — Farmers Financial Solutions, LLC
