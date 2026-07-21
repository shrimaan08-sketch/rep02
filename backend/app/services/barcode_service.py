"""
Generates QR codes and Code128 barcodes for parts and ECOs, so they can be
printed on travelers, bins, and change-order cover sheets for shop-floor
scanning. Images are written to disk under UPLOAD_DIR/codes and the
relative path is persisted on the owning record.
"""
import io
import os

import barcode
import qrcode
from barcode.writer import ImageWriter

from app.core.config import settings

CODES_DIR = os.path.join(settings.UPLOAD_DIR, "codes")


def _ensure_dir() -> None:
    os.makedirs(CODES_DIR, exist_ok=True)


def generate_qr_code(payload: str, filename: str) -> str:
    """Generates a QR code encoding `payload` (typically a deep link like
    https://eco.internal/eco/ECO-2026-000042) and returns the storage path."""
    _ensure_dir()
    img = qrcode.make(payload)
    path = os.path.join(CODES_DIR, f"{filename}_qr.png")
    img.save(path)
    return path


def generate_barcode(code_value: str, filename: str) -> str:
    """Generates a Code128 linear barcode for the given identifier (part
    number or ECO number) and returns the storage path (without extension,
    python-barcode appends .png)."""
    _ensure_dir()
    code128 = barcode.get_barcode_class("code128")
    instance = code128(code_value, writer=ImageWriter())
    path_no_ext = os.path.join(CODES_DIR, f"{filename}_barcode")
    full_path = instance.save(path_no_ext)
    return full_path


def generate_qr_bytes(payload: str) -> bytes:
    """In-memory QR generation for API responses that stream the image
    directly rather than reading it back off disk."""
    img = qrcode.make(payload)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
