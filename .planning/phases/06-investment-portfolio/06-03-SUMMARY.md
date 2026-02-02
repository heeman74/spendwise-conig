---
phase: 06-investment-portfolio
plan: 03
subsystem: ui
tags: [react, nextjs, recharts, portfolio, investments, charts]

# Dependency graph
requires:
  - phase: 06-02
    provides: Frontend data layer with five hooks (usePortfolio, useAssetAllocation, useHoldings, useAddHolding, useUpdateHoldingPrice)
provides:
  - Portfolio page UI at /investments with summary, allocation chart, and holdings table
  - PortfolioSummary component showing total value, gains, and stats
  - AssetAllocationChart donut pie chart with custom tooltips
  - HoldingsTable sortable table with null costBasis handling
  - Distinct Sidebar icon for Investments (stock chart icon)
affects: [06-04, future-investment-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Null value graceful handling with em dash for missing cost basis"
    - "Sortable table with SortIcon component pattern"
    - "Empty state with helpful actionable messages"
    - "Color-coded financial gains (green positive, red negative)"

key-files:
  created:
    - spendwise/src/components/portfolio/PortfolioSummary.tsx
    - spendwise/src/components/charts/AssetAllocationChart.tsx
    - spendwise/src/components/portfolio/HoldingsTable.tsx
  modified:
    - spendwise/src/app/(dashboard)/investments/page.tsx
    - spendwise/src/components/layout/Sidebar.tsx

key-decisions:
  - "Em dash (—) for null cost basis instead of $0 or placeholder text"
  - "Default sort by institutionValue descending (shows largest holdings first)"
  - "Stock chart icon for Investments in sidebar to differentiate from Net Worth"
  - "Grid layout: allocation chart 1/3 width, holdings table 2/3 width on desktop"

patterns-established:
  - "Holdings table sortable by clicking column headers with visual sort indicators"
  - "Null costBasis shows em dash in both Cost Basis and Gain/Loss columns"
  - "Empty state prompts user to upload statement or add holdings manually"
  - "Loading states per component (allocation, holdings) rather than full page"

# Metrics
duration: 3min 43s
completed: 2026-02-02
---

# Phase 6 Plan 3: Portfolio Page UI Summary

**Portfolio page at /investments displays total value, color-coded gains, donut asset allocation chart, and sortable holdings table with graceful null handling**

## Performance

- **Duration:** 3min 43s
- **Started:** 2026-02-02T23:45:58Z
- **Completed:** 2026-02-02T23:49:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Portfolio page replaced mock advice content with real investment data visualization
- Asset allocation donut chart with Recharts showing color-coded breakdown and percentages
- Sortable holdings table handles null cost basis gracefully with em dashes
- Sidebar Investments icon changed to stock chart icon (differentiated from Net Worth)
- Empty state guides users to upload statement or add holdings manually

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PortfolioSummary and AssetAllocationChart components** - `b00458f` (feat)
2. **Task 2: Create HoldingsTable, replace investments page, fix Sidebar icon** - `3d73a0c` (feat)

## Files Created/Modified
- `spendwise/src/components/portfolio/PortfolioSummary.tsx` - Hero component showing total value, gains with color coding, and stat boxes (cost basis, holdings count, accounts count)
- `spendwise/src/components/charts/AssetAllocationChart.tsx` - Recharts donut pie chart with custom tooltip showing value and percentage per asset type
- `spendwise/src/components/portfolio/HoldingsTable.tsx` - Sortable table displaying securities with shares, price, value, cost basis, and gains. Handles null costBasis with em dash. Color-codes positive/negative gains.
- `spendwise/src/app/(dashboard)/investments/page.tsx` - Replaced mock advice page with portfolio summary, allocation chart, and holdings table. Includes loading/error/empty states.
- `spendwise/src/components/layout/Sidebar.tsx` - Changed Investments icon from line chart to stock chart icon

## Decisions Made

**Em dash for null cost basis** - Holdings without cost basis show "—" instead of $0 or N/A. Visually cleaner and semantically correct (unknown vs zero).

**Default sort by value descending** - Table defaults to institutionValue DESC so users see their largest holdings first without clicking.

**Stock chart icon differentiation** - Investments sidebar icon changed from same icon as Net Worth to a stock/candlestick chart icon for visual distinction.

**Grid layout ratio** - Asset allocation chart takes 1/3 width, holdings table 2/3 on desktop. Chart is compact reference, table is primary data.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - components followed existing patterns (NetWorthHero, SpendingPieChart), TypeScript and build completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Portfolio page complete and ready for Wave 3 (06-04: statement parser with AI extraction). Users can now view holdings data when it exists. Next step is to enable users to populate that data via brokerage statement uploads.

---
*Phase: 06-investment-portfolio*
*Completed: 2026-02-02*
