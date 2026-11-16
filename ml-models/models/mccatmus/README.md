# McCATMuS

A Kraken recognition model for handwritten, printed and typewritten documents from the
16th to the 21st century, in French, Latin, Spanish, English, German, Italian and Occitan.
About 90 % of its training data (CATMuS Modern) is French.

- Source: [Zenodo, doi:10.5281/zenodo.13788177](https://doi.org/10.5281/zenodo.13788177),
  file `McCATMuS_nfd_nofix_V1.mlmodel` (~15 MB).
- Licence: CC-BY 4.0.
- Output is Unicode NFD; the benchmark composes it to NFC before scoring.

## Download

The benchmark downloads the model into this folder the first time it is used. To download
it by hand:

```sh
curl -L -o McCATMuS_nfd_nofix_V1.mlmodel \
  "https://zenodo.org/records/13788177/files/McCATMuS_nfd_nofix_V1.mlmodel?download=1"
```
