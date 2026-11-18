from bench.dataset import Page
from bench.report import period, score_page
from bench.systems.vlm import output_tag_text, xml_text

PAGE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<PcGts xmlns="http://schema.primaresearch.org/PAGE/gts/pagecontent/2019-07-15">
<Page><TextRegion id="r">
<TextLine id="l1"><Coords points="0,0 100,0 100,20 0,20"/>
  <TextEquiv><Unicode>Le roy est mort.</Unicode></TextEquiv></TextLine>
<TextLine id="l2"><Coords points="0,30 100,30 100,50 0,50"/>
  <TextEquiv><Unicode>Vive le roy!</Unicode></TextEquiv></TextLine>
</TextRegion></Page></PcGts>
"""


def make_page(tmp_path):
    (tmp_path / "p.xml").write_text(PAGE_XML, encoding="utf-8")
    (tmp_path / "p.txt").write_text("Le roy est mort.\nVive le roy!\n", encoding="utf-8")
    return Page("p", "fr_pre1700", "fr", "src", "doc", None, tmp_path / "p.xml", tmp_path / "p.txt")


def test_page_is_scored_in_both_views(tmp_path):
    record = {
        "text": "le Roy est mort\nvive le roi",
        "lines": [
            {"text": "le Roy est mort", "bbox": [0, 1, 100, 21]},
            {"text": "vive le roi", "bbox": [0, 29, 100, 51]},
        ],
    }
    score = score_page(make_page(tmp_path), record)
    # strict: "Le"->"le", "roy"->"Roy", "mort."->"mort", "Vive"->"vive", "roy!"->"roi"
    assert score.words["strict"].rate() == 5 / 7
    # normalized only differs on roy -> roi
    assert score.words["normalized"].rate() == 1 / 7
    assert (score.lines.gt, score.lines.pred, score.lines.matched) == (2, 2, 2)


def test_page_without_line_boxes_has_no_line_score(tmp_path):
    score = score_page(make_page(tmp_path), {"text": "Le roy", "lines": []})
    assert score.lines is None


def test_period_labels():
    assert period("de_pre1700") == "before 1700"
    assert period("en_post1800") == "1800–1950"


def test_vlm_output_tag_is_stripped():
    assert output_tag_text("<think>hm</think><output>\nab\ncd\n</output>") == "ab\ncd"
    assert output_tag_text("no tags") == "no tags"
    assert output_tag_text("<output>cut off") == "cut off"


def test_churro_xml_becomes_lines():
    raw = (
        '<?xml version="1.0"?><HistoricalDocument><Page><Body>'
        "<Line>Von der</Line><Line>Miſsion &amp; Co</Line></Body></Page>"
        "</HistoricalDocument>"
    )
    assert xml_text(raw) == "Von der\nMiſsion & Co"


def test_churro_metadata_is_not_transcription():
    raw = (
        "<HistoricalDocument><Metadata><Language>German</Language>"
        "<Description>A letter.</Description></Metadata><Page><Header>"
        "<PageNumber>443.</PageNumber></Header><Body><Line>Von der</Line>"
        "</Body></Page></HistoricalDocument>"
    )
    assert xml_text(raw) == "443.\nVon der"
