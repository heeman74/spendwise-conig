# Phase 2: Plaid Integration Foundation - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can connect financial institutions via Plaid Link, see connection status, re-authenticate broken connections, and unlink institutions. Frontend Plaid Link flow and backend token exchange infrastructure. Manual and Plaid-linked accounts coexist in the UI.

</domain>

<decisions>
## Implementation Decisions

### Connection management UI
- "Connect Bank" button lives on both the accounts page (header) and in a settings page
- Accounts page groups ALL accounts by account type (Checking, Savings, Credit, Investment) — not by institution
- Both manual and Plaid-linked accounts appear in the same type groups, unified view
- Each account card shows institution name + institution logo (from Plaid's logo API)
- "Connect Bank" button appears in empty type groups AND always in the page header
- Balance summary at top of accounts page, broken down by account type (Total Checking, Total Savings, etc.)
- Users cannot hide/exclude individual accounts from a linked institution in v1
- Settings page shows full institution management: list of institutions with accounts, last sync time, status, re-auth button, unlink button
- Individual accounts always visible under each institution in settings (not expandable/collapsed)

### Link flow experience
- After Plaid Link closes successfully: dedicated success summary screen showing "Connected Chase! Found 3 accounts" with account details
- Success summary screen includes "Connect Another Bank" button alongside "Done" for chaining multiple institutions
- On Link failure (cancel, institution error, network): brief toast notification, user stays on current page, can try again
- During token exchange: full-page loading state ("Connecting your accounts...") with spinner, blocks interaction until complete

### Re-auth & error handling
- Broken connections shown via warning badge/icon on affected account cards (no separate banner)
- Re-auth triggered from both: clicking the warning badge on account cards AND from the settings page
- After 2-3 re-auth failures: suggest unlinking and reconnecting the institution
- Stale data handling while connection is broken: Claude's discretion

### Unlinking behavior
- Confirmation requires typing the institution name (like GitHub repo deletion)
- During confirmation, user chooses: keep data as manual accounts OR delete all data from that institution
- Unlink accessible from both settings page and account card three-dot menu
- After unlinking: brief confirmation screen showing "Chase disconnected. X accounts removed/converted."

### Claude's Discretion
- Connection status indicator design (color dots, icons, etc.) — pick what fits existing UI
- Visual distinction between manual and Plaid-linked accounts — pick based on existing component patterns
- Stale data presentation while connection is broken — balance visibility vs honesty
- Whether manual account creation is also accessible from the accounts page header

</decisions>

<specifics>
## Specific Ideas

- Institution logos from Plaid's logo API should be displayed alongside account cards
- The success summary after connecting feels like a "receipt" — show what was found
- Typing institution name to confirm unlink is the strongest confirmation pattern — financial data is serious
- The accounts page should feel like one unified view, not "linked vs manual" — account type is the organizing principle

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-plaid-integration-foundation*
*Context gathered: 2026-01-30*
