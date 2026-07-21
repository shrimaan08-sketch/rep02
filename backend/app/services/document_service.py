import hashlib
import os
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.document import Document, DocumentType
from app.models.user import User
from app.services import audit_service


async def upload_document(
    db: AsyncSession, *, file_bytes: bytes, file_name: str, content_type: str | None,
    document_type: DocumentType, eco_id: int | None, document_group: str | None, actor: User,
) -> Document:
    checksum = hashlib.sha256(file_bytes).hexdigest()
    group = document_group or str(uuid.uuid4())

    version = 1
    if document_group:
        result = await db.execute(
            select(Document).where(Document.document_group == group).order_by(Document.version.desc())
        )
        latest = result.scalars().first()
        if latest:
            version = latest.version + 1

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_name = f"{group}_v{version}_{file_name}"
    storage_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    document = Document(
        document_group=group,
        version=version,
        file_name=file_name,
        storage_path=storage_path,
        content_type=content_type,
        size_bytes=len(file_bytes),
        document_type=document_type,
        checksum_sha256=checksum,
        eco_id=eco_id,
        uploaded_by_id=actor.id,
    )
    db.add(document)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="document.uploaded", entity_type="Document", entity_id=document.id,
        after_state={"file_name": file_name, "version": version, "eco_id": eco_id},
    )
    await db.commit()
    await db.refresh(document)
    return document


async def get_document_versions(db: AsyncSession, document_group: str) -> list[Document]:
    result = await db.execute(
        select(Document).where(Document.document_group == document_group).order_by(Document.version.desc())
    )
    return list(result.scalars().all())


async def get_document(db: AsyncSession, document_id: int) -> Document | None:
    return await db.get(Document, document_id)
