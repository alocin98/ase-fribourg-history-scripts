from bench.dataset import Page, make_sets, parse_lines, read_set, write_sets

ALTO = """<?xml version="1.0" encoding="UTF-8"?>
<alto xmlns="http://www.loc.gov/standards/alto/ns-v4#"><Layout><Page><PrintSpace>
<TextBlock>
  <TextLine ID="l1" HPOS="10.0" VPOS="20.0" WIDTH="100.0" HEIGHT="30.0">
    <String CONTENT="et le seigneur"/><SP/><String CONTENT="du-"/><HYP CONTENT="¬"/>
  </TextLine>
  <TextLine ID="l2">
    <Shape><Polygon POINTS="5 60 200 58 205 90 4 92"/></Shape>
    <String CONTENT="fau de touraine"/>
  </TextLine>
  <TextLine ID="empty" HPOS="0" VPOS="0" WIDTH="1" HEIGHT="1"><String CONTENT=" "/></TextLine>
</TextBlock></PrintSpace></Page></Layout></alto>
"""

PAGE = """<?xml version="1.0" encoding="UTF-8"?>
<PcGts xmlns="http://schema.primaresearch.org/PAGE/gts/pagecontent/2019-07-15">
<Page><TextRegion id="r"><TextLine id="l1">
  <Coords points="10,20 110,18 112,50 9,52"/>
  <Word id="w"><Coords points="10,20 40,20 40,50 10,50"/>
    <TextEquiv><Unicode>Von</Unicode></TextEquiv></Word>
  <TextEquiv><Unicode>Von der Miſsion</Unicode></TextEquiv>
</TextLine></TextRegion></Page></PcGts>
"""


def test_alto_lines(tmp_path):
    (tmp_path / "page.xml").write_text(ALTO, encoding="utf-8")
    lines = parse_lines(tmp_path / "page.xml")
    assert [line.text for line in lines] == ["et le seigneur du-¬", "fau de touraine"]
    assert [line.bbox for line in lines] == [(10, 20, 110, 50), (4, 58, 205, 92)]


def test_page_lines_use_the_line_text_not_the_words(tmp_path):
    (tmp_path / "page.xml").write_text(PAGE, encoding="utf-8")
    lines = parse_lines(tmp_path / "page.xml")
    assert [(line.text, line.bbox) for line in lines] == [("Von der Miſsion", (9, 18, 112, 52))]


def page(page_id, source="src", doc_id="d1", group="fr_post1700"):
    return Page(page_id, group, "fr", source, doc_id, None, None, None)


def test_quick_set_prefers_different_documents():
    pages = [page("a1", doc_id="d1"), page("a2", doc_id="d1"), page("a3", doc_id="d2")]
    quick = make_sets(pages, per_group=2)["quick"]
    assert len({p.doc_id for p in quick}) == 2
    assert len(make_sets(pages[:2], per_group=2)["quick"]) == 2


def test_sets_leave_out_census_pages():
    sets = make_sets([page("a1", source="valais_de"), page("a2")])
    assert [p.page_id for p in sets["full"]] == ["a2"]
    assert [p.page_id for p in sets["quick"]] == ["a2"]


def test_sets_are_written_once(tmp_path):
    pages = [page(f"p{i}", doc_id=f"d{i}") for i in range(8)]
    write_sets(pages, tmp_path)
    assert read_set("full", tmp_path) == [f"p{i}" for i in range(8)]
    assert len(read_set("quick", tmp_path)) == 5
    try:
        write_sets(pages, tmp_path)
        raise AssertionError("existing sets must not be overwritten")
    except FileExistsError:
        pass
