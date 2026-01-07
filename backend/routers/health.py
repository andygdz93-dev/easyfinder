from fastapi import APIRouter
from fastapi import FastAPI

app = FastAPI()

api_router = APIRouter(prefix="/api")

@api_router.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(api_router)