# Models

One folder per model we work on. Each README says where the model comes from and how to
get its weights. The weights are not committed.

| model                  | used in                         | results                                             |
| ---------------------- | ------------------------------- | --------------------------------------------------- |
| [TrOCR](trocr/)        | current ML backend              | [quick](../reports/2026-11-16_trocr_quick.md)       |
| [McCATMuS](mccatmus/)  | candidate, language detection A | [quick](../reports/2026-11-16_mccatmus_quick.md)    |
| [PP-OCRv6](ppocrv6/)   | candidate                       | [quick](../reports/2026-11-23_ppocrv6_quick.md)     |
| [MEDUSA](medusa/)      | candidate                       | [quick](../reports/2026-11-23_medusa-9b_quick.md)   |

The baselines of the benchmark (Qwen3.5-9B, CHURRO) are not ours to train and are
described in [benchmark/README.md](../benchmark/README.md#baselines).
