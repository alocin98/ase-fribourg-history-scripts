from dataclasses import replace

from bench.dataset import Page
from bench.overlap import checked, seen, times_seen

PAGE = Page("p", "fr_post1700", "fr", "poilus_testaments", "doc", None, None, None)


def test_seen_by_source_or_by_page():
    assert not seen("ppocrv6", PAGE)
    assert seen("ppocrv6", replace(PAGE, source="mkn_kurrent"))
    koenigsfelden = replace(PAGE, source="koenigsfelden")
    assert not seen("medusa-9b", koenigsfelden)
    assert seen(
        "medusa-9b", replace(koenigsfelden, page_id="koenigsfelden__page_U-17_0738_r__d83ed5")
    )


def test_unchecked_systems_have_seen_nothing():
    assert not checked("qwen3.5-9b")
    assert not seen("qwen3.5-9b", replace(PAGE, source="mkn_kurrent"))


def test_times_seen_counts_each_model_once():
    poilus = replace(
        PAGE, page_id="poilus_testaments__batch-1_TestamentsDePoilus_will_AD78_0066-0__659051"
    )
    assert times_seen(poilus) == 2  # CHURRO and McCATMuS, not McCATMuS twice
