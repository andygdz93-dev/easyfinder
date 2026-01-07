from fastapi import APIRouter, Header

router = APIRouter()

@router.get("/mode")
def demo_mode(x_demo_mode: str = Header(default="enterprise")):
    return {
        "mode": x_demo_mode,
        "features": "limited" if x_demo_mode == "investor" else "full"
    }
