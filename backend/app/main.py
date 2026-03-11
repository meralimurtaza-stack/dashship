from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.data import router as data_router
from app.routes.chat import router as chat_router
from app.routes.generate import router as generate_router

app = FastAPI(title="DashShip API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(data_router)
app.include_router(chat_router)
app.include_router(generate_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
