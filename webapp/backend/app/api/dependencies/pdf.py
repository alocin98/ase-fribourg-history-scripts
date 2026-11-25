from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

from app.infrastructure.storage.s3 import download_file
from app.models.documents import Document


async def build_document_pdf(
    document: Document,
    pages: list[tuple[object, object | None]],
) -> BytesIO:
    pdf = BytesIO()
    pdf_document = SimpleDocTemplate(
        pdf,
        pagesize=A4,
        title=document.name,
        author="ASE Fribourg History",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocumentTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=10 * mm,
    )

    description_style = ParagraphStyle(
        "DocumentDescription",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=12,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#4B5563"),
    )

    page_title_style = ParagraphStyle(
        "PageTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=4 * mm,
    )

    transcription_title_style = ParagraphStyle(
        "TranscriptionTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=6 * mm,
    )

    transcription_style = ParagraphStyle(
        "Transcription",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#2F3542"),
        splitLongWords=False,
    )

    def add_page_chrome(canvas, page_number):
        canvas.saveState()
        canvas.setTitle(document.name)

        if canvas.getPageNumber() > 1:
            canvas.setFont("Helvetica-Bold", 9)
            canvas.setFillColor(colors.HexColor("#4B5563"))
            canvas.drawCentredString(
                A4[0] / 2,
                A4[1] - 12 * mm,
                document.name,
            )

        canvas.setStrokeColor(colors.HexColor("#D1D5DB"))
        canvas.setLineWidth(0.5)
        canvas.line(
            18 * mm,
            12 * mm,
            A4[0] - 18 * mm,
            12 * mm,
        )

        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawCentredString(
            A4[0] / 2,
            8 * mm,
            f"Page {canvas.getPageNumber()}",
        )
        canvas.restoreState()

    story = [
        Spacer(1, 55 * mm),
        Paragraph(escape(document.name), title_style),
    ]

    if document.description:
        story.extend(
            [
                Paragraph(
                    escape(document.description),
                    description_style,
                ),
                Spacer(1, 22 * mm),
                HRFlowable(
                    width="45%",
                    thickness=1,
                    color=colors.HexColor("#9CA3AF"),
                    hAlign="CENTER",
                ),
            ]
        )

    story.append(PageBreak())

    for index, (page, transcription) in enumerate(pages):
        story.append(Paragraph(f"Page {page.page_number}", page_title_style))

        image_bytes = await download_file(page.image_key)
        image = Image(BytesIO(image_bytes))

        available_width = A4[0] - 36 * mm
        available_height = A4[1] - 55 * mm
        scale = min(
            available_width / image.imageWidth,
            available_height / image.imageHeight,
        )
        image.drawWidth = image.imageWidth * scale
        image.drawHeight = image.imageHeight * scale
        image.hAlign = "CENTER"
        story.append(image)

        transcription_text = (
            transcription.text.strip()
            if transcription is not None and transcription.text
            else ""
        )

        if transcription_text:
            story.append(PageBreak())
            story.append(Paragraph("Transcription", transcription_title_style))
            story.append(
                Paragraph(
                    escape(transcription_text).replace("\n", "<br/>"),
                    transcription_style,
                )
            )

        if index < len(pages) - 1:
            story.append(PageBreak())

    pdf_document.build(
        story,
        onFirstPage=add_page_chrome,
        onLaterPages=add_page_chrome,
    )

    pdf.seek(0)
    return pdf
