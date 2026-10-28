# AUD-001 — owner-side credential rotation

Status: **OPEN until the owner confirms revocation and replacement where needed.** No credential was used, tested for validity, rotated, or changed in a live environment by this audit.

Both current tracked example files now contain placeholders. The local history scan examined 1,131 reachable text objects and found one historical `server/.env.example` blob containing Supabase service-role, SMTP/app-password, Brevo and ElevenLabs credential types. The [redacted scan](evidence/resolution/credential-history.json) records locations and object IDs only. This establishes repository exposure, not whether a credential is currently valid or whether the repository was publicly accessible. Unreachable objects, remote-only refs, other clones and binary artifacts were not scanned.

The first follow-up scanner incorrectly let an empty assignment consume the following line. That parser was corrected; its current-example Brevo finding was a false positive. The historical four-type exposure remains confirmed. No secret value appears here.

## Supabase service-role key

1. Sign in as the project owner and open **Project Settings → API Keys**. Privately inventory consumers: the web API, mobile backend, CI jobs and administrative tools. The service-role JWT found in history is a legacy key; it is not the JWT signing secret itself.
2. Create separate replacement **secret API keys** for controlled backend consumers. Test SDK/tool compatibility in isolation, then update the consumers' private settings. This web server reads `SUPABASE_SERVICE_ROLE_KEY`; that variable name can continue holding a supported replacement secret key. Never place a secret key in a `VITE_` variable or mobile bundle.
3. Move public web/mobile consumers to publishable keys before disabling the legacy key pair if they still depend on legacy `anon`. Coordinate required builds/releases yourself; no deployment is authorized in this task.
4. After the replacement consumers are ready, **disable the legacy JWT-based API keys in API Keys settings**. Creating a new secret key alone leaves legacy keys valid. Record the dashboard revocation state without copying key values.

These steps follow [Supabase API-key migration and revocation guidance](https://supabase.com/docs/guides/getting-started/api-keys). If a separate JWT signing secret was also exposed, use the dashboard's signing-key migration/rotation and **revoke the previous signing key**; rotating without revoking leaves older keys accepted. Do not assume a service-role JWT exposure also disclosed the signing secret. See [Supabase rotation guidance](https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd).

## SMTP / Gmail app password

The historical configuration used Gmail SMTP. Open the owning Google account's **Security → App passwords** (or [App Passwords](https://myaccount.google.com/apppasswords)); remove the app password associated with this integration. If SMTP remains required, create a new dedicated app password and update `SMTP_PASS` privately for each consumer. Keep 2-Step Verification enabled. Confirm removal in the account UI; do not validate the old password by sending mail. If it was a normal account password instead, change that password and review the account's signed-in devices/security activity. [Google's removal instructions](https://support.google.com/accounts/answer/185833?hl=en).

## Brevo API key

Open **Settings → SMTP & API → API Keys & MCP**. If an integration still uses Brevo, generate a separately named replacement, update that integration's private `BREVO_API_KEY`, then delete the exposed key. If unused, delete it without creating another. Current web mail delivery uses SMTP; this does not establish that other consumers stopped using Brevo. Confirm deletion in the dashboard and review unexpected API/mail activity. [Brevo key creation and deletion](https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-API-keys).

## ElevenLabs API key

Open personal API-key settings, or **Workspace settings → Service Accounts** for a service-account key. Create a replacement for the same account with the required existing permissions, update private `ELEVENLABS_API_KEY` settings, then delete the old key. `ELEVENLABS_VOICE_ID` is an identifier; it does not replace key revocation. Review unexpected credit usage. Confirm deletion from the dashboard; this audit will not call a provider with the exposed key. [ElevenLabs rotation instructions](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys).

## Confirmation and history

For each credential type, confirm **replacement complete / old credential revoked or deleted**, the date, and the affected consumers. Provide no credential values in chat, reports, screenshots, Git or tests. No owner confirmation has been received.

Revocation comes before any separately coordinated repository-history cleanup. Cleaning a working file or rewriting history cannot revoke a copied secret. Review repository access, forks, CI artifacts and provider activity privately; any history rewrite, force push or deployment requires separate explicit authorization.
