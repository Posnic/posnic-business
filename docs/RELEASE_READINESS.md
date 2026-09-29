# Release readiness — 29 September 2026

Status: test prerelease available; production release is not ready.

## Artifacts and verified scope

- Public app: [Posnic Business](https://github.com/Posnic/posnic-business).
- Published Android test build: [preview 5](https://github.com/Posnic/posnic-business/releases/tag/v0.1.0-preview.5), source `d699c241e98c96e0d0c1fd516db8e311f0d95b93`, versionCode 5. Development-signed, with embedded JavaScript/assets.
- That release passed 96 app tests, 39 browser flows, native compilation and Android 15 installation/sample/Insights/paging/resume smoke checks. This is not connected-account or physical-device qualification.
- Later mobile commit `b697358` blocks unused storage/overlay permissions. Android prebuild verifies removal directives; the published APK does not contain this change. The next merged APK needs inspection and installation testing.
- Companion review: [POS #1023](https://github.com/Posnic/POS/pull/1023), [Gateway #28](https://github.com/Posnic/Gateway/pull/28), and [mobile #17](https://github.com/Posnic/posnic-business/pull/17). These remain drafts, stacked on earlier feature branches.
- [POS CI](https://github.com/Posnic/POS/actions/runs/36554593950) passed all jobs at `9ce4ab64`. Later local stock-retention commits are not covered by that CI run. Their focused integration evidence is recorded in the POS stock-alert document.

## Requirement audit

| Requirement                                              | Current evidence                                                                                                                                           | Remaining release gate                                                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Separate, easy-to-use Business app and public repository | Dedicated native shell and sample; narrow-screen, large-text and navigation browser checks                                                                 | Physical-device usability and accessibility review                                                                                       |
| Useful lightweight analytics                             | Bounded prepared Today, seven-day Insights, item ranking/detail and Stock watch; unavailable/partial states; desktop-only scans                            | Real-business reconciliation, low-end desktop/device load and source completeness                                                        |
| Live ACL and branch control                              | Dedicated Business sessions, server checks, independent financial/stock/approval access; single-branch chooser hidden; revocation integration tests        | Deployed end-to-end scope and revocation testing                                                                                         |
| Remembered authentication, PIN and biometrics            | Encrypted device vault, six-digit PIN, persistent five-attempt limit, optional strong biometrics and background lock; unit tests                           | Physical SecureStore/biometric enrollment, process death and app-switcher privacy tests                                                  |
| Cloud-first and Community login                          | HTTPS browser authorization, PKCE and dedicated tenant handoff; protocol and browser tests                                                                 | Actual deployed compatible origins and controlled accounts                                                                               |
| Notifications, summaries and decisions                   | Durable Inbox, daily/close schedules, quiet hours, generic push adapter, decision review/application protocol; database tests                              | Real provider/relay delivery, receipt/tap behavior, cashier unresolved-execution handling and deployed source checks                     |
| Low-stock alerts                                         | Desktop observations, automatic recipient demand, assigned Cloud/Community publication, scoped Inbox and current-stock push validation; restart/race tests | Rollout, network/capacity qualification and remaining account/branch/item lifecycle retention                                            |
| Standard mobile interactions                             | Pull refresh and visible alternatives, interior item swipes, boundary handling, native stack/Back, unsaved-edit protection and RTL tests                   | Physical edge/back/keyboard/sheet behavior, haptics, TalkBack/VoiceOver and reduced-motion review; predictive-back animation is disabled |
| Eighteen languages                                       | Complete draft catalogs, key/placeholder/plural checks, local numeral formatting, RTL and browser layout coverage                                          | Qualified linguistic review, native system dialogs and recipient-language push checks                                                    |
| Installable release                                      | Preview 5 APK and emulator smoke evidence                                                                                                                  | Current-source native builds, iOS compilation, production signing, privacy/store disclosures, pilot and rollback qualification           |

## Connected environment check

A credential-free request to the configured Cloud origin on 29 September 2026
returned HTTP **404** with `Cannot GET /api/business/v1/discovery`:
`https://www.posnic.com/api/business/v1/discovery`.

Therefore the current production origin does not expose the required discovery
route. This observation proves only that this route is unavailable at that origin;
it does not establish the state of private staging environments. No credentials
were submitted and no server configuration was changed.

Connected qualification needs a non-production Cloud tenant and Community HTTPS
origin with the companion revisions deployed, controlled accounts with multiple
ACL/branch profiles, and owner-configured push credentials. Request URLs and account
names in chat; enter passwords through the authorization UI, not release notes.

## Next verification sequence

1. Finish and batch-review remaining source lifecycle/reconciliation work; keep
   deployment flags off until the paired server revisions are qualified.
2. Validate discovery, Cloud tenant handoff and Community sign-in on the supplied
   test origins, followed by live permission/branch/session revocation.
3. Verify actual desktop preparation, summaries, stock alerts and approval outcomes
   against controlled POS operations, including outage and retry recovery.
4. Test real push delivery, quiet hours, language, tap-to-locked-Inbox behavior and
   device/session revocation on Android and iOS.
5. Build current source, inspect merged permissions, and run physical security,
   accessibility, RTL, gesture and lifecycle checks. Obtain language review.
6. Qualify production signing, privacy/store information, pilot monitoring and
   rollback before marking release readiness complete.

The sample walkthrough and synthetic responses are useful development tools. They
must not be substituted for connected or physical-device evidence in this audit.
