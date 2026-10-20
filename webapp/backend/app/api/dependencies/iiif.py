from io import BytesIO
from typing import NamedTuple

from fastapi import HTTPException
from PIL import Image


class IIIFImage(NamedTuple):
    content: bytes
    media_type: str
    width: int
    height: int


def _parse_region(region: str, image: Image.Image) -> tuple[int, int, int, int]:
    if region == "full":
        return 0, 0, image.width, image.height

    try:
        values = region.split(",")
        if len(values) != 4:
            raise ValueError

        x, y, width, height = [int(value) for value in values]

        if x < 0 or y < 0 or width <= 0 or height <= 0:
            raise ValueError

        if x + width > image.width or y + height > image.height:
            raise ValueError

        return x, y, width, height
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Unsupported IIIF region",
        ) from error


def _parse_size(size: str, width: int, height: int) -> tuple[int, int]:
    if size in {"full", "max"}:
        return width, height

    try:
        if size.startswith("pct:"):
            percentage = float(size.removeprefix("pct:")) / 100
            if percentage <= 0:
                raise ValueError
            return round(width * percentage), round(height * percentage)

        fit_inside = size.startswith("!")
        size = size.removeprefix("!")

        if size.endswith(","):
            target_width = int(size[:-1])
            target_height = round(height * target_width / width)
        elif size.startswith(","):
            target_height = int(size[1:])
            target_width = round(width * target_height / height)
        else:
            target_width, target_height = map(int, size.split(","))

        if target_width <= 0 or target_height <= 0:
            raise ValueError

        if fit_inside:
            scale = min(target_width / width, target_height / height)
            return round(width * scale), round(height * scale)

        return target_width, target_height
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Unsupported IIIF size",
        ) from error


def transform_image(
    content: bytes,
    *,
    region: str,
    size: str,
    rotation: str,
    quality: str,
    image_format: str,
) -> IIIFImage:
    if quality != "default":
        raise HTTPException(
            status_code=400,
            detail="Only the default IIIF quality is supported",
        )

    if rotation.startswith("!"):
        raise HTTPException(
            status_code=400,
            detail="Mirrored IIIF images are not supported",
        )

    try:
        angle = float(rotation)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Invalid rotation") from error

    if not 0 <= angle < 360:
        raise HTTPException(status_code=400, detail="Invalid rotation")

    try:
        image = Image.open(BytesIO(content))
        image.load()
    except Exception as error:
        raise HTTPException(status_code=415, detail="Invalid image") from error

    x, y, width, height = _parse_region(region, image)
    image = image.crop((x, y, x + width, y + height))

    if angle:
        image = image.rotate(angle, expand=True)

    target_width, target_height = _parse_size(
        size,
        image.width,
        image.height,
    )

    if (target_width, target_height) != image.size:
        image = image.resize(
            (target_width, target_height),
            Image.Resampling.LANCZOS,
        )

    image_format = image_format.lower()

    if image_format in {"jpg", "jpeg"}:
        output_format = "JPEG"
        media_type = "image/jpeg"
        image = image.convert("RGB")
    elif image_format == "png":
        output_format = "PNG"
        media_type = "image/png"
    elif image_format == "webp":
        output_format = "WEBP"
        media_type = "image/webp"
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported IIIF format",
        )

    output = BytesIO()
    image.save(output, format=output_format)

    return IIIFImage(
        content=output.getvalue(),
        media_type=media_type,
        width=image.width,
        height=image.height,
    )
