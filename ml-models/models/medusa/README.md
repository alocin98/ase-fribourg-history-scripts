# MEDUSA 0.2 9B

Qwen3.5-9B fine-tuned by the École nationale des chartes (PSL) to read single lines of
medieval manuscripts (9th to 15th century, Old and Middle French, Latin, Middle High
German and 20 other languages). It was the best system of the ICDAR 2026 competition on
medieval handwriting. It reads lines, not pages: the benchmark gives it the lines Kraken
BLLA found in the `ppocrv6` run.

- Source: [`ENC-PSL/Medusa0.2Line-9B`](https://huggingface.co/ENC-PSL/Medusa0.2Line-9B),
  revision `b7a781e1352b5397a30c9e54d7027bb972fd9af9`. System report:
  [hal-05600991](https://enc.hal.science/hal-05600991).
- We run it with mlx-vlm, quantized to 8 bits (~10 GB). In bf16 (~18 GB) it does not fit
  next to the rest on a 24 GB Mac.
- Prompt and line images as in the authors' DocWorkflow pipeline. The prompt asks for
  the CATMuS conventions: abbreviations kept, only `u` and `i` (never `v` and `j`). That
  costs points on modern pages, where the human transcription writes `v` and `j`.
- Licence: CC-BY-4.0.
- **Training data**: all our medieval French test manuscripts are in CATMuS Medieval,
  which MEDUSA was trained on, and so are five Königsfelden pages (via Tridis). See
  `../../benchmark/bench/overlap.py`.

## Download and conversion

The benchmark expects the converted model in `Medusa0.2Line-9B-mlx-8bit/` (not
committed). From `ml-models/benchmark`, after `make install`:

```sh
.venv-vlm/bin/python -m mlx_vlm.convert --hf-path ENC-PSL/Medusa0.2Line-9B \
  --revision b7a781e1352b5397a30c9e54d7027bb972fd9af9 \
  --mlx-path ../models/medusa/Medusa0.2Line-9B-mlx-8bit -q --q-bits 8
```

This downloads the original weights (~18 GB) into `~/.cache/huggingface` first; they can
be deleted after the conversion.
