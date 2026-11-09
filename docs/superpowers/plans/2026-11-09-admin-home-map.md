# Admin Home Map Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in this session. User approved the layout and implementation; proceed inline.

**Goal:** Add the station map below existing dashboard metrics without replacing any dashboard block.

**Architecture:** Pure station summaries use the existing socketStatus business rules. A focused Vue card loads AMap 2.0, renders station markers and a linked detail panel, and emits existing scoped navigation events. No new dependencies or backend changes.

**Tech Stack:** Existing Vue3/Vite, native AMap2.0, Node test runner, optional existing Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-admin-home-map-design.md`

## Global Constraints
- Keep the seven metrics, date controls, charts, reports and alarms.
- Only target the original local dashboard used at5195; retain unrelated worktree changes.
- Never invent coordinates, clear storage or change charging/payment state.
- Configuration keys remain local and untracked.

## Review Focus
- Offline/disabled/abnormal sockets must not count as free.
- Missing, invalid and foreign-coordinate-system positions must not become markers.
- Search/filter changes and refreshed data must not leave stale selection.
- Missing SDK/configuration and late responses must preserve list/detail navigation.
- Device/report navigation must preserve station scope; map keyboard interaction must work.

### Task 1: Station summaries and coordinate filtering
- [x] Add tests for real seed counts, status changes, pending repairs, coordinate validation, search/filter and missing positions; run RED.
- [x] Implement `src/domain/stationMap.js`; run the focused and full test suite GREEN.

### Task 2: Map card and dashboard integration
- [x] Implement `src/services/amap.js` and `src/components/DashboardStationMap.vue`; reuse local legacy AMap configuration through Vite without committing credentials.
- [x] Insert card after metric-grid in DashboardPage; preserve existing navigation and original charts.
- [x] Run build, browser checks for ordering, selection/search/filter, scoped jumps, unavailable map, narrow screens and teardown/re-entry.

### Task 3: Review and delivery
- [x] Visually inspect the actual5195 page and map fallback; fix observed issues only.
- [x] Run full tests/build and document proof. Commit only this feature's files on codex/admin-home-map, then fast-forward original main per prior merge authorization.

## Execution Ledger
- Started on2026-11-09. Original main has unrelated README/backend-integration changes; preserve them. Existing linked admin worktree is actively adding connected insights; leave those files alone.
- Task1 complete:5 new unit tests passed; full suite33/33. Summary follows existing socketStatus and never changes data.
- Task2 complete:actual AMap tiles loaded on5195; selection, state/search filters and station-scoped navigation passed. Provider outage, invalid coordinates, empty station list and keyboard fallback passed. Existing plots retained.
- Review correction:inherited plot-card fixed height cropped the new map; a browser assertion reproduced RED, explicit auto height fixed GREEN. Native tiles and fallback screenshots visually reviewed.
- Task3 verification:33 tests, normal build and connected build passed; page errors0. Generated screenshots and JSON stay ignored in qa. No credentials or unrelated local docs staged.
