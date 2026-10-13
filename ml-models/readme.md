# ML Models

This folder contains the code to train our models, and the models themselves.

## Models

`models/` holds the models the webapp uses. They are the interface between the
ML team and the webapp team: the ML backend (`webapp/ml-backend`) loads them
from its own copy, refreshed with `make models` in that folder.

| File | Task | Source |
| --- | --- | --- |
| `models/catmus-medieval.mlmodel` | Text recognition (kraken) | CATMuS Medieval 1.5.0, [Zenodo 10.5281/zenodo.12743230](https://doi.org/10.5281/zenodo.12743230) |

Text segmentation uses BLLA, kraken's default model, which ships with kraken
and has no file here.

To replace a model, keep its file name (or update `RECOGNITION_MODEL` in the ML
backend) and make sure it loads with the kraken version in
`webapp/ml-backend/requirements.txt` (currently 7.1.1).
