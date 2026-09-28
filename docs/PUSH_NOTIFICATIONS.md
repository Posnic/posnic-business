# Phone notifications

The native app supports optional Expo push registration. The web preview does not
register a phone. Permission is requested only after the user taps Enable phone
notifications; denial leaves the Inbox usable. Registration is bound to the
current Business session and refreshed after unlocking or provider-token changes.
Revoked sessions, expired credentials and removed branch/financial access stop
server delivery. The app never stores an account password for background work.

Alerts contain a generic update message and an opaque Inbox entry ID. They carry
no sales figures, account credentials, URLs or approval commands. Tapping an alert
opens the authenticated Inbox after any required unlock; it cannot approve an
action. An iOS permission prompt uses the privacy cover, while actual background
transitions still cancel registration and lock the account.

## Deployment requirements

Build with `POSNIC_BUSINESS_EXPO_PROJECT_ID` set to the owner's EAS project UUID.
For Android, set `POSNIC_BUSINESS_GOOGLE_SERVICES_FILE` to the appropriate
`google-services.json` outside source control. Configure the project's FCM/APNs
credentials and enable Expo enhanced push security. Credentials belong to the
owner's deployment secret store; never put an Expo access token in the app.

The server uses `POSNIC_BUSINESS_PUSH_ENABLED=1`, the same
`POSNIC_BUSINESS_EXPO_PROJECT_ID` and a secret
`POSNIC_BUSINESS_EXPO_ACCESS_TOKEN`. Missing configuration leaves the durable
Inbox available and reports phone delivery unavailable. This adapter is for a
deployment that owns that Expo project. Do not distribute Posnic's project access
token to Community operators. Official-app Community delivery still needs a
scoped relay; a separately built Community app can use its own project.

Server delivery uses durable per-event/device records, bounded retries and
provider receipts. Stable collapse/tag identities reduce duplicate visible
alerts after ambiguous network failures; delivery is not exactly-once. Acceptance
by Expo or APNs/FCM is not proof that a user read the alert. Invalid registrations
are removed only when their registration generation still matches the failed
delivery. Financial details remain available through the authenticated Inbox.

## Verification still required

Local tests use a fake provider; no real notification has been sent. Native
JavaScript exports pass, but physical Android/iPhone permission, cold-start tap,
token rotation, background lock, focus/quiet modes and real provider-receipt
validation remain release gates. Signing accounts, project credentials and a
physical device have not been supplied in this workspace.

References: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/),
[delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/),
[native notification API](https://docs.expo.dev/versions/latest/sdk/notifications/).
