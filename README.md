# Retirement Income Projection Calculator

A React-based internal tool for financial advisors to model retirement income projections using **ANWPX**, **AGTHX**, and **Pacific Life Lifetime Income Creator** payout rates, with Social Security integration.

## Features

- **Fund Options** — New Perspective Fund A (ANWPX), Growth Fund of America A (AGTHX), or a 50/50 blend
- **Pacific Life Rate Table** — Single Life and Joint Life payout rates for ages 50–80
- **Income Projection** — Future value calculations with monthly contributions
- **Goal Analysis** — Compares projected income vs. desired retirement income
- **Print & PDF Export** — Generate a polished client-ready report
- **Tabbed Interface** — Inputs, Results, Summary, and Rate Table views

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 18** — UI library
- **Vite 6** — Build tool & dev server
- **Inline CSS** — No external CSS framework required

## Project Structure

```
├── index.html                  # Entry HTML (loads Google Fonts)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                # React root mount
    ├── App.jsx                 # App shell
    └── RetirementCalculator.jsx # Main calculator component
```

## Financial Calculations

| Concept | Formula |
|---|---|
| Future Value | `FV = PV × (1 + r/12)^n + PMT × ((1 + r/12)^n − 1) / (r/12)` |
| Required PMT | `PMT = (Target − PV × GF) × (r/12) / (GF − 1)` |
| Required Capital | `Annual Income Goal / Pacific Life Withdrawal Rate` |
| Net Monthly Goal | `Desired Monthly Income − Social Security` |

## Disclaimer

This tool is for **internal planning purposes only**. Historical return assumptions are used. Past performance does not guarantee future results. Pacific Life income guarantees are subject to contract and rider terms.

---

*Built by Markist Athelus, Financial Services Agent, District 41 — Farmers Financial Solutions, LLC*
