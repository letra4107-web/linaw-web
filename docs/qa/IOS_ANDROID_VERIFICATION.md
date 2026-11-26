# iOS and Android verification

Verification run: 2026-11-08 to 2026-11-09 (Asia/Manila). Requested devices: iPhone 12 Pro Max and vivo (model and Android version unspecified). The owner confirmed that microphone practice has not yet been tried on the iPhone.

Scope: web at `131cfdf` and the current working files in `C:/Users/Samantha/OneDrive/Desktop/LinawLm/LinawLm`. The mobile checkout includes uncommitted changes. These results apply to that source, not automatically to an older installed app or TestFlight build.

## Automated results

| Check | Result | What it establishes |
| --- | --- | --- |
| Web frontend tests | 175 passed | Frontend service, validation, upload and presentation regressions |
| Web server tests | 555 passed, 2 staging tests skipped | Local API/service/authorization contracts; skipped tests still need isolated staging |
| Mobile iOS preset | 55 suites, 338 tests passed | Mocked native UI/service behavior with iOS module resolution |
| Mobile Android preset | 55 suites, 338 tests passed | Mocked native UI/service behavior with Android module resolution |
| Mobile TypeScript | Passed | Current application source type-checks |
| Web production build | Passed | TypeScript and Vite production build |
| Mobile lint | 0 errors, 79 warnings | Existing unused variables/imports and hook dependency warnings remain; no automatic fixes applied |
| Mobile backend | All 16 test files passed independently | Authentication/ownership, progress/reward security, pronunciation/scoring, modules, personalization, health and environment checks |
| iOS production export | Passed, including Hermes and assets | JavaScript and assets bundle for iOS |
| Android production export | Passed, including Hermes and assets | JavaScript and assets bundle for Android |
| Bundle inspection | Passed | The same 13 navigation routes and teacher lesson library are present in both exports; Android excludes iOS implementations |
| Native configuration inspection | Passed | iOS microphone, speech, Face ID and photo descriptions; Android internet, microphone and notification declarations |
| Live read checks | 24 passed | Dedicated parent/two-student authentication and authorized reads against the deployed mobile API/shared Supabase |
| Android local native APK | Not completed; final attempt interrupted | Local packaging was interrupted; see the successful EAS production build below |
| Android EAS production APK | Build 33 finished; manifest and signature passed | Signed release APK for `com.linawletra.app`, including ARM64; physical vivo checks remain pending |
| iOS EAS production IPA | Build 6 finished; bundle/provisioning checks passed; submitted to App Store Connect | Apple processing `VALID`; export-compliance response and actual iPhone acceptance remain pending |

The mobile tests cover parent/student navigation, modules and assessment submission retry, word of the day, teacher lessons/PDF opening callbacks, parent messages and notifications, calendar and enrollment forms, settings/profile controls, accessibility fonts, safe areas, enlarged text, audio service state, speech-session handling, and permission states. Mocks do not exercise the operating system's real microphone, speaker, file viewer, biometric prompt, keyboard or notifications.

The live checks cover the parent's profile, two linked children and progress, message/reply table reads, calendar and child module path; each student's profile, module path, published lessons, lesson progress, activities, assigned PDFs and notifications. They do not send messages, upload files, complete lessons, award XP, or edit live records. An initial QA query incorrectly used the parent profile row ID; it was corrected to the Auth user ID used by the application, after which all checks passed.

The available `Pixel_4a` Android emulator was launched headlessly but remained offline to ADB. It was stopped to release memory for the native build. No emulator interaction or actual vivo interaction passed in this run. Local iOS compilation/signing and physical iPhone interaction were unavailable on Windows; the EAS cloud build is recorded below.

The Android native build exposed a stale generated resource: both `assets_logo.jpg` and `assets_logo.png` existed under `android/app/build/generated/res/createBundleReleaseJsAndAssets/drawable-mdpi`, causing `mergeReleaseResources` to fail. All three hashes (the two generated files and the single source `assets/Logo.jpg`) matched. The obsolete generated PNG was backed up under the web checkout's ignored `.qa/` directory and removed; the source image and its imports were preserved. This is local build-output cleanup, not an image replacement.

