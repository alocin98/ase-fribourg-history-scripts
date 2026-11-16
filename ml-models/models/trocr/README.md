# TrOCR

The recognition model of the current ML backend (`webapp/ml-backend/app/pipeline.py`).
Lines are found with Kraken BLLA, then each line is read by TrOCR.

- Model: [`microsoft/trocr-small-handwritten`](https://huggingface.co/microsoft/trocr-small-handwritten),
  trained on modern English handwriting (IAM).
- Revision: `8cb4cfdbd0f9863f3e8e62f7563321c2f0282c56`, the one with safetensors weights.
  Kraken pins torch 2.4, and transformers only loads the older `.bin` weights with torch
  2.6 or newer. The same pin is in `webapp/ml-backend/Dockerfile`.
- Licence: not stated on the model card (the TrOCR code in `microsoft/unilm` is MIT).

## Download

The weights (~250 MB) are downloaded automatically into `~/.cache/huggingface` the first
time the ML backend or the benchmark loads the model. To download them beforehand:

```sh
hf download microsoft/trocr-small-handwritten --revision 8cb4cfdbd0f9863f3e8e62f7563321c2f0282c56
```

The Docker image of the ML backend downloads them at build time.
