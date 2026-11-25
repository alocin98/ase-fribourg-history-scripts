# PP-OCRv6 medium

A kraken line recognizer (the PP-OCRv6 architecture adapted for historical documents) by
Benjamin Kiessling (ALMAnaCH, Inria). It was pretrained on ~6.2 million handwritten,
typed and printed lines in 37 languages plus synthetic lines, so it is meant to work out
of the box and to be fine-tuned. Lines are found with Kraken BLLA, then each line is
read by PP-OCRv6.

- Source: [Zenodo, doi:10.5281/zenodo.21788410](https://doi.org/10.5281/zenodo.21788410),
  file `medium.safetensors` (~64 MB, ~16M parameters). `tiny` (zenodo 21788403) and
  `small` (zenodo 21788405) are faster and less accurate.
- Paper: [A Free Lunch? Adapting PP-OCRv6 for Historical Text Recognition](https://arxiv.org/abs/2609.20064).
- Needs kraken 7.1 or newer, so the benchmark runs it in `.venv-kraken7`.
- Licence: Apache-2.0.
- **Training data**: the model card lists the whole repositories of most of our
  sources (Kurrent, Hooker, Denver, Revolutionary City, Königsfelden, Dresden, the
  medieval French sets, ...). Only 6 of the 30 `quick` pages are new to it. See
  `../../benchmark/bench/overlap.py`.

## Download

The benchmark downloads the model into this folder the first time it is used. To
download it by hand:

```sh
curl -L -o medium.safetensors \
  "https://zenodo.org/records/21788410/files/medium.safetensors?download=1"
```
