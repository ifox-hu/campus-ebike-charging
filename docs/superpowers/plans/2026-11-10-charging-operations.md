# Charging plans and operations implementation plan

Goal: deliver the user-approved five plans (1h / 2h / 3h / FULL / CUSTOM) across both clients and the server, then complete the useful cross-client workflows from the feature review.

Architecture: retain Vue, uni-app and Spring Boot. The server owns validation, tariff snapshots, quotes and scheduled settlement. Browser-only features remain explicitly local; actual hardware and third-party payment remain simulated.

Decisions: custom duration is an integer from 15 through 720 minutes. FULL uses the existing 1.2 kWh software threshold with a 12-hour safety cutoff, explicitly described as simulation. Existing HOUR_4/HOUR_5 local historical orders must survive migration. Old backend requests default to FULL for compatibility. Existing databases are never reset; additive SQL migration is required.

- [x] Charging: tests for plan validation, duration-based quotes, deadline settlement, ownership and legacy restoration; implement server fields, migration, quote endpoint and scheduler; connect start/session screens.
- [x] Scan: generate/download socket QR codes in both administration modes; H5 image decoding and camera scan with cleanup; keep native WeChat scan and manual fallback.
- [x] User experience: scene filters, favorites/recent stations, order search/date filters, durable per-account message read state derived from server orders and repairs.
- [x] Connected administration: native station/device/socket/rate forms using existing guarded APIs; real map and grouped physical device layout; allow existing OPERATOR role with read-only maintenance controls.
- [x] Operations: date/scene-filtered trend charts and station statistics; durable alert acknowledgement with notes, linked orders/devices; repair assignee and timeline using existing tickets.
- [x] Verification: unit/integration suites, both admin builds, local/connected H5 and WeChat build, focused browser QA, documentation and migration instructions.

Not included: live payment merchant onboarding, real electrical protection or production hardware claims, wallet/points/coupons, mandatory location permission, invented campus data.

Execution log: user delegated remaining implementation choices; keep the existing isolated worktree. Complete inline; no additional approval checkpoints.

Verification: administration 50 tests, user client 63 tests, account service 10 tests, charging service 60 tests; zero failures. Default/Pages/connected administration builds, local/connected H5 builds and WeChat build passed. Pages smoke, mobile five-plan/custom-duration smoke and real isolated Spring/H2 cross-client operations workflow passed. Image decoding exercised; camera hardware and real merchant payment not tested. Existing running database was not migrated or reset.
