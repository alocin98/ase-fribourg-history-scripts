"""Test pages that a model was trained on, as far as its training data is published.

Our sources are public datasets, and so are the training sets of the published models.
A model that has seen a page scores better on it than on a page it has never seen, so
reports also compare the models on the pages that none of the checked models has seen.

Checked on 2026-11-23 (scripts and downloads of that check are not kept):

- `ppocrv6`: the dataset list of the model card (zenodo 21788410). It names the whole
  repositories of the sources below, and its test split is a random 5 % of lines, so
  the pages we test on are in its training data. `enhg_lit463` is in it as the
  graphemic version of the same pages (zenodo 18441031).
- `medusa-9b`: the dataset tables of the MEDUSA 0.1 and 0.2 model cards. Our medieval
  French manuscripts are all in CATMuS Medieval (line texts matched page by page;
  MEDUSA's CMMHWR training set has as many lines as all CATMuS Romance and Latin lines,
  including CATMuS's test split). Five Königsfelden pages are in Tridis (image names
  matched). StABS Ratsbücher (zenodo 5153263) and Inzigkofen (zenodo 17978574, our
  canonesses sources) are named on the card. MEDUSA 0.2 also saw the text of the
  Otinel edition (as synthetic lines), which includes the Vatican Reg. lat. 1616 pages.

- `churro-3b`: the training split of CHURRO-DS (stanford-oval/churro-dataset), whose
  example ids are the page file names of its 155 source datasets: 124 of our test
  pages, listed in `seen_pages.json`. Its Valais census pages are named differently and
  are counted by source.
- `mccatmus` (and `lid-mccatmus`, the same model): the training split of CATMuS Modern
  (CATMuS/modern on Hugging Face), line texts matched page by page (at least 30 % of a
  page's lines): 38 pages, listed in `seen_pages.json`.
- The `grand_tour` and `lassberg` pages (data/add_sources.py) were published after all
  these models were trained.

Not checked: TrOCR (trained on modern English) and Qwen3.5, whose training data is not
published.
"""

import json
from pathlib import Path

_PAGES = json.loads((Path(__file__).with_name("seen_pages.json")).read_text())

SEEN_SOURCES = {
    "ppocrv6": {
        "canonesses_fol1045",
        "canonesses_oct842",
        "cremma_medieval",
        "decameron_fr",
        "denver_jcrs",
        "dresden_hofdiarium",
        "enhg_lit463",
        "fondue_fr_mss18",
        "gallicorpora_15e",
        "htromance_medieval_fr",
        "joseph_hooker",
        "koenigsfelden",
        "mkn_kurrent",
        "revolutionary_city",
        "stabs_basel",
        "valais_de",
        "valais_fr",
    },
    "medusa-9b": {
        "canonesses_fol1045",
        "canonesses_oct842",
        "cremma_medieval",
        "gallicorpora_15e",
        "htromance_medieval_fr",
        "stabs_basel",
    },
}
SEEN_SOURCES["churro-3b"] = {"valais_de", "valais_fr"}
SEEN_PAGES = {
    "churro-3b": set(_PAGES["churro-3b"]),
    "mccatmus": set(_PAGES["mccatmus"]),
    "lid-mccatmus": set(_PAGES["mccatmus"]),
    "medusa-9b": {
        "koenigsfelden__page_U-17_0627_r__eb12e3",
        "koenigsfelden__page_U-17_0738_r__d83ed5",
        "koenigsfelden__page_U-17_0793_r__16ca9b",
        "koenigsfelden__page_U-17_0903_r__cc7228",
        "koenigsfelden__page_U-17_0958_r__7e1c9a",
    },
}


def checked(system: str) -> bool:
    return system in SEEN_SOURCES or system in SEEN_PAGES


def times_seen(page) -> int:
    """How many of the checked models were trained on `page`."""
    systems = (SEEN_SOURCES.keys() | SEEN_PAGES.keys()) - {"lid-mccatmus"}  # = mccatmus
    return sum(seen(system, page) for system in systems)


def seen(system: str, page) -> bool:
    """Whether `page` is in the training data of `system` (False when not checked)."""
    return page.source in SEEN_SOURCES.get(system, ()) or page.page_id in SEEN_PAGES.get(system, ())
