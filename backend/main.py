from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "dev")

app = FastAPI(
    title="EasyFinder AI",
    docs_url="/docs" if APP_ENV != "prod" else None,
    redoc_url=None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from routes.auth import router as auth_router
from routes.nda import router as nda_router
from routes.inventory import router as inventory_router
from routes.demo import router as demo_router
from routes.stripe import router as stripe_router
from routes.billing import router as billing_router
from routes.searches import router as searches_router

app.include_router(auth_router, prefix="/api/auth")
app.include_router(nda_router, prefix="/api/nda")
app.include_router(inventory_router, prefix="/api/inventory")
app.include_router(demo_router, prefix="/api/demo")
app.include_router(stripe_router, prefix="/api/stripe")
app.include_router(billing_router, prefix="/api/billing")
app.include_router(searches_router, prefix="/api/searches")



@app.get("/")
def root():
    return {"status": "EasyFinder AI running"}


@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"status": "ok"}
