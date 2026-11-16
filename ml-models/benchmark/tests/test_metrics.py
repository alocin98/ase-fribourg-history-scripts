from bench.metrics import Counts, bootstrap_interval, edits, iou, match_lines, normalized, strict


def test_strict_collapses_whitespace_and_composes_accents():
    assert strict("  Von der\nMiſsion \t unter ") == "Von der Miſsion unter"
    assert strict("été") == "été"  # McCATMuS answers in NFD


def test_normalized_folds_long_s_case_accents_and_punctuation():
    assert normalized("Miſsion à Été") == "mission a ete"
    assert normalized("l'homme, dit-il.") == "l homme dit il"
    assert normalized("Anno 1563.") == "anno 1563"


def test_edits_are_split_by_kind():
    counts = edits("the cat sat down".split(), "the bat sat down here".split())
    assert counts == Counts(ref=4, sub=1, dele=0, ins=1)
    assert counts.rate() == 0.5
    assert edits("a b c d".split(), "a d".split()).dele == 2
    assert edits("", "abc").rate() is None


def test_counts_are_summed_not_averaged():
    short = edits("ab", "xb")  # 50 %
    long = edits("abcdefghij", "abcdefghij")  # 0 %
    assert (short + long).rate() == 1 / 12


def test_lines_are_matched_one_to_one_best_first():
    assert iou((0, 0, 10, 10), (5, 0, 15, 10)) == 50 / 150
    gt = [(0, 0, 100, 20), (0, 30, 100, 50)]
    pred = [(0, 28, 100, 52), (0, 2, 100, 22), (0, 100, 100, 120)]
    assert match_lines(gt, pred) == [(0, 1), (1, 0)]


def test_bootstrap_interval_contains_the_rate():
    docs = [Counts(ref=100, sub=e) for e in (5, 10, 15, 20)]
    low, high = bootstrap_interval(docs)
    assert low <= sum(docs, Counts()).rate() <= high
    assert bootstrap_interval(docs[:1]) is None
