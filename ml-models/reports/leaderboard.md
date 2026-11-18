# Leaderboard

Headline numbers of every report and of the baselines, best first. Updated with every report.

## Transcription, `quick` set (normalized, lower is better)

| model                                    | date       | CER % | WER % | s / page | pages |
| ---------------------------------------- | ---------- | ----- | ----- | -------- | ----- |
| CHURRO 3B (baseline)                     | 2026-11-16 | 11.8  | 29.3  | 48.9     | 30    |
| [McCATMuS](2026-11-16_mccatmus_quick.md) | 2026-11-16 | 39.7  | 83.7  | 6.4      | 30    |
| Qwen3.5-9B (baseline)                    | 2026-11-16 | 48.5  | 107.1 | 50.5     | 30    |
| [TrOCR](2026-11-16_trocr_quick.md)       | 2026-11-16 | 68.2  | 96.3  | 8.5      | 30    |

## Language detection (higher is better)

| method                                                                      | set     | date       | accuracy % | s / page | pages |
| --------------------------------------------------------------------------- | ------- | ---------- | ---------- | -------- | ----- |
| [Language detection A](language-detection/2026-11-16_lid-mccatmus_quick.md) | `quick` | 2026-11-16 | 63.3       | 7.4      | 30    |

## Remarks

**Manual Review of the data**
I went through the 10 test pages from this PR (commit 8270b54) by hand. For every word-level difference between the human reference and each model's output, I checked the manuscript and decided which side was right: reference correct (model worse), model correct (model better than the reference), or both wrong. That makes 393 differences, of which 234 are decided.

Fully reviewed pages (01, 03–09):

Model Model errors Model better than reference

| Model       | Model errors | Model better than reference |
| ----------- | ------------ | --------------------------- |
| Qwen 3.5 9B | 123          | 11                          |
| CHURRO 3B   | 80           | 16                          |

CHURRO makes about 35% fewer errors and is as good or better than Qwen on every one of these 8 pages.
Qwen hallucinates plausible text, including names and dates, e.g. Courtellemont → Courtellonot, Edouard → Bernard, C.D. Spivak → C. S. Shaver, "cinq Mai" → "un octobre". In the Hooker letter it rewrites whole phrases. CHURRO's errors are mostly case, punctuation and apostrophes, though it still gets a few names wrong (Stéphanie → Héloïse, Robinet → Delmet). It also transcribes text the reference leaves out (stamps, a page header).
The reference itself contains errors. I found 27 cases where the model was right and the reference wrong (Fissman/Lissman, Ferman/Lerman, worked/noted, the S^t Saint notation). An automatic CER against the reference therefore overcounts errors, and slightly more for the better model.

**Limits**: the German page (02) and the medieval French page (10) are almost entirely unreviewed, so there is no conclusion for those. Many "errors" are typographic (’ vs ', oe vs œ), which matters if the goal is name extraction. This is 8 pages: it shows a trend, not a robust measurement.

**Some points about qewn**
The qwen model got stuck in a repetition loop which led to a too high error rate. This can be seen by having an error rate of above 100% which is quite odd. This can happen by habing the model being stuck in a loop and producing ways too much characters. We need to address this in the future by increasing the temperature a bit for example.
