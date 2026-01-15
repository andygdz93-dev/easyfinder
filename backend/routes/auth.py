from fastapi import APIRouter, Depends
from core.deps import get_current_user

router = APIRouter(tags=["Auth"])


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user

@router.post("/login")
def login():
    """
    Mock login endpoint.
    In production:
    - Validate user credentials
    - Generate and return JWT token
    """
    return {"access_token": token,}
