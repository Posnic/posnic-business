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

Server capability/endpoint, account lifecycle wiring, authenticated branch
authorization tests, offline persistence and installed-device rollout remain
pending. This adapter alone is not shipped profile support. Profiles remain
authoritative in POS's existing tenant-scoped settings sync lane; this app must
only read them and must not replicate credentials or write profile documents.
