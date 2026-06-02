from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parent / ".env")

from model import predict_price

app = FastAPI()

CACHE_TTL = timedelta(hours=6)
_prediction_cache = {}


def _cache_key(crop: str, mandi: str) -> str:
    return f"{crop.strip().lower()}|{mandi.strip().lower()}"


def _get_cached_prediction(key: str):
    cached = _prediction_cache.get(key)
    if not cached:
        return None
    cached_at, payload = cached
    if datetime.utcnow() - cached_at > CACHE_TTL:
        _prediction_cache.pop(key, None)
        return None
    return payload


def _set_cached_prediction(key: str, payload: dict):
    _prediction_cache[key] = (datetime.utcnow(), payload)


class PredictionRequest(BaseModel):
    crop: str
    mandi: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"status": "ok"}


@app.post("/predict")
def predict(request: PredictionRequest):
    key = _cache_key(request.crop, request.mandi)
    cached = _get_cached_prediction(key)
    if cached:
        return cached

    prediction_date = (datetime.utcnow() + timedelta(days=1)).date().isoformat()

    try:
        predicted_price, lower, upper = predict_price(request.crop, request.mandi)
    except ValueError as exc:
        # Not enough data — don't cache, return clear error
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        # Unexpected error — don't cache, propagate
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    # Only cache and return successful (non-zero) predictions
    payload = {
        "crop": request.crop,
        "mandi": request.mandi,
        "predicted_price": float(predicted_price),
        "predicted_lower": float(lower),
        "predicted_upper": float(upper),
        "prediction_date": prediction_date,
    }
    _set_cached_prediction(key, payload)
    return payload
