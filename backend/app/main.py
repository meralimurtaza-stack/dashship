from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.data import router as data_router
from app.routes.chat import router as chat_router
from app.routes.generate import router as generate_router
from app.routes.publish import router as publish_router
from app.routes.email import router as email_router
from app.routes.data_review import router as data_review_router

app = FastAPI(title="DashShip API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(data_router)
app.include_router(chat_router)
app.include_router(generate_router)
app.include_router(publish_router)
app.include_router(email_router)
app.include_router(data_review_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
