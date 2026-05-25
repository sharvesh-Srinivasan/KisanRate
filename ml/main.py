from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parent / ".env")

from model import predict_price

app = FastAPI()


class PredictionRequest(BaseModel):
    crop: str
    mandi: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(request: PredictionRequest):
    predicted_price, lower, upper = predict_price(request.crop, request.mandi)
    prediction_date = (datetime.utcnow() + timedelta(days=1)).date().isoformat()
    return {
        "crop": request.crop,
        "mandi": request.mandi,
        "predicted_price": float(predicted_price),
        "predicted_lower": float(lower),
        "predicted_upper": float(upper),
        "prediction_date": prediction_date,
    }
