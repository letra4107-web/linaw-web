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
  rm -f -- "$probe_file"
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

# Explicit '.' target avoids lftp appending the source directory name. Keep old
# hashed assets and Hostinger-owned files; publish the entry page only at the end.
for attempt in 1 2 3; do
  if ftp_commands "
    cd $destination;
    mirror --reverse --continue --parallel=1 --no-perms --verbose=1 --exclude-glob index.html --exclude-glob .ftp-deploy-sync-state.json dist .;
    put dist/index.html -o index.html;
  "; then
    echo 'Frontend upload completed; live verification runs next.'
    exit 0
  fi
  echo "FTP transfer attempt $attempt/3 interrupted; reconnecting to continue."
  sleep 5
done
echo 'FTP upload could not be completed after reconnecting.' >&2
exit 1
