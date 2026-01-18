from fastapi import APIRouter, Depends
from core.deps import require_scope
from repositories.searches import (
    create_search,
    get_searches,
    delete_search,
)

router = APIRouter(tags=["Searches"])

@router.post("/")
async def save_search(
    body: dict,
    user=Depends(require_scope("saved_searches"))
):
    return await create_search(
        user_id=user["sub"],
        name=body["name"],
        filters=body["filters"],
    )

@router.get("/")
async def list_searches(user=Depends(require_scope("saved_searches"))):
    return await get_searches(user["sub"])

@router.delete("/{search_id}")
async def remove_search(
    search_id: str,
    user=Depends(require_scope("saved_searches"))
):
    await delete_search(user["sub"], search_id)
    return {"ok": True}
