# Native validation

Run checks locally and batch changes before pushing. Do not add paid/hosted build jobs or broaden Actions triggers without an explicit request.

## Android

Install Node 22+, Java 21 and an Android SDK accessible to your account. Set `ANDROID_HOME` to that SDK. Then:

```sh
npm ci
npx expo prebuild --no-install --platform android
cd android
./gradlew assembleDebug --no-daemon
```

On Windows use `gradlew.bat assembleDebug --no-daemon`. The APK is under `android/app/build/outputs/apk/debug/`. Generated native folders are ignored by Git. The current workstation's configured SDK belongs to another Windows account and is inaccessible; Android prebuild and JavaScript export work, but local native compilation needs an accessible SDK.

## iOS simulator

On macOS with Xcode and CocoaPods:

```sh
npm ci
npx expo prebuild --no-install --platform ios
cd ios
pod install
xcodebuild -workspace PosnicBusiness.xcworkspace -scheme PosnicBusiness -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

The simulator bundle is under `ios/build/Build/Products/Debug-iphonesimulator/`. Real-device distribution needs the owner's signing account and provisioning. No store release is implied by an unsigned simulator build.

## Device gates

- Cloud and Community test accounts; expired/denied consent, no network, timeout, host substitution and HTTPS redirect refusal.
- PIN enrollment, process restart, five-attempt exhaustion, backgrounding during derivation, sign-out and local storage failure.
- Strong Face ID/fingerprint opt-in, cancellation, changed enrollment, device passcode removal, PIN fallback and backgrounding during the OS prompt. Test physical devices: simulators do not prove keychain biometric enforcement.
- Privacy cover in app switching, foreground lock, server-revoked credentials, removed branch/ACL and account changes.
- VoiceOver/TalkBack, large text, reduced motion, one-handed navigation, low-memory devices, dark mode and Arabic RTL.
- Signed Android/iOS builds, privacy disclosures, pilot reconciliation and rollback before production publication.

Prior build evidence: GitHub run 36376341281 compiled the earlier authorization commit successfully for Android debug and iOS simulator. It predates subsequent Cloud/biometric work and is not final release evidence.

Native navigation/privacy qualification: check app-switcher snapshots while a branch modal, schedule discard dialog, keyboard and biometric prompt are visible. iOS adds an opaque native cover directly to the application window on resign-active/background, above native modal content, in addition to account background locking. It removes the cover on becoming active. Native modal coverage and rapid app switching must still be verified on device. Android 13+ disables Recents screenshots at the Activity level while preserving ordinary user screenshots. Earlier Android versions rely on the existing privacy cover and lock and require separate snapshot testing. These protections are implemented, not device-qualified.