The native Android test targets `x86_64`, not a vivo production binary. PNG crunch optimization was disabled for the final packaging attempt after prolonged local resource processing. That attempt reuses the current Hermes bundle generated successfully immediately beforehand (`-x :app:createBundleReleaseJsAndAssets`); it was interrupted before a successful APK result. It does not establish a fresh clean-room build or an ARM64 device result. No Android release was distributed.

See also [teacher upload verification](TEACHER_LESSONS_IOS.md) for the previously verified published PDF metadata, existing test lesson visibility and PDF HTTP availability.

## Repeatable checks

From the web checkout:

```powershell
npm.cmd test
npm.cmd run build
```

From the mobile checkout, run each Jest command separately. Restricting roots to `src` avoids scanning the archived Expo project under `tmp-export`, which otherwise causes a duplicate-package warning and unnecessary crawling.

```powershell
npm.cmd run typecheck
node node_modules/jest/bin/jest.js --preset=jest-expo/ios --roots=src --runInBand --no-cache --silent --testTimeout=15000
node node_modules/jest/bin/jest.js --preset=jest-expo/android --roots=src --runInBand --no-cache --silent --testTimeout=15000
node node_modules/expo/bin/cli export --platform ios --platform android --source-maps --max-workers 2 --output-dir <local-output-directory>
```

The existing mobile backend `npm test` entry point only loads four test files. This verification ran all 16 `backend/tests/*.test.js` / `pronunciation_tests.js` files in separate Node processes, preserving their exit codes and avoiding shared mock state.

Local evidence is stored under ignored `.qa/cross-platform-*` paths in the web checkout. The Expo configuration evidence contains environment values and must stay private; the report contains no credentials or learner records.

## Railway voice deployment: 2026-11-09

Production service `app-backend` in project `just-happiness` successfully redeployed with `ELEVENLABS_VOICE_ID` matching the web backend's configured voice. The production API key matched the locally verified key and was preserved. This configuration deployment reuses the existing production backend source; mobile UI and validation changes still require new mobile builds.

