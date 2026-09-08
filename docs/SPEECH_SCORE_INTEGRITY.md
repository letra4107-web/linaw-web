# Speech score integrity plan

## Current state

Several flows still use **client -> score -> server**: content attempts, Word of the Day, PDF drills, pronunciation sessions, and mobile speech/progress routes. Server-side ownership checks and reward guards exist in parts of these flows, but client accuracy/correctness is still an integrity input.

## Target state

**Client -> bounded raw transcript/input -> authenticated server -> server-fetched target -> server score/correctness -> atomic attempt/reward -> response.** The client must never submit XP, badges, streaks, completion, or level advancement as authoritative values.

Priority order is: reward-producing Word of the Day and PDF drill routes; content attempts; pronunciation sessions; then non-reward analytics. Each replacement needs an idempotency key, target/content authorization, transcript limits, rate limiting, server-owned persistence, and a staging comparison against the current client metric.

## Contained pilot

`POST /api/student/learn/content/:contentId/authoritative-attempt` is enabled only when `AUTHORITATIVE_SPEECH_SCORING_PILOT_ENABLED=true` and `NODE_ENV` is not production. It reads the expected `reading_content.content_text` on the server, scores a bounded transcript deterministically, uses the existing server-owned content-attempt RPC for progression/rewards, and stores an idempotent response in migration 027.

The client may send `clientAccuracy` only for staging comparison; it does not influence the score, correctness, or rewards. Do not enable it in production or wire it into general UI until representative staging results are reviewed. The deterministic token-distance metric is a security prototype, not a speech-recognition quality claim.
