# Delivery roadmap

The dedicated Business app is separate from Mobile POS and Captain. It reads bounded summaries and leaves long reports and heavy administration to desktop.

| Phase | Deliverable                                                                                            | Gate                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Reporting, sync, identity, ACL and event compatibility audit; canonical metrics and contract decisions | Reconcile actual POS fixtures; resolve source completeness, reporting credentials, scope and cost blockers before live integration |
| 1     | Public repository, native app shell, design components, typed client boundary and local sample adapter | Reproducible clean build, tests and attribution checks; accessible single/multi/zero-branch states                                 |
| 2     | Cloud-primary and Community browser authorization, secure remembered session, PIN recovery and ACL     | Separate reporting grant; no stored account password; revocation, issuer isolation and native secure-storage tests                 |
| 3     | Accurate Today, scoped drill-down and data freshness                                                   | Canonical reconciliation and bounded query budgets; no checkout latency regression                                                 |
| 4     | Item/stock insights, Inbox, closing/fixed-time summaries and notification preferences                  | Durable delivery, deduplication, quiet hours, business timezone, retries and revoked-access handling                               |
| 5     | Large-discount request/review/approve/decline and till application acknowledgement                     | Operation binding, expiry, concurrency, one-use consumption, audit history and verified application                                |
| 6     | Localization, accessibility, security, device lifecycle, load/battery QA, pilot and release            | Language review, native device evidence, privacy/store requirements and rollback gates                                             |
| 7     | Evidence-led extra approval types and cross-instance aggregation                                       | Independent ACL, source correctness and bounded computation cost                                                                   |

Phase 1's public repository and sample foundation are implemented. Phase 2's Cloud/Community browser authorization, encrypted PIN, optional biometric unlock and session management are implemented with companion server changes; deployment and real-device qualification remain gates. Phase 0's metric reconciliation and source-completeness work continue before live reporting. A public source repository is not an app-store or production release.

## Product requirements

- Today, Insights, Inbox, More; simple native controls and progressive detail. No phone charting dependency.
- Branch selector depends on accessible branch count, never role name. One branch is automatic; zero means unavailable.
- All data and actions ultimately require server-side capabilities, branch checks and field filtering. Hiding buttons is only a UI layer.
- Initial public release targets 18 languages; Arabic RTL, local number/date formatting, recipient-language notifications and native-speaker review of high-impact wording.
- Cloud sign-in is primary; own Community server remains a visible option. PIN is local unlock, not server authorization. Protect refresh credentials with platform secure storage and never retain passwords.
- Current/delayed/partial/offline/unavailable are distinct. Refreshing an API does not establish source completeness.
- Daily summaries can run after a real session-close event or at a configured time such as 23:00. Respect timezone, quiet hours and provisional data; deduplicate close/fallback schedules.
- Approval review shows requester, reason, bill version, before/after amounts and policy. “Approved” is distinct from “Applied at till.” No financial action is executed by a swipe.
- Use indexed, bounded reads of prepared summaries and small incremental updates. No historical rebuild or heavy report is triggered by opening a screen.
- Personal preferences belong under More; organizational settings belong on their corresponding desktop module page. Features cards remain switches only.

Next implementation work: complete the canonical POS fixture/metric mapping and source-completeness protocol, then implement bounded prepared summaries and live read screens. Continue device qualification alongside this work.
