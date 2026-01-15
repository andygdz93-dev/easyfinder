from ctypes import Union
from fastapi import APIRouter, Depends
from core.deps import get_current_user

router = APIRouter(tags=["Auth"])


@router.get("/me")
def me(current_user: Union[dict, None] = Depends(get_current_user)):
    return current_user



