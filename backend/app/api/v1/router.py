from fastapi import APIRouter

from app.api.v1.endpoints import (
    audit,
    auth,
    documents,
    ecos,
    ecrs,
    parts,
    reports,
    search,
    suppliers,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(parts.router)
api_router.include_router(ecrs.router)
api_router.include_router(ecos.router)
api_router.include_router(documents.router)
api_router.include_router(suppliers.router)
api_router.include_router(audit.router)
api_router.include_router(search.router)
api_router.include_router(reports.router)
