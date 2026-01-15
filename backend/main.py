from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.nda import router as nda_router
from routes.inventory import router as inventory_router
from routes.demo import router as demo_router
from dotenv import load_dotenv
import os

APP_ENV = os.getenv("APP_ENV", "dev")

load_dotenv()

app = FastAPI(
    title="EasyFinder AI",
    docs_url="/docs" if APP_ENV != "prod" else None,
    redoc_url=None,
)

# CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTERS (PREFIX ONLY HERE)
app.include_router(auth_router, prefix="/api/auth")
app.include_router(nda_router, prefix="/api/nda")
app.include_router(inventory_router, prefix="/api/inventory")
app.include_router(demo_router, prefix="/api/demo")



@app.get("/")
def root():
    return {"status": "EasyFinder AI running"}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"status": "ok"}
