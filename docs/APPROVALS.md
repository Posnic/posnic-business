# Business approval review

Authenticated accounts with `approvals.read` can open Approvals from More or Inbox. The list follows branch access and hides the branch chooser for a single branch. Open/history views use bounded cursor pages. Detail shows the discount, exact bill amounts, rounding, requester, reason, expiry and decision timeline. The client rejects foreign branches, inconsistent totals and contradictory states.

Approve/decline require an explicit second confirmation; decline requires a reason. Server-provided access/discount restrictions and local expiry disable decisions. Fresh password verification occurs on the original Cloud or Community browser origin. A temporary same-account Business session confirms the action without replacing the phone's PIN-protected primary session. The temporary token is kept in memory and revoked after use, cancellation or screen disposal; the server caps it at ten minutes.

Opening the browser still locks the native app. Only a short-lived, account/tenant-scoped PKCE request is retained in memory. Unlocking the phone reopens the review page and checks that request. No queued decision, account password, report data or confirmation token is persisted. The user must choose and confirm again after a browser round trip that locked the app. Process termination discards the request and requires a new confirmation.

Each decision has an idempotency key and observed revision. A lost response displays an uncertain state and offers a status refresh or retry of the identical command. It does not imply failure or success. An authoritative read resolves the state. Approved and applying states explicitly differ from applied-at-till; only the server's verified receipt state shows applied.

Validation: strict client contract/confirmation tests, a browser flow covering fresh confirmation and a lost accepted response, and server-side Mongo integration tests for live ACL, expiry, self-approval, limits, session revocation and retries. Browser fixtures do not qualify native device behavior. Android/iOS background/browser/PIN return, accessibility and signing builds still need physical-device validation.

Rollout: server decision capability is off unless `POSNIC_BUSINESS_DECISIONS=1`. Complete the authenticated cashier/controller, device transport, durable request outbox, recovery, safe notifications and deployment before enabling it. Item-level bill context, further discount/currency combinations and production audit retention remain release work. This feature is not yet enabled for live sales.
