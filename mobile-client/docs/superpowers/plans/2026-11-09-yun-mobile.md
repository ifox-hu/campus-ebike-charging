# YunCharge Mobile Implementation Plan

> **For agentic workers:** Execute inline, one coherent step at a time; preserve the parallel admin task's directory.

**Goal:** 参考云创移动端，用同一套 uni-app 页面输出可体验 H5 和微信小程序。
**Architecture:** Pure domain module owns simulated state and fees; uni-app pages consume a reactive local store; platform-specific scanner stays at the UI boundary.
**Tech Stack:** Official uni-preset-vue Vite branch dependency versions, Vue 3, uni-app, Node test runner.
**Spec:** `../specs/2026-11-09-yun-mobile-design.md`

## Global Constraints
- Only edit 云创用户端; no production backend, payment, location or upstream service calls.
- Demo rates 0.60+0.20 yuan/kWh, 300W, start-time snapshot; local simulation explicitly labeled.
- H5 and mp-weixin share pages but do not yet share persisted state.

## Review Focus
- Missing/unknown socket IDs cannot start a session.
- Offline, busy and faulty sockets stay unavailable, including direct code entry.
- Repeated start/stop/pay cannot duplicate orders or money.
- Reload retains current session; invalid stored data resets safely.
- Long station names and narrow screens must not hide action buttons.

### Task 1: Domain and persistence
- [x] Write tests in tests/charging.test.mjs covering unavailable sockets, invalid codes, repeated actions, rate snapshot, 90 minutes -> 0.450 kWh -> 36 cents, report validation.
- [x] Run node --test tests/*.test.mjs and see missing implementation fail.
- [x] Implement src/domain/charging.mjs and src/store.js; run tests green.

### Task 2: Shared mobile pages
- [x] Implement common header/tab bar, station map/list, detail, session, orders, mine and reporting pages; source artwork independently created.
- [x] Use MP-WEIXIN conditional scanning and H5 number entry; preserve explicit demo labels.
- [x] Compile H5 and mp-weixin; fix any platform errors at their source.

### Task 3: Browser proof and delivery
- [x] Exercise full charging/payment/history/report flow and unavailable socket paths in browser.
- [x] Verify small screen, no horizontal overflow, refresh persistence, console errors.
- [x] Record tested scope, source attribution, start instructions and backend integration boundaries in README; retain a local preview.

## Execution result
2026-11-09: eight domain tests green; H5 and mp-weixin builds passed; listed browser flows passed. Only H5 runtime inspected; WeChat runtime pending own AppID. No source UI code was located, so the user-authorized documentation/screenshot route was used. No backend connection or production publish.
