import math
from typing import NamedTuple

from fastapi import HTTPException
from pyvips import Error, Image, Interpolate

from app.core.config import settings


class IIIFImage(NamedTuple):
    content: bytes
    media_type: str
    width: int
    height: int


def load_image(source: str) -> Image:
    try:
        return Image.new_from_file(source, access="random")
    except Error as error:
        raise HTTPException(status_code=415, detail="Invalid image") from error


def transform_region(image: Image, region: str) -> Image:
    if region == "full":
        return image
    if region == "square":
        side = min(image.width, image.height)
        x = (image.width - side) // 2
        y = (image.height - side) // 2
        return image.crop(x, y, side, side)

    try:
        if region.startswith("pct:"):
            values = region.removeprefix("pct:").split(",")
            if len(values) != 4:
                raise ValueError
            percentages = [float(value) for value in values]
            if (
                any(not math.isfinite(value) for value in percentages)
                or not 0 <= percentages[0] <= 100
                or not 0 <= percentages[1] <= 100
                or not 0 < percentages[2] <= 100
                or not 0 < percentages[3] <= 100
            ):
                raise ValueError
            x = round(image.width * percentages[0] / 100)
            y = round(image.height * percentages[1] / 100)
            width = round(image.width * percentages[2] / 100)
            height = round(image.height * percentages[3] / 100)
        else:
            values = region.split(",")
            if len(values) != 4:
                raise ValueError
            x, y, width, height = [int(value) for value in values]

        if x < 0 or y < 0 or width <= 0 or height <= 0:
            raise ValueError
        if x + width > image.width or y + height > image.height:
            raise ValueError
    except (TypeError, ValueError) as error:
        raise HTTPException(
            status_code=400,
            detail="Unsupported IIIF region",
        ) from error

    return image.crop(x, y, width, height)


def _parse_size(size: str, image: Image) -> tuple[int, int]:
    allow_upscale = size.startswith("^")
    if allow_upscale:
        size = size[1:]

    if size == "max":
        return _get_max_size(image, allow_upscale=allow_upscale)
    if size == "full":
        return image.width, image.height

    try:
        if size.startswith("pct:"):
            percentage = float(size.removeprefix("pct:"))
            if percentage <= 0 or (not allow_upscale and percentage > 100):
                raise ValueError
            scale = percentage / 100
            return (
                max(1, round(image.width * scale)),
                max(1, round(image.height * scale)),
            )

        fit_inside = size.startswith("!")
        if fit_inside:
            size = size[1:]

        if size.endswith(","):
            target_width = int(size[:-1])
            if target_width <= 0 or (not allow_upscale and target_width > image.width):
                raise ValueError
            return target_width, max(
                1, round(image.height * target_width / image.width)
            )

        if size.startswith(","):
            target_height = int(size[1:])
            if target_height <= 0 or (
                not allow_upscale and target_height > image.height
            ):
                raise ValueError
            return max(
                1, round(image.width * target_height / image.height)
            ), target_height

        target_width, target_height = map(int, size.split(","))
        if target_width <= 0 or target_height <= 0:
            raise ValueError

        if not fit_inside:
            if not allow_upscale and (
                target_width > image.width or target_height > image.height
            ):
                raise ValueError
            return target_width, target_height

        scale = min(
            target_width / image.width,
            target_height / image.height,
        )
        if not allow_upscale:
            scale = min(scale, 1)

        return (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        )
    except (TypeError, ValueError, ZeroDivisionError, OverflowError) as error:
        raise HTTPException(status_code=400, detail="Unsupported IIIF size") from error


def _get_max_size(image: Image, *, allow_upscale: bool) -> tuple[int, int]:
    if settings.MAX_WIDTH <= 0 or settings.MAX_HEIGHT <= 0:
        raise HTTPException(status_code=500, detail="Invalid image size limits")

    scale = min(settings.MAX_WIDTH / image.width, settings.MAX_HEIGHT / image.height)
    if not allow_upscale:
        scale = min(scale, 1)
    return max(1, round(image.width * scale)), max(1, round(image.height * scale))


def transform_size(image: Image, size: str) -> Image:
    target_width, target_height = _parse_size(size, image)
    if (target_width, target_height) == (image.width, image.height):
        return image
    return image.resize(
        target_width / image.width,
        vscale=target_height / image.height,
        kernel="lanczos3",
    )


def _parse_rotation(rotation: str) -> tuple[float, bool]:
    mirrored = rotation.startswith("!")
    value = rotation[1:] if mirrored else rotation
    try:
        angle = float(value)
    except ValueError as error:
        raise ValueError("Invalid rotation") from error
    if not 0 <= angle < 360:
        raise ValueError("Invalid rotation")
    return angle, mirrored


def transform_rotation(image: Image, rotation: str) -> Image:
    try:
        angle, mirrored = _parse_rotation(rotation)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Invalid rotation") from error

    if mirrored:
        image = image.fliphor()
    if not angle:
        return image

    return image.rotate(
        angle,
        interpolate=Interpolate.new("bicubic"),
        background=[0],
    )


def transform_quality(image: Image, quality: str) -> Image:
    if quality not in {"default", "color", "gray", "bitonal"}:
        raise HTTPException(status_code=400, detail="Unsupported IIIF quality")
    if quality in {"gray", "bitonal"}:
        image = image.colourspace("b-w")
    if quality == "bitonal":
        image = (image > 127).ifthenelse(255, 0)
    return image


def encode_image(image: Image, image_format: str) -> IIIFImage:
    image_format = image_format.lower()
    if image_format in {"jpg", "jpeg"}:
        media_type = "image/jpeg"
        content = image.jpegsave_buffer(Q=90)
    elif image_format == "png":
        media_type = "image/png"
        content = image.pngsave_buffer()
    elif image_format == "webp":
        media_type = "image/webp"
        content = image.webpsave_buffer(Q=80)
    else:
        raise HTTPException(status_code=400, detail="Unsupported IIIF format")

    return IIIFImage(content, media_type, image.width, image.height)


def transform_image(
    source: str,
    *,
    region: str,
    size: str,
    rotation: str,
    quality: str,
    image_format: str,
) -> IIIFImage:
    image = load_image(source)
    image = transform_region(image, region)
    image = transform_rotation(image, rotation)
    image = transform_size(image, size)
    image = transform_quality(image, quality)
    return encode_image(image, image_format)
