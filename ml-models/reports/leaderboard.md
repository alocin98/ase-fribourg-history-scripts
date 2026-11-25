# Leaderboard

Headline numbers of every report and of the baselines, best first. Updated with every report.

## Transcription, `quick` set (normalized, lower is better)

| model                                          | date       | CER % | WER % | s / page | pages | seen in training |
| ---------------------------------------------- | ---------- | ----- | ----- | -------- | ----- | ---------------- |
| [PP-OCRv6 medium](2026-11-23_ppocrv6_quick.md) | 2026-11-23 | 15.8  | 38.8  | 6.4      | 30    | 14               |
| CHURRO 3B (baseline)                           | 2026-11-23 | 16.2  | 35.6  | 59.7     | 30    | 6                |
| [MEDUSA 0.2 9B](2026-11-23_medusa-9b_quick.md) | 2026-11-23 | 29.5  | 55.9  | 63.1     | 30    | 3                |
| Qwen3.5-9B (baseline)                          | 2026-11-23 | 35.2  | 57.8  | 39.7     | 30    | not checked      |
| [McCATMuS](2026-11-23_mccatmus_quick.md)       | 2026-11-23 | 40.8  | 81.0  | 7.0      | 30    | 5                |
| [TrOCR](2026-11-23_trocr_quick.md)             | 2026-11-23 | 67.8  | 96.7  | 11.9     | 30    | not checked      |

## Language detection (higher is better)

| method                                                                      | set     | date       | accuracy % | s / page | pages |
| --------------------------------------------------------------------------- | ------- | ---------- | ---------- | -------- | ----- |
| [Language detection A](language-detection/2026-11-23_lid-mccatmus_quick.md) | `quick` | 2026-11-23 | 66.7       | 5.2      | 30    |

## Remarks

The `quick` set was rebuilt on 2026-11-23 (see `benchmark/README.md`, "Page sets"): 10 of its 30 pages are newly added German pages no model has seen, the other 20 are the pages the fewest models were trained on, and pages whose transcription leaves out printed or stamped text are gone. All models were run again on it. The two remarks below ("Manual Review of the data", "Some points about qwen") are about the previous `quick` set.

### The rebuilt `quick` set: pages in the training data

Our sources are public, and so is the training data of most models; the column "seen in training" counts the pages of the set a model was trained on (`benchmark/bench/overlap.py`, Qwen and TrOCR not checkable). The fairest comparison is the 10 German pages no checked model has seen (Grand Tour diaries 1652–1689, Laßberg letters 1805–1853):

| model      | CER % on all 30 | CER % on the 10 unseen pages | `de_pre1700` | `de_post1700` |
| ---------- | --------------- | ---------------------------- | ------------ | ------------- |
| PP-OCRv6   | 15.8            | 12.2                         | 16.7         | 8.2           |
| CHURRO 3B  | 16.2            | 22.7                         | 34.5         | 12.3          |
| MEDUSA 9B  | 29.5            | 39.3                         | 48.9         | 30.7          |
| Qwen3.5-9B | 35.2            | 47.3                         | 45.0         | 49.4          |
| McCATMuS   | 40.8            | 54.6                         | 63.6         | 46.6          |
| TrOCR      | 67.8            | 80.8                         | 88.3         | 74.0          |

That is 10 pages from 2 collections (3 diaries, 5 letters), so it shows a trend, not a ranking.

- **PP-OCRv6** (64 MB, CPU, 6 s per page) is the best model on German it has never seen, and on the whole set about as good as CHURRO. On English it is clearly behind CHURRO (18 % against 5–7 %), although it was trained on all 10 English pages, and on 18th–20th century French too (35.3 % against 20.8 %).
- **CHURRO** is the best on English (it has seen 2 of the 10 pages) and on 18th–20th century French (2 of 5). On German it has never seen it is behind PP-OCRv6, most on the 17th-century diaries (34.5 % against 16.7 %).
- **MEDUSA** is only good on medieval French (6.7 %, mostly pages it was trained on). On the 17th-century German diaries it is not (48.9 %), and outside its period it invents medieval-looking text.

### Manual Review of the data

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

### Some points about qwen

The first Qwen run got stuck in repetition loops on 2 of the 30 pages (one line, or "w.", repeated until the 4096-token limit), which pushed its CER to 48.5 % and WER above 100 %. Qwen now runs with a mild repetition penalty (1.1 over the last 20 tokens, still greedy) and a guard that stops and trims a loop if one still happens. In the re-run (2026-11-23) no page loops or hits the limit, and CER drops to 22.6 %. The penalty also helps on the 28 pages that never looped (CER 21.0 → 19.9 %, WER 53.4 → 47.0 %), but 6 of them got slightly worse. The manual review above was done on the outputs of the first run.
