from fastapi import APIRouter, Depends
from core.deps import get_current_user

router = APIRouter(tags=["Auth"])


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
