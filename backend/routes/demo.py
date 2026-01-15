from fastapi import APIRouter

router = APIRouter(tags=["Demo"])

@router.get("/mode")
def demo_mode():
    return {"demo": True}
