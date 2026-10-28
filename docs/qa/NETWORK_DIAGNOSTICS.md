# Local browser asset denials

The failed Edge/Chromium browser assertions are retained as failures. No firewall, endpoint protection, RLS, browser security flag or operating-system network policy was disabled to force success.

An independent local fixture serves one HTML page, one stylesheet and twenty tiny JavaScript files. It does not import LinawLetra, React, Vite, Supabase or application environment files. Both browsers use fresh contexts and allow only the fixture's own loopback origin. Server-observed paths are correlated with browser failures in [network-diagnostic.json](evidence/phase3/network-diagnostic.json).

In the recorded diagnostic, **5/10** contexts completed all scripts without request failures in Edge and **5/10** in Chrome for Testing. Both reported `ERR_NETWORK_ACCESS_DENIED` against the independent fixture. All eleven denied paths were absent from the server's corresponding per-context request window. This demonstrates that LinawLetra code is not a necessary cause of that error in this environment. It does not identify a particular Windows policy, firewall product or browser defect. Chromium defines this as a network-access-denial error; the fixture evidence, rather than that label alone, supports the environment-level classification. [Chromium error definitions](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/base/net_error_list.h).

The app suite still uses actual HTTP asset loading, with failed-asset and overflow assertions. No mocked static responses, retry-until-pass loop or substituted browser was used to clear the failed native-browser cases. Deliberately aborted external fonts and route-bundle recovery requests are distinguishable from unexpected local denials in the request logs.

Remaining action: a developer should inspect the relevant local network/endpoint logs or rerun the unchanged suite on a clean approved workstation/CI runner. Any machine-policy change requires appropriate approval. Public route/overflow corrections remain validated at their individually executed scope; a successful single rerun does not resolve the separate cold-load reliability failure.
