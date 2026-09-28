# Initial public release language target

18 languages: English, Tamil, Hindi, Malayalam, Kannada, Telugu, Sinhala, Nepali, Arabic, French, Spanish, Portuguese, Indonesian, Thai, German, Swahili, Dutch and Italian.

The working localization branch includes complete English, French, Arabic, Tamil, Hindi, Spanish, Portuguese, Indonesian, German, Italian and Dutch catalogs for the current screens. Other languages remain planned and cannot be selected until their packs pass exact-key and interpolation checks. These development packs still need qualified language review; this milestone is not the initial multilingual public app release.

Language selection is available before sign-in, in the sample's More tab and on a dedicated Language page in the connected account. Preferences are stored separately from authentication. Changing language updates mounted screens without restarting a session or submitting a pending action. Number and date formatting follows the selected language, while currency precision and business-day timezones remain server properties. The engine isolates interpolated values for RTL and navigation/interior gestures accept the selected direction. Arabic is visually checked in light/dark browser previews, with 320px overflow and simulated touch checks. Native RTL verification remains outstanding.

Every bundled catalog now runs a 320px browser flow through onboarding and all sample tabs, including a 200% text-size approximation. Shared buttons and sample tabs wrap rather than overlap. The connected account uses measured tab-label height so long labels can wrap without a fixed one-line limit. A Tamil account fixture verifies wrapping, increased bar height for enlarged text, and switching language without another authorization request or browser token persistence. These preview checks do not replace native Dynamic Type, TalkBack or VoiceOver testing.

Requirements: selection before sign-in and in More, remembered preference, bundled offline packs, Arabic RTL, plural rules, local numbers/dates and notifications in the recipient's language. Currency and business-day timezone remain shop properties. Merchant-entered names/free-text reasons are not automatically translated.

Reuse approved Posnic vocabulary and track Business-specific additions. All supported keys need real translations, not English fillers. Authentication, PIN recovery, approval/decline wording, expiry, amounts, freshness and notification schedules need qualified language review. Test large text, long labels, RTL gestures, currency precision and screen-reader labels before production readiness.

The initial Portuguese pack uses European Portuguese and the explicit pt-PT number/date locale. Brazilian Portuguese is not a separate qualified pack in this release target.
