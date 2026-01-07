from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid

router = APIRouter()

SIGNED_NDAS = set()

@router.post("/upload")
async def upload_nda(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF only")

    nda_id = str(uuid.uuid4())
    SIGNED_NDAS.add(nda_id)

    return {
        "status": "uploaded",
        "nda_id": nda_id,
        "next": "DocuSign triggered"
    }

@router.get("/status/{nda_id}")
def nda_status(nda_id: str):
    return {"signed": nda_id in SIGNED_NDAS}
