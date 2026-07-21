from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.document import DocumentType
from app.models.user import User, UserRole
from app.schemas.misc import DocumentRead
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    eco_id: int | None = Form(None),
    document_group: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER, UserRole.QUALITY)),
):
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File exceeds maximum upload size.")

    return await document_service.upload_document(
        db, file_bytes=contents, file_name=file.filename, content_type=file.content_type,
        document_type=document_type, eco_id=eco_id, document_group=document_group, actor=user,
    )


@router.get("/group/{document_group}/versions", response_model=list[DocumentRead])
async def get_versions(document_group: str, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    return await document_service.get_document_versions(db, document_group)


@router.get("/{document_id}/download")
async def download_document(document_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    document = await document_service.get_document(db, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return FileResponse(document.storage_path, filename=document.file_name, media_type=document.content_type)
