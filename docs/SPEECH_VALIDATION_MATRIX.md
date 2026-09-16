# Speech validation matrix

Run each case in Chrome with `fil-PH` recognition and record the fields below. This is a manual test record; it is not evidence until an actual speaker/environment is entered.

| Test phrase/word | Expected pronunciation/result | Environment | Speaker | Recognition transcript | Confidence | Similarity | System decision | Expected decision | Pass/fail | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |

| Condition | Input | Expected outcome |
| --- | --- | --- |
| Quiet room | Correct Filipino reading | Correct; attempt is saved. |
| Low / moderate household noise | Correct reading | Correct when transcript is reliable; otherwise retry, never automatic incorrect. |
| High noise / conversation | Any reading | Friendly retry; no attempt is saved if recognition is uncertain. |
| Very quiet voice / no speech | Correct target | “Hindi kita narinig…” or browser no-speech message; no incorrect mark. |
| Correct, normal variation | Filipino pronunciation that STT transcribes near the target | Retry for 55–87 similarity so staff can review thresholds; no false negative. |
| Clearly different word | Reliable transcript below 55 similarity | Incorrect attempt is saved. |
| Incomplete / repeated word | Reliable transcript | Retry if near target; incorrect only when clearly different. |
| Permission denied / missing microphone / network failure | Trigger browser error | Student-friendly error; no attempt is saved. |
| Multisyllabic word | Two or more estimated vowel groups | Normal and 0.6× Filipino playback are available. |

Browser Web Speech does not provide dependable acoustic noise metrics. “High noise” is therefore treated as uncertain recognition rather than inferred as a wrong pronunciation. A production pronunciation-grade score still requires a Filipino-capable assessment provider and recorded, consented test samples.
