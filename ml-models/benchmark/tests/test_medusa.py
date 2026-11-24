from PIL import Image

from bench.systems.medusa import MAX_PIXELS, line_image


def test_line_is_cut_out_on_black():
    page = Image.new("RGB", (100, 100), "white")
    line = line_image(page, [[10, 10], [90, 10], [90, 30], [10, 20]])
    assert line.size == (80, 20)
    assert line.getpixel((5, 2)) == (255, 255, 255)  # inside the polygon
    assert line.getpixel((5, 18)) == (0, 0, 0)  # below the slanted lower edge


def test_large_lines_are_scaled_down():
    page = Image.new("RGB", (4000, 400), "white")
    line = line_image(page, [[0, 0], [4000, 0], [4000, 400], [0, 400]])
    assert line.width * line.height <= MAX_PIXELS
    assert abs(line.width / line.height - 10) < 0.1


def test_empty_polygon_gives_no_image():
    assert line_image(Image.new("RGB", (10, 10)), [[1, 1], [5, 1]]) is None
