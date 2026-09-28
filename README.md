# Posnic Business

An owner and manager companion for Android and iOS. See daily performance, understand useful exceptions, and eventually review important business decisions away from the shop.

**Status: early development foundation, not a production release.** Version 0.1.0 runs a clearly labelled synthetic sample business. Cloud/Community authentication, PIN storage, live reporting, push delivery and financial approvals are not connected. Do not enter production credentials. The existing Mobile POS and Captain apps retain their own selling and service workflows.

## Run locally

Use Node.js 22.13 or newer and npm.

```sh
npm ci
npm start
```

Use `npm run android` or `npm run ios` with the corresponding native development tools. iOS compilation requires macOS/Xcode. For a browser development preview:

```sh
npm run web
```

Choose **Explore sample business**. Under **More**, switch the sample access profile or connection state. This control is a development scenario selector, not a production role-switching feature.

## Implemented foundation

- Shared React Native/Expo application for Android, iOS and web preview, light/dark appearance and safe-area layout.
- Today, Insights, Inbox and More, with capability-based visibility and unavailable states.
- A branch chooser only when more than one branch is accessible; automatic single-branch scope and no data for zero access.
- Typed/versioned overview contract and validation for tenant/scope mismatch, unsafe money values, mixed currencies and invalid freshness claims.
- Integer minor-unit formatting and a bounded synthetic read adapter, without heavy queries or customer data.
- Native pull-to-refresh control, explicit Refresh, accessible record navigation, interior swipe recognition and Android back-button handling. Full native navigation-stack integration is still pending.
- Centralized English messages and an 18-language target registry. The other Business translations are planned, not yet implemented.

Read [implementation status](docs/IMPLEMENTATION_STATUS.md), [roadmap](docs/ROADMAP.md), [initial compatibility audit](docs/FOUNDATION_AUDIT.md), [language scope](docs/LANGUAGES.md), and [interaction rules](docs/INTERACTIONS.md).

## Verify

```sh
npm run check
npm run format:check
npm run build:web
npx playwright install chromium
npm run test:e2e
```

The browser checks run against the static export on loopback. Synthetic reconciliation tests verify the fixture contract, not reconciliation with production POS records. Android/iOS builds and device validation remain separate release gates.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Posnic credits human contributors only. The app source is public under [AGPL-3.0-only](LICENSE); infrastructure credentials and customer data never belong in this repository.
