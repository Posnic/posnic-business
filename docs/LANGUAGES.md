# Initial public release language target

18 languages: English, Tamil, Hindi, Malayalam, Kannada, Telugu, Sinhala, Nepali, Arabic, French, Spanish, Portuguese, Indonesian, Thai, German, Swahili, Dutch and Italian.

The working localization branch includes all 18 catalogs, each covering the 244 current messages with exact-key and interpolation validation. All are selectable in the development build. These development packs still need qualified language review; this milestone is not the initial multilingual public app release.

Language selection is available before sign-in, in the sample's More tab and on a dedicated Language page in the connected account. Preferences are stored separately from authentication. Changing language updates mounted screens without restarting a session or submitting a pending action. Number and date formatting follows the selected language, while currency precision and business-day timezones remain server properties. The engine isolates interpolated values for RTL and navigation/interior gestures accept the selected direction. Arabic is visually checked in light/dark browser previews, with 320px overflow and simulated touch checks. Native RTL verification remains outstanding.

Every bundled catalog now runs a 320px browser flow through onboarding and all sample tabs, including a 200% text-size approximation. Shared buttons and sample tabs wrap rather than overlap. The connected account uses measured tab-label height so long labels can wrap without a fixed one-line limit. A Tamil account fixture verifies wrapping, increased bar height for enlarged text, and switching language without another authorization request or browser token persistence. These preview checks do not replace native Dynamic Type, TalkBack or VoiceOver testing.

Requirements: selection before sign-in and in More, remembered preference, bundled offline packs, Arabic RTL, plural rules, local numbers/dates and notifications in the recipient's language. Currency and business-day timezone remain shop properties. Merchant-entered names/free-text reasons are not automatically translated.

Reuse approved Posnic vocabulary and track Business-specific additions. All supported keys need real translations, not English fillers. Authentication, PIN recovery, approval/decline wording, expiry, amounts, freshness and notification schedules need qualified language review. Test large text, long labels, RTL gestures, currency precision and screen-reader labels before production readiness.

The initial Portuguese pack uses European Portuguese and the explicit pt-PT number/date locale. Brazilian Portuguese is not a separate qualified pack in this release target.

Runtime locale coverage: some engines omit Nepali and Sinhala locale data. Bundled FormatJS number, date and plural-rule data now fills missing release-language coverage without a network request. Initialization preserves the detected device language and timezone; returning to the foreground refreshes the OS timezone. Browser checks cover all 18 target locale identifiers, Nepali digits, zero/three-decimal currencies, local time, canonical branch dates and reload persistence. Native-device runtime qualification remains required. See the [FormatJS date/time documentation](https://formatjs.github.io/docs/polyfills/intl-datetimeformat/) for the bundled timezone data and calendar limitations.

Bundle cost: the current Hermes exports are approximately 12 MB per platform, compared with approximately 3.2 MB before the additional locale data. Measure startup time and memory on the target low-end devices and evaluate selective data loading before release; web checks alone do not establish the performance budget.

Thai display dates explicitly select the Buddhist calendar, with its arithmetic and Thai patterns bundled for the fallback formatter. The browser test reads the app’s actual locale definition and verifies year 2569 for an instant in 2026 while the canonical branch date remains 2026-09-29. Server date identifiers and business-day calculations remain Gregorian.
