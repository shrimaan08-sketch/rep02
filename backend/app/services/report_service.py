"""
Aggregate metrics for dashboards, plus CSV/PDF export of ECO registers for
audits and management review meetings.
"""
import csv
import io

from reportlab.lib.pagesizes import letter
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eco import ECO, ECOStatus


async def dashboard_metrics(db: AsyncSession) -> dict:
    eco_counts = await db.execute(select(ECO.status, func.count()).group_by(ECO.status))
    ecr_counts = await db.execute(select(ECR.status, func.count()).group_by(ECR.status))
    part_counts = await db.execute(select(Part.status, func.count()).group_by(Part.status))

    open_ecos_result = await db.execute(
        select(func.count()).select_from(ECO).where(
            ECO.status.in_([ECOStatus.PENDING_APPROVAL, ECOStatus.IN_REVIEW, ECOStatus.APPROVED])
        )
    )
    avg_cycle_result = await db.execute(
        select(func.avg(func.extract("epoch", ECO.updated_at - ECO.created_at)))
        .where(ECO.status.in_([ECOStatus.IMPLEMENTED, ECOStatus.CLOSED]))
    )
    avg_seconds = avg_cycle_result.scalar_one_or_none()

    return {
        "eco_by_status": {status.value: count for status, count in eco_counts.all()},
        "ecr_by_status": {status.value: count for status, count in ecr_counts.all()},
        "part_by_status": {status.value: count for status, count in part_counts.all()},
        "open_ecos": open_ecos_result.scalar_one(),
        "average_eco_cycle_time_days": round(avg_seconds / 86400, 1) if avg_seconds else None,
    }


async def export_eco_register_csv(db: AsyncSession) -> str:
    result = await db.execute(select(ECO).order_by(ECO.created_at.desc()))
    ecos = result.scalars().all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["ECO Number", "Title", "Class", "Status", "Effectivity Date", "Cost Impact", "Created"])
    for eco in ecos:
        writer.writerow([
            eco.eco_number, eco.title, eco.eco_class.value, eco.status.value,
            eco.effectivity_date or "", eco.estimated_cost_impact or "", eco.created_at.isoformat(),
        ])
    return buffer.getvalue()


async def export_eco_register_pdf(db: AsyncSession) -> bytes:
    result = await db.execute(select(ECO).order_by(ECO.created_at.desc()).limit(200))
    ecos = result.scalars().all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = [Paragraph("Engineering Change Order Register", styles["Title"]), Spacer(1, 12)]

    data = [["ECO #", "Title", "Class", "Status", "Effectivity"]]
    for eco in ecos:
        data.append([eco.eco_number, eco.title[:40], eco.eco_class.value, eco.status.value, eco.effectivity_date or ""])

    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f5f8")]),
        ])
    )
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()
