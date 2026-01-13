from fastapi import APIRouter

router = APIRouter(tags=["NDA"])


@router.post("/upload")
def upload_nda():
    return {"status": "NDA uploaded"}


@router.get("/status/{nda_id}")
def nda_status(nda_id: str):
    return {"nda_id": nda_id, "status": "approved"}
