# Implementation status

Version 0.1.0 development foundation, 28 September 2026.

## Present

- Public-repository source layout, Expo/React Native shell and separate Business application identity.
- Light/dark Today, Insights, Inbox and More screens using fictional Anbu Café data.
- Capability-based sample access, single-branch auto-selection, multiple-branch selector and explicit zero-access state.
- Overview schema/scope validation, safe money formatting, pure gesture rules and local sample adapter.
- Refresh control/button with offline preservation; item detail with Previous/Next and native interior swipe responder.
- Cloud/Community HTTPS compatibility checks with cancellation, timeout and unsupported/unreachable states. Compatible servers expose a separate browser sign-in flow.
- Tenant-server browser authorization with PKCE, matching code, session context, sign-out and separate real-account screens. The companion server implementation is in the POS Business authorization change; deployment and the central Cloud account-directory flow are pending.
- Native six-digit PIN vault with device secure storage, scrypt/AES-GCM encryption, a persistent five-attempt limit and background locking. Only origin/token/expiry are remembered; device testing remains required. Browser preview keeps sessions in memory only.
- Reporting transport with POS-token format rejection, bounded response streaming and exact scope/date checks. Expo fetch is used for explicit native cookie omission and redirect rejection; native runtime qualification remains pending.
- Centralized English copy, 18-language target registry, test/format/build scripts and CI workflow.

## Pending

- Phase 0 completion and reconciliation with real POS report fixtures.
- Live reporting API and prepared summaries, source checkpoints, Cloud directory authorization, biometric unlock, native secure-storage qualification and cache revocation.
- Actual notification schedules/delivery and remote approval request/application service.
- The 17 non-English Business translations and native-speaker sign-off. Current UI is English only.
- Full native navigation stack, iPhone interactive Back, Android predictive-back animation, native haptics, sheet behavior and device accessibility/lifecycle checks.
- Android/iOS compiled builds and device testing, store publication and production deployment.

Sample access profiles in More are development controls; a production build must receive capabilities from its authenticated server. They are not authorization or a way for staff to elevate access.

Validation results are maintained with the initial release commit and repository CI. A passing web export or synthetic unit test is not proof of native device readiness or production report correctness.

Initial local verification: TypeScript check, 11 domain tests, attribution check, formatting check, web export and 3 browser tests passed. Browser coverage includes scope/ACL behavior, item navigation, offline refresh, unavailable sign-in, Community address validation and 320px overflow checks.

Connection milestone local verification: TypeScript, 16 domain/transport tests, attribution, web export and 4 browser tests passed. New checks cover issuer/protocol mismatch, cancellation, timeout, malformed responses, denied scopes, incorrect dates and obsolete UI requests. Responses are mocked; no production account or live reporting endpoint has been exercised.

Authorization checkpoint: 22 app domain/transport/vault tests, five browser flows, and six server integration tests pass locally. Android prebuild succeeds. Native compilation is being added to CI; no device readiness is claimed. The inherited uuid build dependency is overridden to patched 11.1.1; npm audit currently reports zero vulnerabilities.
