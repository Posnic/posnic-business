# Mobile interaction contract

- Native scrolling, momentum and top-of-list pull-to-refresh; visible Refresh as an accessible alternative. Retain data on failure, distinguish API checks from source freshness and coalesce duplicate requests.
- Tap an item to open detail. Interior left/right swipes navigate the same permitted ordered list, with Previous/Next and no wrapping. Preserve filters and parent position. System edge gestures, multi-touch and vertical scrolling are not captured.
- Native navigation stack and Back, including iPhone interactive Back and Android predictive Back, are required before release. The current shell handles ordinary Android hardware Back for detail/branch/Community states but does not yet provide a full native stack.
- Active bottom-tab reselection returns to root, then scrolls to top. Retain independent tab state. No horizontal cross-tab gesture.
- Native sheet dismissal/Cancel and keyboard dismissal where applicable, with unsaved-edit protection.
- Informational Inbox swipe read/unread actions and long-press context menus only when those features exist; each needs a visible accessible alternative.
- Native text selection/copy, proper keyboards, focus visibility, bounded pagination/Load more and retry states.
- Native share or pinch-to-zoom only if a permission-controlled shareable record/document viewer is introduced. No heavy report generation or charts added for gesture support.
- Reduced motion, screen-reader and switch/keyboard alternatives, text scaling and RTL. Haptics must respect the device's settings.
- No swipe-to-approve, refund, change stock or delete audit records. Explicit financial confirmation and server verification are mandatory.

Device verification must include edge/vertical/multi-touch conflicts, interrupted refresh, scope changes during requests, offline data retention, first/last records, keyboard/back ordering and assistive technologies. Web tests do not substitute for these checks.
