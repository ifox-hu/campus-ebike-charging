# Project Quality Implementation Plan

> Execution: implement directly in the current session; preserve unrelated working changes.

**Goal:** Improve maintainability and complete rate configuration and repair assignment workflows.
**Architecture:** Extract domain validation and refresh scheduling from Vue pages. Move operator and team transactions to dedicated services; keep API contracts and ownership checks.
**Tech Stack:** Existing Vue 3, Java 17 and Spring Boot; ESLint 9, Prettier 3.
**Spec:** ../specs/2026-11-23-project-quality-design.md

## Constraints

- Preserve original logo, login effects, current roles, historical billing and unrelated edits.
- Synchronize the actual backend and the main repository's corresponding source files.
- Do not restart existing in-memory development services; use isolated verification ports.
- Avoid database changes and public API renames in this iteration.

## Review Focus

- Rate boundaries: invalid times, adjacency, gaps, overlaps and midnight.
- Repair assignment: disabled accounts, another operator, historical assignees and failed loads.
- Refresh: logout, page hidden, pending edits, simultaneous requests and failed slow refresh.
- Refactoring: preserve last-admin guard, tenant checks, locking order and rollback.
- Standards: Vue macros, browser/node globals and formatting must not change behavior.

## Tasks

- [x] Add failing domain tests for rate schedule validation, preview, assignee filtering and refresh policy.
- [x] Implement tested domain modules and wire rate/repair pages, including static-demo compatibility.
- [x] Extract operator/team services and unify API responses; run backend contract tests in both repositories.
- [x] Extract refresh policy; verify fast/slow requests and preserve session revision checks.
- [x] Add lint/format tooling and CI; format management source and fix substantive lint findings.
- [ ] Run complete relevant suites/builds, inspect browser flows, synchronize README/screenshots and deploy.

## Implementation Rulings

- The main repository's charging-service is the original single-platform backend and has no operator entity. Keep its model and add compatible assignee lookup and unified response handling; extract operator/team services only in the actual multi-operator companion backend. Copying those services wholesale would introduce missing dependencies and change the original model.
- Extract refresh timing decisions into refreshPolicy.js; keep requests and session-revision acceptance in ConnectedApp.vue so existing logout and dialog guards remain in one place.
- Keep static demo's all-day station pricing and display it with the shared preview; actual multi-period editing remains in connected mode.

## Verification Record

- Management lint/format checks and 115 domain/request tests; user clients have 71 and 69 tests. H5 and WeChat builds checked for both clients.
- Main backend aggregate tests passed; companion backend has 111 tests passing. Old unrelated report XML files remain in target and are not part of the current run.
- Browser: static fee preview, team dropdown, PROCESSING to RESOLVED, persisted history and overdue exclusion; connected cross-period fee preview, overlap prevention before save, owner-scoped candidates and assignment history.
- Browser: manual refresh followed by two automatic connector refreshes issues no stations/operators/users base requests during the fast cycle.
- Independent review found a static-demo handoff issue retaining an original platform assignee. Added a failing regression test, then fixed the adapter while preserving cross-operator rejection.
- README and developer conventions updated; fee and repair screenshots captured from the local static frontend.
