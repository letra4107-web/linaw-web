# Automatic deployment setup

After this workflow is enabled, every push to the `main` branch follows this order:

1. GitHub Actions installs dependencies, runs lint, tests, and the production build.
2. Only when verification succeeds, GitHub Actions builds the web application with production values and uploads the contents of `dist/` to Hostinger `public_html`.
3. Railway deploys the Node.js/Express API from the same `main` push through its connected GitHub repository.

## One-time GitHub setup

Open the repository on GitHub, then select **Settings → Secrets and variables → Actions → New repository secret**. Add these six secrets exactly. Never paste their values into source code, tickets, screenshots, or chat.

| Secret name | Value |
| --- | --- |
| `HOSTINGER_FTP_HOST` | Hostinger FTP host from hPanel → Files → FTP Accounts. Include the protocol only if Hostinger specifically supplies it. |
| `HOSTINGER_FTP_USERNAME` | The dedicated Hostinger FTP username. |
| `HOSTINGER_FTP_PASSWORD` | The dedicated Hostinger FTP password. |
| `VITE_SUPABASE_URL` | Production Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Production Supabase anon/public key. |
| `VITE_API_URL` | `https://linawletra-production-409e.up.railway.app/api` |

Use a dedicated FTP account limited to the website directory when Hostinger allows it. Do not use the Hostinger account password.

## Railway setup

In Railway, confirm the service is linked to `letra4107-web/linaw-web`, branch `main`, and automatic deployments are enabled. Keep Railway backend secrets in Railway Variables only. Railway does not need Hostinger or frontend secrets.

## First automatic release

1. Add the six GitHub Secrets.
2. Push this workflow to `main`.
3. Open GitHub → **Actions** → **CI**.
4. Confirm `verify` succeeds, then confirm `Deploy web to Hostinger` succeeds.
5. Verify the new frontend asset hash on `https://linawletra.com/` and the backend health endpoint.

The deployment intentionally does not use `dangerous-clean-slate`; this avoids deleting Hostinger-owned files such as `.well-known`. Old hashed frontend assets can remain safely because `index.html` points only to the new hashes.

## Rollback

Use GitHub to revert the commit, then push the revert to `main`. The same CI workflow rebuilds and deploys the prior frontend. In Railway, redeploy the prior successful deployment only if the backend change itself needs rollback. Database migrations require their separate reviewed rollback plan.
