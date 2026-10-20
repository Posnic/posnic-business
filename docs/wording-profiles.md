# Published shop wording

The translator now accepts an exact English-source mapping from a published
wording bundle. This is a consumer adapter, not a connected feature yet.
There is no new setting, network request, credential storage or profile write.

## Integration contract

1. Clear wording with `translator.beginWordingScope(null)` when signing out,
   locking, losing branch access or displaying a multi-branch aggregate.
2. Before loading a selected branch, call `beginWordingScope(scope)` with a
   scope containing the API origin, tenant, branch and authenticated account.
   Keep the returned generation with the request.
3. Read only the published bundle through a Business-authorized endpoint.
   Do not send the `pb1_` Business credential to the existing POS session API,
   broaden its permissions, or fetch profile drafts.
4. Pass the generation, requested locale and validated `sourceValues` to
   `applySourceWording`. A changed scope or locale invalidates old requests.
   An empty map clears overrides when a profile is unassigned.
5. A future cache must be keyed by the same scope plus locale, validate its
   envelope and clear on logout/access loss. It must contain labels only,
   never credentials. Keep an accepted same-scope bundle during transient
   refresh failures; do not block reporting while fetching labels.

The adapter bounds source maps, rejects malformed data and preserves placeholder
names. It only replaces registered complete source strings before interpolating
business data. Unknown sources are ignored. Plural messages keep their bundled
forms until the server contract supports plural variants. This bridge therefore
does not imply that every Business message has a matching POS registry entry.

`useLocale` subscribes to a version snapshot so a wording update rerenders text
even when the selected language is unchanged, without remounting screens.

## Verification and remaining delivery

TypeScript and 13 focused i18n/wording checks passed locally on 2026-10-20.
Tests cover exact matching, interpolation, plural fallback, stale responses,
branch/logout/locale changes, malformed maps, unassignment and snapshot updates.

Server capability/endpoint and the client read service are now implemented
locally. Account lifecycle wiring, offline persistence and installed-device
rollout remain pending. This adapter alone is not shipped profile support. Profiles remain
authoritative in POS's existing tenant-scoped settings sync lane; this app must
only read them and must not replicate credentials or write profile documents.

The client `readBusinessWording` negotiates `published-wording-v1` with
`discovery?wording=1`, then reads `/api/business/v1/wording` with the dedicated
Business session. It validates schema, branch and locale, uses the existing
bounded JSON transport and rejects unsupported servers without sending a token
to ordinary POS routes. The 256 KB transport limit remains in force; an oversized
bundle is rejected rather than partially applied.

Verification: TypeScript and 15 client i18n/wording/transport tests passed.
The companion POS endpoint passed all 24 Business HTTP integration tests against
disposable MongoDB, including draft exclusion, foreign branch denial, tenant
query rejection, invalid sessions and immediate branch membership revocation.
Neither endpoint nor client is deployed.

### Lifecycle implementation

`useShopWording` now connects the adapter to the selected authorized branch,
account, server and locale. It refreshes on entry, foreground and once per minute
while active, without blocking reports. Aggregate views across multiple branches
use base wording. Generation checks reject late responses. Logout, access loss
and scope changes clear applied wording; transient failures retain accepted
same-scope labels.

The native cache uses a separate SecureStore service with bounded Unicode-safe
chunks; web uses localStorage. The cache contains only labels, scope and expiry,
never credentials. Incomplete writes are rejected and cleanup is serialized.
All 121 checks, TypeScript, attribution and the web export passed locally.
Installed-device and deployment validation remain pending.

### Preview 15 release preparation

PR #34 is merged. The browser lifecycle check now verifies authenticated profile
application, retained labels during an offline refresh, and clearing on branch
unassignment. All 121 checks and web export pass. Android versionCode 15 and
the existing native release workflow are prepared for the next test build;
publishing still requires the matching build, smoke and PIN qualification runs.
An installed release is not yet verified. Servers require the wording endpoint
from POS PR #1459 plus its database-context follow-up #1460.
