from fastapi import APIRouter, UploadFile, HTTPException
from datetime import datetime
import os
import uuid

router = APIRouter()

NDA_DIR = "backend/storage/ndas"
os.makedirs(NDA_DIR, exist_ok=True)

@router.post("/nda/upload")
def upload_nda(file: UploadFile):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF NDAs allowed")

    nda_id = str(uuid.uuid4())
    path = f"{NDA_DIR}/{nda_id}.pdf"

    with open(path, "wb") as f:
        f.write(file.file.read())

    return {
        "nda_id": nda_id,
        "status": "uploaded",
        "next": "signature_required"
    }

@router.post("/nda/signed")
def nda_signed(email: str):
    # This is what DocuSign / HelloSign would call
    return {
        "email": email,
        "signed": True,
        "signed_at": datetime.utcnow()
    }
