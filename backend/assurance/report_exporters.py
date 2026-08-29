import os
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from ..schemas import AssuranceReport

_TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "j2"]),
)


def render_html_report(report: AssuranceReport) -> str:
    """Renders the assurance report to a single, self-contained HTML
    document (inline CSS, no external assets) using a local Jinja2
    template -- no network access, no external renderer."""
    template = _env.get_template("report.html.j2")
    return template.render(report=report)


def render_pdf_report(report: AssuranceReport) -> bytes:
    """Renders the assurance report to PDF using reportlab (pure Python,
    no system-level rendering dependencies such as Cairo/Pango), so it
    works in an air-gapped environment with only pre-provisioned wheels."""
    import io
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        PageBreak,
    )

    def _enum_val(v: Any) -> str:
        return v.value if hasattr(v, "value") else str(v)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    h2_style = styles["Heading2"]
    body_style = ParagraphStyle("body_small", parent=styles["BodyText"], fontSize=8, leading=10)
    meta_style = ParagraphStyle("meta", parent=styles["BodyText"], fontSize=9, textColor=colors.grey)

    disposition_colors = {"ACCEPT": colors.HexColor("#1b7f3a"), "REVIEW": colors.HexColor("#b8860b"), "QUARANTINE": colors.HexColor("#b3261e")}
    severity_colors = {"CRITICAL": colors.HexColor("#b3261e"), "HIGH": colors.HexColor("#c1440e"), "MEDIUM": colors.HexColor("#b8860b"), "LOW": colors.HexColor("#1b7f3a")}

    story = []
    story.append(Paragraph("IntelX Assurance Report", title_style))
    story.append(Paragraph(
        f"Report ID: {report.report_id} &nbsp;|&nbsp; Generated: {report.generated_at} &nbsp;|&nbsp; "
        f"Problem Statement {report.problem_statement_id} &nbsp;|&nbsp; {report.organization}",
        meta_style,
    ))
    story.append(Spacer(1, 8))

    disposition = _enum_val(report.overall_disposition)
    disp_style = ParagraphStyle("disp", parent=styles["Heading2"], textColor=disposition_colors.get(disposition, colors.black))
    story.append(Paragraph(f"Overall Disposition: {disposition} (risk score {report.overall_risk_score:.1f}/100)", disp_style))
    status_rows = [
        ["Dataset", report.dataset_assurance_status],
        ["Model", report.model_assurance_status],
        ["Inference Provenance", report.inference_provenance_status],
        ["Distribution Shift", report.distribution_shift_status],
        ["Audit Chain", "VALID" if report.audit_chain_valid else "INVALID"],
    ]
    t = Table(status_rows, colWidths=[55 * mm, 100 * mm])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 8), ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke)]))
    story.append(Spacer(1, 6))
    story.append(t)
    story.append(Spacer(1, 10))

    story.append(Paragraph(f"Findings ({len(report.findings)})", h2_style))
    if report.findings:
        rows = [["ID", "Asset", "Type", "Sev.", "Conf.", "Reason", "Action"]]
        for f in report.findings:
            rows.append([
                f.finding_id, f.asset[:22], f.finding_type,
                _enum_val(f.severity), f"{f.confidence:.2f}",
                Paragraph(f.reason, body_style),
                _enum_val(f.recommended_action),
            ])
        ft = Table(rows, colWidths=[22 * mm, 22 * mm, 26 * mm, 14 * mm, 12 * mm, 62 * mm, 22 * mm], repeatRows=1)
        style_cmds = [
            ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
        for i, f in enumerate(report.findings, start=1):
            sev = _enum_val(f.severity)
            if sev in severity_colors:
                style_cmds.append(("TEXTCOLOR", (3, i), (3, i), severity_colors[sev]))
        ft.setStyle(TableStyle(style_cmds))
        story.append(ft)
    else:
        story.append(Paragraph("No findings recorded.", body_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Coverage Statement", h2_style))
    cov_rows = [["Attack Class", "Status", "Validation Method"]]
    for c in report.coverage_statements:
        cov_rows.append([c.attack_class, _enum_val(c.status), Paragraph(c.validation_method, body_style)])
    ct = Table(cov_rows, colWidths=[45 * mm, 22 * mm, 90 * mm], repeatRows=1)
    ct.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.3, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke), ("FONTSIZE", (0, 0), (-1, -1), 7.5)]))
    story.append(ct)

    story.append(PageBreak())
    story.append(Paragraph("Assumptions", h2_style))
    for a in report.assumptions:
        story.append(Paragraph(f"&bull; {a}", body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Limitations", h2_style))
    for l in report.limitations:
        story.append(Paragraph(f"&bull; {l}", body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Audit chain digest: {report.audit_chain_digest}", meta_style))

    doc.build(story)
    return buf.getvalue()
