# Business connection protocol — client draft

This is the contract implemented by the client foundation, not an available server API. No server deployment or authentication grant is included in this change. Existing Mobile POS authorization and till enrollment are not compatible.

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

The issuer must exactly match the normalized origin the user selected. Version 1 accepts only these fields. Unknown protocols, versions and fields are unsupported, so protocol extensions require an explicit client compatibility change. Discovery cannot supply alternate token URLs. A successful check means protocol compatibility only: it does not authenticate an account, certify the server's honesty, or verify report freshness. The UI says account sign-in remains under development.

Requests use a ten-second timeout with cancellation, no cookies, no HTTP cache and no retry loop. Changing the address or leaving the connection screen cancels the request and prevents its result from replacing the new screen's state. Errors expose safe local messages, never server HTML or raw error bodies.

## Read transport foundation

The separately exported reporting client is not connected to the app UI. It requires an explicitly supplied fetch transport and a proposed opaque Business token matching `pb1_` plus 43 base64url characters. The format check rejects existing POS JWTs; it is not authentication. Only the server can validate and authorize a token.

| Request                                                              | Client validation                                                                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/business/v1/context`                                       | Explicit business/account identity, capabilities, unique permitted branches and currency metadata                                              |
| `GET /api/business/v1/overview?businessDate=YYYY-MM-DD&branchId=...` | Calendar date, overview capability, nonempty unique authorized branch set, exact response business/date/scope, currency and freshness contract |

The overview interface only supports one business date and at most 100 permitted branches; it cannot request arbitrary long reports. The backend must use prepared summaries with bounded work. Response validation is defense in depth, not server authorization. A UI adapter must clear private state on `signInRequired` or `accessChanged`, refresh context before accepting changed access, and never relabel a cached result as current.

Both transports request redirect rejection and reject redirected or wrong-URL responses. Native implementations must prove that credentials are not sent through redirects before the reporting client is wired to a real token. A response check after redirect is not sufficient to prevent disclosure. The 256,000-character JSON check is a parsing guard after download, not a streaming memory limit; native transport response limits remain a release requirement.

## Server/authentication work still required

1. Implement a Business-specific browser consent and PKCE exchange for Cloud and Community, with the password remaining in the browser. Cloud must resolve the selected business without issuing a till or sync-agent grant.
2. Issue only opaque Business sessions, store token hashes, and reject them in POS selling routes. Recheck account status, auth version, tenant, branch access and capabilities on every Business request. Define session expiry, rotation, revocation and device management.
3. Make consent and exchange durable and one-use, with origin/CSRF protection, expiration, rate limits and replay tests. Protocol names above reserve client contracts; the server must not advertise them before implementation passes these checks.
4. Qualify Android/iOS TLS and redirect handling, secure token storage, PIN attempt limits and biometric/device-lock behavior. Never persist an account password.
5. Reconcile prepared metrics with authoritative POS fixtures, establish source checkpoints, then connect the live screens. No totals are substituted from the legacy dashboard in this milestone.

Tests use synthetic responses and do not establish that a deployed server supports this draft.
