"""
Seeds initial data into an already-migrated database.

Schema is owned entirely by Alembic migrations; this module only inserts
rows. It is invoked by the container entrypoint after `alembic upgrade head`
(and can be run manually via `python -m app.db.seed`). It is idempotent:
re-running never duplicates the admin user or demo data.

The initial admin credentials can be overridden with environment variables
(SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD) so a production deploy can create a
real first account instead of the well-known demo default.
"""
import asyncio
import logging
import os

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models import *  # noqa: F401,F403
from app.models.document import Supplier
from app.models.part import BOM, BOMItem, Part, PartRevision, PartStatus, PartType
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("revion.seed")

DEFAULT_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@revion.app")
DEFAULT_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "ChangeMe123!")
# Demo role accounts are only seeded when explicitly enabled; production
# deployments typically want just the admin account.
SEED_DEMO_ACCOUNTS = os.getenv("SEED_DEMO_ACCOUNTS", "true").lower() == "true"


async def seed_admin_user() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == DEFAULT_ADMIN_EMAIL))
        if result.scalar_one_or_none():
            logger.info("Admin user already exists, skipping seed.")
            return

        admin = User(
            email=DEFAULT_ADMIN_EMAIL,
            full_name="Platform Administrator",
            hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            department="IT",
            title="System Administrator",
            is_active=True,
        )
        db.add(admin)

        if SEED_DEMO_ACCOUNTS:
            demo_users = [
                ("engineer@revion.app", "Erin Engineer", UserRole.ENGINEER, "Engineering"),
                ("quality@revion.app", "Quinn Quality", UserRole.QUALITY, "Quality Assurance"),
                ("mfg@revion.app", "Max Manufacturing", UserRole.MANUFACTURING, "Manufacturing"),
                ("procurement@revion.app", "Priya Procurement", UserRole.PROCUREMENT, "Procurement"),
                ("management@revion.app", "Morgan Manager", UserRole.APPROVER, "Management"),
            ]
            for email, name, role, dept in demo_users:
                db.add(
                    User(
                        email=email, full_name=name, role=role, department=dept,
                        hashed_password=hash_password("ChangeMe123!"), is_active=True,
                    )
                )

        await db.commit()
        if SEED_DEMO_ACCOUNTS:
            logger.info("Seeded admin account (%s) and demo role accounts.", DEFAULT_ADMIN_EMAIL)
            logger.warning(
                "SECURITY: default seed passwords are 'ChangeMe123!' for all seeded accounts. "
                "Rotate these immediately in any non-local environment."
            )
        else:
            logger.info("Seeded admin account (%s). Demo accounts disabled.", DEFAULT_ADMIN_EMAIL)


async def seed_demo_domain_data() -> None:
    """Seeds a small, realistic parts catalog with a BOM and a supplier so
    the platform is immediately explorable after `docker compose up`,
    rather than presenting an empty shell. Idempotent: skipped entirely if
    any demo part already exists."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Part).where(Part.part_number == "ASM-1000"))
        if result.scalar_one_or_none():
            logger.info("Demo domain data already present, skipping seed.")
            return

        admin_result = await db.execute(select(User).where(User.email == DEFAULT_ADMIN_EMAIL))
        admin = admin_result.scalar_one_or_none()
        if admin is None:
            logger.warning("Admin user not found; skipping demo domain data seed.")
            return

        def make_part(number: str, name: str, part_type: PartType, cost: float) -> Part:
            part = Part(part_number=number, name=name, part_type=part_type, standard_cost=cost)
            db.add(part)
            return part

        bracket = make_part("BRK-2001", "Motor Mount Bracket", PartType.COMPONENT, 4.25)
        fastener = make_part("FST-0007", "M4x12 Socket Head Screw", PartType.RAW_MATERIAL, 0.08)
        motor = make_part("MOT-3300", "12V DC Gear Motor", PartType.COMPONENT, 18.50)
        subassy = make_part("SUB-4400", "Drive Subassembly", PartType.SUBASSEMBLY, 0.0)
        final = make_part("FIN-5000", "Conveyor Drive Unit", PartType.FINISHED_GOOD, 0.0)
        await db.flush()

        revisions: dict[str, PartRevision] = {}
        for part, spec in [
            (bracket, "6061-T6 aluminum, 3mm wall, anodized clear."),
            (fastener, "Stainless steel A2-70, ISO 4762."),
            (motor, "12V 100RPM, 6mm D-shaft, JST-XH connector."),
            (subassy, "Motor + bracket + fasteners, torque to 2.5 N·m."),
            (final, "Complete drive unit including mounting subassembly."),
        ]:
            rev = PartRevision(part_id=part.id, revision_code="A", is_released=True, specification=spec,
                                change_summary="Initial released revision.")
            db.add(rev)
            revisions[part.part_number] = rev
        await db.flush()

        for part, rev in [(bracket, revisions["BRK-2001"]), (fastener, revisions["FST-0007"]),
                           (motor, revisions["MOT-3300"]), (subassy, revisions["SUB-4400"]),
                           (final, revisions["FIN-5000"])]:
            part.current_revision_id = rev.id
            part.status = PartStatus.ACTIVE

        subassy_bom = BOM(parent_part_id=subassy.id, parent_revision_id=revisions["SUB-4400"].id,
                           name="Drive Subassembly BOM")
        db.add(subassy_bom)
        await db.flush()
        db.add_all([
            BOMItem(bom_id=subassy_bom.id, line_number=1, child_part_id=bracket.id,
                    child_revision_id=revisions["BRK-2001"].id, quantity_per=1, find_number="10"),
            BOMItem(bom_id=subassy_bom.id, line_number=2, child_part_id=motor.id,
                    child_revision_id=revisions["MOT-3300"].id, quantity_per=1, find_number="20"),
            BOMItem(bom_id=subassy_bom.id, line_number=3, child_part_id=fastener.id,
                    child_revision_id=revisions["FST-0007"].id, quantity_per=4, find_number="30"),
        ])

        final_bom = BOM(parent_part_id=final.id, parent_revision_id=revisions["FIN-5000"].id,
                         name="Conveyor Drive Unit BOM")
        db.add(final_bom)
        await db.flush()
        db.add(BOMItem(bom_id=final_bom.id, line_number=1, child_part_id=subassy.id,
                        child_revision_id=revisions["SUB-4400"].id, quantity_per=1, find_number="10"))

        db.add(Supplier(
            name="Precision Components Inc.", contact_email="sales@precisioncomponents.example",
            contact_name="Dana Ortiz", phone="+1-555-0142",
            notes="Primary supplier for machined brackets and fasteners.",
        ))

        await db.commit()
        logger.info("Seeded demo parts catalog, BOM structure, and a sample supplier.")


async def main() -> None:
    # NOTE: schema creation is owned by Alembic migrations (run separately in
    # the entrypoint via `alembic upgrade head`). This module only seeds data
    # into an already-migrated database, so it never calls create_all().
    await seed_admin_user()
    await seed_demo_domain_data()


if __name__ == "__main__":
    asyncio.run(main())
