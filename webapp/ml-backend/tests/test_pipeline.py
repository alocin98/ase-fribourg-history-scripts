from types import SimpleNamespace

from app.pipeline import group_blla_fragments, group_tokens


def line(y):
    return SimpleNamespace(baseline=[(0, y), (100, y)])


def test_fragments_on_the_same_line_are_grouped():
    groups = group_blla_fragments([line(100), line(110), line(300)], y_tolerance=60)

    assert [len(group["lines"]) for group in groups] == [2, 1]
    assert groups[0]["mean_y"] == 105


def test_groups_are_sorted_top_to_bottom():
    groups = group_blla_fragments([line(300), line(100)], y_tolerance=60)

    assert [group["mean_y"] for group in groups] == [100, 300]


def test_zero_tolerance_keeps_fragments_apart():
    groups = group_blla_fragments([line(100), line(101)], y_tolerance=0)

    assert len(groups) == 2


def to_string(tokens):
    return "".join(tokens).replace("▁", " ")


def test_tokens_are_grouped_into_words():
    words, confidence = group_tokens(
        ["▁Ver", "agon", "s", "▁,"], [0.2, 0.6, 1.0, 1.0], to_string
    )

    assert [word["text"] for word in words] == ["Veragons", ","]
    assert words[0]["confidence"] == 0.6
    assert confidence == 0.7


def test_empty_line_has_no_words_and_no_confidence():
    assert group_tokens([], [], to_string) == ([], None)
