#!/usr/bin/env bash
set -euo pipefail

: "${HOSTINGER_FTP_HOST:?Missing Hostinger FTP host}"
: "${HOSTINGER_FTP_USERNAME:?Missing Hostinger FTP username}"
: "${HOSTINGER_FTP_PASSWORD:?Missing Hostinger FTP password}"
: "${SITE_URL:?Missing public website URL}"

site="${SITE_URL%/}"
probe_name="linaw-deploy-probe-${GITHUB_SHA:-manual}-${RANDOM}.txt"
probe_value="${GITHUB_SHA:-manual}-${RANDOM}-${RANDOM}"
probe_file="${RUNNER_TEMP:-/tmp}/${probe_name}"
verify_file="${RUNNER_TEMP:-/tmp}/hostinger-verify-${GITHUB_SHA:-manual}.tmp"
if [[ ! "$probe_file" =~ ^[A-Za-z0-9_./-]+$ ]]; then
  echo 'The temporary probe path must contain only FTP-safe path characters.' >&2
  exit 1
fi
printf '%s' "$probe_value" > "$probe_file"

# Each transfer can reconnect independently instead of restarting the build upload.
# Preserve the FTP protocol used by the existing Hostinger connection.
ftp_commands() {
  lftp -u "${HOSTINGER_FTP_USERNAME},${HOSTINGER_FTP_PASSWORD}" "$HOSTINGER_FTP_HOST" -e "
    set cmd:fail-exit yes;
    set ftp:ssl-allow no;
    set ftp:sync-mode yes;
    set xfer:clobber yes;
    set net:timeout 45;
    set net:max-retries 5;
    set net:reconnect-interval-base 3;
    set net:reconnect-interval-max 15;
    $1
    bye;
  "
}

cleanup() {
  # Delete only this deployment's uniquely named probe, never website files.
  for candidate in . public_html; do
    ftp_commands "set net:timeout 5; set net:max-retries 1; cd $candidate; rm $probe_name;" >/dev/null 2>&1 || true
  done
  rm -f -- "$probe_file" "$verify_file"
}
trap cleanup EXIT

# FTP accounts can be rooted at public_html or one level above it. Prove which
# existing folder is public rather than creating another public_html directory.
destination=''
for candidate in . public_html; do
  if ftp_commands "cd $candidate; put $probe_file -o $probe_name;"; then
    for attempt in 1 2 3; do
      if actual="$(curl --fail --silent --max-time 15 "$site/$probe_name?check=$attempt")" && [[ "$actual" == "$probe_value" ]]; then
        destination="$candidate"
        break
      fi
      sleep 2
    done
  fi
  if [[ -n "$destination" ]]; then break; fi
done

if [[ -z "$destination" ]]; then
  echo 'Neither FTP directory serves the public website. No application files were uploaded.' >&2
  exit 1
fi
echo "Verified public FTP directory: $destination"

# Hashed assets are immutable: matching sizes need no upload on each rebuild.
# Upload other static files separately so configuration changes are not skipped.
for attempt in 1 2 3; do
  if ftp_commands "
    cd $destination;
    mirror --reverse --continue --ignore-time --parallel=1 --no-perms --verbose=1 dist/assets assets;
    mirror --reverse --continue --parallel=1 --no-perms --verbose=1 --exclude '^assets/' --exclude-glob index.html --exclude-glob .ftp-deploy-sync-state.json dist .;
  "; then
    break
  fi
  echo "FTP transfer attempt $attempt/3 interrupted; reconnecting to continue."
  if [[ "$attempt" == 3 ]]; then exit 1; fi
  sleep 5
done

# Verify the entry files over FTP and public HTTP before publishing index.html.
# A successful mirror alone does not prove that Hostinger retained every file.
entries="$(node -e 'const fs=require("fs"); const matches=[...fs.readFileSync("dist/index.html","utf8").matchAll(/(?:src|href)="([^"\s]*\/assets\/[^"\s]+\.(?:js|css))"/g)]; if(matches.length<2)process.exit(1); console.log(matches.map(match=>match[1].replace(/^\//,"")).join("\n"));')"
while IFS= read -r asset; do
  if [[ ! "$asset" =~ ^assets/[A-Za-z0-9_.-]+\.(js|css)$ ]]; then exit 1; fi
  ready=no
  for attempt in 1 2 3; do
    if ftp_commands "cd $destination; put dist/$asset -o $asset; get $asset -o $verify_file;" && cmp -s "dist/$asset" "$verify_file"; then
      type="$(curl --fail --silent --max-time 30 --output "$verify_file" --write-out '%{content_type}' "$site/$asset?deploycheck=${GITHUB_SHA:-manual}-$attempt")" || type=''
      if [[ ( "$asset" == *.js && "$type" == *javascript* ) || ( "$asset" == *.css && "$type" == *text/css* ) ]]; then
        ready=yes
        break
      fi
    fi
    echo "Entry asset verification attempt $attempt/3 failed: $asset"
    sleep 5
  done
  if [[ "$ready" != yes ]]; then echo "Entry asset unavailable; index.html was not published: $asset" >&2; exit 1; fi
done <<< "$entries"

ftp_commands "cd $destination; put dist/index.html -o index.html;"
echo 'Frontend upload completed; live verification runs next.'
