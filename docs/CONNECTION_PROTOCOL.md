# Business connection protocol — client draft

This is the evolving client/server contract. Tenant-side authorization is implemented in the companion POS change, but no server deployment or central Cloud account-directory integration is included yet. Existing Mobile POS authorization and till enrollment are not compatible.

## Compatibility check

Both welcome-screen options perform one credential-free HTTPS GET to `{origin}/api/business/v1/discovery`. Cloud uses `https://www.posnic.com`; Community uses the entered HTTPS origin, including an explicit port if supplied. Origin paths, embedded credentials, query strings and fragments are rejected. Browser preview requires the server to allow its origin through CORS; a CORS/network failure cannot be reliably distinguished and is shown as an unreachable server.

The proposed successful JSON response is:

```json
{
  "product": "posnic-business",
  "apiVersion": 1,
  "issuer": "https://shop.example.com",
  "authorization": "business-pkce-v1",
  "audience": "posnic-business",
  "reporting": "bounded-summary-v1"
}
```

The issuer must exactly match the normalized origin the user selected. The reporting field also accepts `unavailable`, allowing sign-in before prepared summaries are enabled. Version 1 accepts only these fields. Unknown protocols, versions and fields are unsupported, so protocol extensions require an explicit client compatibility change. Discovery cannot supply alternate token URLs. A successful check means protocol compatibility only: it does not authenticate an account, certify the server's honesty, or verify report freshness. The UI offers browser sign-in after compatible discovery.

Requests use a ten-second timeout with cancellation, no cookies, no HTTP cache and no retry loop. Changing the address or leaving the connection screen cancels the request and prevents its result from replacing the new screen's state. Errors expose safe local messages, never server HTML or raw error bodies.

## Read transport foundation

The reporting client loads current context after native PIN unlock; live overview reads are not yet wired to the app UI. It requires an explicitly supplied fetch transport and a proposed opaque Business token matching `pb1_` plus 43 base64url characters. The format check rejects existing POS JWTs; it is not authentication. Only the server can validate and authorize a token.

| Request                                                              | Client validation                                                                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/business/v1/context`                                       | Explicit business/account identity, capabilities, unique permitted branches and currency metadata                                              |
| `GET /api/business/v1/overview?businessDate=YYYY-MM-DD&branchId=...` | Calendar date, overview capability, nonempty unique authorized branch set, exact response business/date/scope, currency and freshness contract |

The overview interface only supports one business date and at most 100 permitted branches; it cannot request arbitrary long reports. The backend must use prepared summaries with bounded work. Response validation is defense in depth, not server authorization. A UI adapter must clear private state on `signInRequired` or `accessChanged`, refresh context before accepting changed access, and never relabel a cached result as current.

Both transports request redirect rejection and reject redirected or wrong-URL responses. The app supplies Expo fetch; its installed Android and iOS source explicitly disables redirect following and omits cookies for these options. Native implementations must prove that credentials are not sent through redirects before the reporting client is wired to a real token. A response check after redirect is not sufficient to prevent disclosure. The client consumes a response stream with a 256,000-byte limit and cancels the reader on overflow; native transport behavior remains a device qualification requirement.

## Server/authentication work still required

1. Implement a Business-specific browser consent and PKCE exchange for Cloud and Community, with the password remaining in the browser. Cloud must resolve the selected business without issuing a till or sync-agent grant.
2. Issue only opaque Business sessions, store token hashes, and reject them in POS selling routes. Recheck account status, auth version, tenant, branch access and capabilities on every Business request. Define session expiry, rotation, revocation and device management.
3. Make consent and exchange durable and one-use, with origin/CSRF protection, expiration, rate limits and replay tests. Protocol names above reserve client contracts; the server must not advertise them before implementation passes these checks.
4. Qualify Android/iOS TLS and redirect handling, secure token storage, PIN attempt limits and biometric/device-lock behavior. Never persist an account password.
5. Reconcile prepared metrics with authoritative POS fixtures, establish source checkpoints, then connect the live screens. No totals are substituted from the legacy dashboard in this milestone.

Tests use synthetic responses and do not establish that a deployed server supports this draft.

## Local unlock

The native vault stores only issuer/token/expiry in an AES-GCM envelope, protected with a six-digit PIN using scrypt (N=32768, r=8, p=1), a random salt and a separate device installation secret. Both the envelope and installation secret use SecureStore with device-only, unlocked accessibility. Five unsuccessful attempts require browser sign-in again. Attempts are reserved before derivation and survive restart; operations serialize and background lock invalidates pending unlocks. Browser preview never persists credentials. Biometric unlock and native device security tests remain pending.

The native storage API is documented in [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). The patched build dependency is documented in [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
