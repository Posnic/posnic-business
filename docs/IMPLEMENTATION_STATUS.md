# Implementation status

Version 0.1.0 development foundation, 28 September 2026.

## Present

- Public-repository source layout, Expo/React Native shell and separate Business application identity.
- Light/dark Today, Insights, Inbox and More screens using fictional Anbu Café data.
- Capability-based sample access, single-branch auto-selection, multiple-branch selector and explicit zero-access state.
- Overview schema/scope validation, safe money formatting, pure gesture rules and local sample adapter.
- Refresh control/button with offline preservation; item detail with Previous/Next and native interior swipe responder.
- Cloud/Community HTTPS compatibility checks with cancellation, timeout and unsupported/unreachable states. Compatible servers expose a separate browser sign-in flow.
- Cloud and Community browser authorization with PKCE, matching code, session context, sign-out and separate real-account screens. Cloud resolves the account to a tenant using a one-use proof-bound gateway handoff. Companion server changes are in review; deployment is pending.
- Native six-digit PIN vault with device secure storage, scrypt/AES-GCM encryption, a persistent five-attempt limit and background locking. Only origin/token/expiry are remembered; device testing remains required. Browser preview keeps sessions in memory only.
- Optional strong biometric unlock using OS-protected credential reads, PIN-enrollment binding, background cancellation and an inactive-screen privacy cover. PIN fallback remains available. Connected-device listing and confirmed removal use the account-scoped server session API.
- Reporting transport with POS-token format rejection, bounded response streaming and exact scope/date checks. Expo fetch is used for explicit native cookie omission and redirect rejection; native runtime qualification remains pending.
- Live Today screen for version-2 prepared summaries: sales after returns including tax, billed sales, returns and bill count. Branch-local dates, single-branch auto-selection, pull-to-refresh, strict reconciliation and partial/delayed labels. Failed refresh clears amounts; access loss locks the account. The companion desktop/gateway pipeline has local real-database tests; production deployment is pending.
- Centralized English copy, 18-language target registry, test/format/build scripts and CI workflow.
- Private real-account Inbox with bounded pagination, read status, pull-to-refresh and Android Back. Daily per-branch schedules and quiet hours use branch time with revision checks. The companion server persists delivery without an open phone, requests desktop preparation in advance and checks current access before delivery and history reads. Unavailable data produces an explicit notice. A native push adapter is implemented but awaits provider credentials and physical-device qualification.

## Pending

- Broader real-business report reconciliation and source-completeness checkpoints. Actual sale/return writers and a 100,000-sale desktop fixture have been checked locally; production and low-end hardware remain unqualified.
- Community HTTPS deployment qualification, native secure-storage qualification and cache revocation. Local Community publication without Gateway is implemented in the companion POS draft.
- Native push provider/device qualification and official-app Community relay, session-close and stock triggers, and remote approval request/application service.
- The 17 non-English Business translations and native-speaker sign-off. Current UI is English only.
- Full native navigation stack, iPhone interactive Back, Android predictive-back animation, native haptics, sheet behavior and device accessibility/lifecycle checks.
- Real-device testing, signed release builds, store publication and production deployment. Earlier authorization code compiled successfully into an Android debug APK and iOS simulator app; newer biometric changes still require native compilation and device validation.

Sample access profiles in More are development controls; a production build must receive capabilities from its authenticated server. They are not authorization or a way for staff to elevate access.

Validation results are maintained with the initial release commit and repository CI. A passing web export or synthetic unit test is not proof of native device readiness or production report correctness.

Initial local verification: TypeScript check, 11 domain tests, attribution check, formatting check, web export and 3 browser tests passed. Browser coverage includes scope/ACL behavior, item navigation, offline refresh, unavailable sign-in, Community address validation and 320px overflow checks.

Connection milestone local verification: TypeScript, 16 domain/transport tests, attribution, web export and 4 browser tests passed. New checks cover issuer/protocol mismatch, cancellation, timeout, malformed responses, denied scopes, incorrect dates and obsolete UI requests. Responses are mocked; no production account or live reporting endpoint has been exercised.

Authorization checkpoint: 29 app domain/transport/vault tests and six tenant-server integration tests pass locally. The Cloud account-service suite passes 598 tests and the gateway suite 214. Five browser flows cover sample behavior, connection, real scope, sign-out and connected-device removal. These use controlled responses, not a deployed production account.

Native build run 36376341281 produced an Android debug APK and iOS simulator app for the earlier authorization commit. The additional native-build workflow was removed from this branch after the repository's local-verification/cost rule was discovered; local commands remain documented in NATIVE_VALIDATION.md. No device readiness is claimed. The inherited uuid build dependency is overridden to patched 11.1.1.

Prepared-report checkpoint: 31 app tests and five browser flows pass. Browser coverage includes verified live totals, explicit partial data, no branch selector for a single branch and clearing an amount after unavailable refresh. Companion local verification includes 14 POS authentication/read/preparation tests, nine gateway publication/agent integration tests and 82 sale-writer/metric tests. These do not prove deployed source completeness, native readiness or production scale.

Publisher-management checkpoint: owners with branch membership can select a recently connected desktop, confirm replacement and immediately clear/reload previous totals. The server uses a generation check and durable audit journal. Local checks pass 33 app tests, five browser flows (including explicit confirmation), 16 POS integration tests and ten gateway reporting tests. Management is on the branch's Reporting desktop page, not a Features switch.

Notification checkpoint: 35 app tests and five browser flows pass, including saving a schedule, reading an unavailable notice and marking it read. POS validation passes 11 Business access/reporting route tests, five real-Mongo notification tests and six scheduling/worker unit tests. Quiet hours, daylight-saving gaps/repeated hours, concurrent workers, interrupted checkpoints, ACL removal and tenant fairness are covered. The mobile preview has been visually checked at 390px. These are local checks, not native push or deployed production validation.

Push adapter checkpoint: native opt-in, project-bound registration, generic lock-screen alerts and safe Inbox navigation are implemented. Companion server delivery uses retry records and receipt checks, current session/ACL validation and registration generations. Local checks pass 37 app tests, five browser flows and Android/iOS JavaScript exports. Provider tests use a fake transport; no actual push has been sent. Production project credentials, physical-device validation and a Community relay are still required; see PUSH_NOTIFICATIONS.md.