Deployment: [4950c7d3-6750-442a-a91b-653ea2bdcc8e](https://railway.com/project/fa93c7e7-25c1-45cb-acb8-020d4f876673/service/3e5db457-9bfe-46be-a25f-3e97794ae047?id=4950c7d3-6750-442a-a91b-653ea2bdcc8e&environmentId=7dabc3d6-8141-43ea-9711-6f9ab70cc635). Railway reported `SUCCESS`.

Live verification passed: health HTTP 200; authenticated `/api/tts/speak` generated downloadable MP3 audio for `isda`; `/api/tts/speak-syllables` generated downloadable audio and two ordered syllable timestamps. Both returned storage paths matched the SHA-256 cache key computed from the expected web voice ID. All 24 dedicated parent/student read checks passed again after deployment. Evidence: ignored `.qa/mobile-voice-live-result.json`, `.qa/railway-mobile-voice-result.json`, and `.qa/cross-platform-live-readonly.json`. Physical iPhone/vivo playback is still pending.

## Android production APK: 2026-11-09

The requested `eas build --platform android --profile production` completed successfully as [build 33](https://expo.dev/accounts/linawletra/projects/LinawLm/builds/3ed8e6bd-ca17-49df-9517-2ea9e99bb774). The APK uses the current mobile working files, EAS production environment, existing remote Android keystore, and newly generated native Android project. Its production API points to the Railway mobile backend. This build includes the mobile validation and lesson-library source changes.

[Download the APK](https://expo.dev/artifacts/eas/eXQv6vaMnlwFMIA6rvwWUFLM1Qbc2ovv8g_va8AiKYU.apk). Version `1.0.0`, version code `33`, package `com.linawletra.app`. Downloaded size: 211,884,065 bytes. SHA-256: `0a2258f802afe9f8b0510a80e7d870b6461b9652ff4096720d03cf50671d0fde`.

Local artifact inspection passed: Android release manifest, version/package identity, ARM64/ARMv7/x86/x86_64 libraries, internet/microphone permissions, and `apksigner verify`. Evidence and local APK are in ignored `.qa/releases/`; build metadata is in `.qa/android-production-build-33.json`.

The build's Expo Doctor step reported two non-blocking checks: `assets/Logo.jpg` contains PNG data despite its extension, and six Expo packages have newer recommended patch versions. Native prebuild and Gradle release compilation completed successfully. Physical vivo installation/playback and a new iOS build remain pending.

## iOS Get Started and logo cleanup: 2026-11-09

Renamed the mobile asset from `assets/Logo.jpg` to `assets/Logo.png` to match its PNG content, preserving the exact image bytes. Updated the app icon, adaptive icon, splash, favicon, and all 12 runtime component/screen references. The remaining Expo package patch-version recommendations are separate from this filename correction.

Get Started already uses the same shared route and screen on iOS and Android: without a restored authenticated session, the first unfinished device-level welcome opens Get Started, followed by optional permissions and Login. Existing authenticated sessions continue to their dashboard, and later completed launches open Login. The iPhone layout gives the welcome screen ownership of top/bottom safe-area spacing. Added iOS notification regression checks for requesting authorization without an Android channel and recognizing provisional authorization without prompting again.

TypeScript passed. All 37 focused iOS tests passed across six suites covering launch routing, welcome completion/retry, optional permissions, Reduce Motion, and iPhone layout. The corresponding Android run passed all 24 tests in the five onboarding suites; one layout test exceeded its 15-second timeout while the iOS export ran concurrently. An isolated rerun of the layout suite passed all 13 tests in 11.8 seconds without source/test changes. A production iOS Hermes export passed with 1,885 modules and 125 assets. Source-map inspection confirmed the registered Get Started route, shared welcome/permission modules, and iOS-specific layout selection; the export includes `assets/Logo.png`.

Evidence: ignored `.qa/ios-get-started-fix/`, `.qa/ios-get-started-ios.log`, `.qa/ios-get-started-android.log`, `.qa/ios-get-started-tests.json`, and `.qa/ios-get-started-export-result.json`. These are source/export checks. The production IPA below includes this source; TestFlight delivery and actual iPhone testing remain pending.

## iOS production IPA: 2026-11-09

The requested production iOS build completed successfully as [build 6](https://expo.dev/accounts/linawletra/projects/LinawLm/builds/f675d5cd-2da1-4e2b-b0ff-c129e5f618ab), using the current mobile working files, EAS production environment, and existing remote distribution certificate/provisioning profile. It includes Get Started, the Tagalog validation changes, teacher lesson library, and `Logo.png` cleanup. Production audio uses the previously verified Railway configuration.

[Download IPA](https://expo.dev/artifacts/eas/FAOzxrLzLuDQh4uGlunIHz53gHBKGuoNt5TD3w7WYyk.ipa). Version `1.0.0`, build `6`, bundle identifier `com.linawletra.app`, physical-device platform `iphoneos`, distribution `STORE`. Downloaded size: 118,753,298 bytes. SHA-256: `7421a1535cb08307191651c34b5b080ff126b9bc68f033f4df0417767aa504c3`.

Downloaded-archive checks passed: expected bundle/version, App Store provisioning without debug access, production push entitlement, and microphone/speech/photo/Face ID usage descriptions. The embedded signature resource is present. Windows inspection reads bundle and provisioning metadata; it does not perform Apple's cryptographic `codesign` verification. Private local artifact/inspection evidence is under ignored `.qa/releases/`, with EAS status in `.qa/ios-production-build-6.json`.

The cloud build's Expo Doctor check passed 17 of 18 checks; the remaining check recommends Expo dependency patch updates. The earlier logo format check is resolved. EAS also warned that the export-encryption declaration is unspecified: the owner must complete the appropriate App Store Connect response before TestFlight testing. No encryption declaration, tester invitation, public release, or physical iPhone pass was performed.

## Build 6 TestFlight upload: 2026-11-09

At the owner's request, uploaded the verified build 6 to App Store Connect using `eas submit --platform ios --profile production --id f675d5cd-2da1-4e2b-b0ff-c129e5f618ab --non-interactive` and the configured Apple API key. EAS exited successfully and confirmed delivery. [Submission record](https://expo.dev/accounts/linawletra/projects/LinawLm/submissions/d655ae9e-01f3-409f-b7cc-4cefc2879b73).

A subsequent authenticated read-only Apple API check confirmed build `6` is listed alongside `5`, `4`, and `2`, with `processingState: VALID`. Its Apple build ID is `b31525e7-ae32-4610-aa43-3b8c5af81f7a`. Both `internalBuildState` and `externalBuildState` are `MISSING_EXPORT_COMPLIANCE`; the account owner must provide the appropriate encryption-compliance response through **Manage** in [TestFlight](https://appstoreconnect.apple.com/apps/6806293835/testflight/ios). Compliance declarations and tester settings were preserved. Evidence: ignored `.qa/ios-submission-build-6.json` and `.qa/apple-build-6-status.json`.

## iPhone Filipino cloud recognition: 2026-11-09

The owner reported the installed iPhone could not use Filipino/Tagalog through Apple's native recognizer and approved ElevenLabs for **Bigkasin**, in addition to the existing **Pakinggan** voice. The iOS recognition adapter now records mono AAC/M4A using the existing `expo-audio` dependency and sends the actual recording through an authenticated backend endpoint to ElevenLabs `scribe_v2` with language `fil`. Android continues using its existing recognition adapter. No expected answer or keyterms are sent to the transcriber, and the transcription endpoint does not create learning attempts or award XP.

The adapter stops playback before recording, ends after detected speech followed by silence or a 12-second maximum, restores playback afterward, removes temporary audio, and cancels on navigation/backgrounding. Permission, silent input, service/network failure and cancellation return simple Tagalog messages. The backend verifies the stored student identity, limits request rate and validates recording type/size. The API key stays on the server.

TypeScript passed. Seven new backend tests passed; all 39 focused mobile tests across six suites passed under both iOS and Android presets. These cover recorder lifecycle, denial, silence, actual transcript forwarding, pending-start cancellation, late responses, native stop failures, existing learning submission logic and audio service behavior.

Railway deployment [67b394d2-c697-4c74-b4f4-14295f24a030](https://railway.com/project/fa93c7e7-25c1-45cb-acb8-020d4f876673/service/3e5db457-9bfe-46be-a25f-3e97794ae047?id=67b394d2-c697-4c74-b4f4-14295f24a030) reported `SUCCESS`. The deployment artifact was a read-only archive of production source commit `bd54b5c0bed669e91c2defb0de27f04bfc70fdf0`, with only the new backend service/router/tests and route mount overlaid, plus a minimal root Node package manifest for Nixpacks detection. Mobile native source and local credentials were excluded. An earlier packaging attempt failed Node detection; a subsequent attempt failed Railway's repository snapshot before a build; the final retry succeeded. These local backend changes still need to be committed before a future Git-based redeployment can retain them.

Live checks passed: anonymous requests return 401, the dedicated parent account returns 403, invalid student audio returns 400, and a synthetic **Walo** recording converted to genuine mono AAC/M4A returns HTTP 200 with transcript **Walo**. No live learning attempts or progress were written. All 24 parent/student read checks and three health/read-aloud/syllable audio checks passed after deployment. The existing TTS voice still matches the web configuration.

Recognition accuracy is not guaranteed: a separate synthetic sentence ended in **librong** instead of **libro**, and an earlier isolated **isda** recording was transcribed as **I-stop**. These are actual provider outputs, not corrected to the expected answer. Physical iPhone microphone capture and child pronunciation accuracy still require device testing. The installed build 6 does not include this new recorder; a new IPA is required.

Evidence: ignored `.qa/cloud-speech-tests.json`, `.qa/cloud-speech-audio-result.json`, `.qa/cloud-speech-live-result.json`, `.qa/mobile-cloud-speech-deploy/` and `.qa/cloud-speech-deploy-source.json`.

Production iOS [build 7](https://expo.dev/accounts/linawletra/projects/LinawLm/builds/46d63a41-f5cc-48d6-a94f-4af0e64bc7d3) completed successfully. [Download IPA](https://expo.dev/artifacts/eas/dr6EmYRh1lJYj6M7IA2nRc8kmO8Fv9IquNFgRK1fdnY.ipa). Version `1.0.0`, bundle `com.linawletra.app`, physical platform `iphoneos`, App Store distribution. Size 118,759,670 bytes; SHA-256 `ad77d91e35cef2cb699462bf8b7919e453cfb188271c5f083cc2f79ce9032224`. Bundle/version, provisioning, production push entitlement, disabled debugging and usage-description checks passed. The extracted application bundle contains the cloud speech endpoint and audio recorder, with the previous iPhone Filipino-unsupported guard absent. This confirms packaging; it does not prove physical microphone behavior. Windows inspection does not perform Apple's cryptographic `codesign` verification. Evidence: ignored `.qa/ios-production-build-7.json`, `.qa/releases/LinawLetra-iOS-production-7.json` and `.qa/releases/ios-7-bundle-check.json`.

EAS confirmed successful upload of build 7 to App Store Connect: [submission 9916abe3-4697-40fe-9f31-4ea260c93e95](https://expo.dev/accounts/linawletra/projects/LinawLm/submissions/9916abe3-4697-40fe-9f31-4ea260c93e95). A subsequent read-only `GET /v1/apps/6806293835/buildUploads` confirmed upload `4da28fb0-d8d5-4ee0-83fc-d6e4651ea535`, version `1.0.0`, build `7`, state `PROCESSING`, with empty errors/warnings/information arrays. It was uploaded at `2026-11-08T18:53:57Z`. The processed-build list does not yet contain build 7; TestFlight availability and any compliance requirement remain pending Apple processing. No export-compliance declaration or tester-setting changes were made. Evidence: ignored `.qa/ios-submission-build-7.json`, `.qa/apple-build-7-status.json` and `.qa/apple-upload-7-status.json`.

Device acceptance for the new IPA:

1. Update through TestFlight, confirm build 7, open Home practice and choose **walo**.
2. Tap **Makinig**, then **Bigkasin**, allow the microphone, say **walo**, and wait for the recording/transcription to finish. Confirm the native Filipino-unsupported warning no longer appears.
3. Repeat with a different word, an intentionally wrong word and silence. Confirm the app uses the actual transcript and does not mark a missing/failed recording correct. Confirm **Makinig** works afterward, including silent mode.
4. Deny the microphone and disable the internet separately; confirm a readable Tagalog message and a successful retry after restoring access.
5. Leave the practice or background the app during recording; confirm recording stops and no stale answer appears after returning. Repeat the recognition checks in **Salita ng Araw**.

## Required installed-device checks

Physical acceptance checks remain pending on the requested iPhone and vivo. Android APK 33 and iOS IPA 7 are available. Build 7 includes the cloud recognition fix and supersedes build 6 for iPhone testing; its TestFlight delivery status is recorded with the cloud recognition release above.

| Flow | Required verification on both devices |
| --- | --- |
| Installation and authentication | Install the new build; cold start, login/logout, saved-profile switching, expired-session refresh, Google callback/cancel, email verification and password recovery |
| Student and parent navigation | Open every tab, notification destination, profile/settings screen and modal; check hardware/software Back and background/foreground resume |
| Teacher uploads | Upload/publish a PDF on web for the student's grade; refresh **Aralin → Galing sa Guro** on each device; open the correct file, then confirm unpublish/delete removes it |
| Audio and microphone | Grant and deny microphone/speech permission; test actual Filipino speech, listening after recording, interruptions, headphones and iPhone silent mode |
| Learning persistence | Complete a real practice/module/assessment/word-of-day attempt; restart and compare authoritative progress/XP with the parent and teacher views; retry after a network interruption |
| Parent actions | Enroll a disposable child, schedule/edit an activity, send a test reply/attachment and verify receipt, notification/read state and profile/photo persistence |
| Layout and accessibility | Check keyboard-visible forms, safe areas, enlarged text, OpenDyslexic, high contrast and touch targets on the actual screens |

Known functional limits:

- Build 6 uses Apple's native Filipino/Tagalog locale support check and failed on the owner's iPhone. The cloud recognition change above replaces that dependency in the next IPA; physical-device capture and recognition quality remain unverified.
- The guided PDF reader currently presents a read/listen preview with no new submission or XP. The app explains this in the preview. Opening a published lesson PDF is separate from submitting an assessed reading activity.
- Web deployment does not update installed mobile binaries. New iOS/TestFlight and Android builds must include the mobile changes before device acceptance testing.

These checks provide automated and API compatibility evidence. They do not clear all authenticated/device workflows in [blocked test requirements](BLOCKED_TEST_REQUIREMENTS.md).
