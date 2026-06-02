import os
from datetime import datetime, timedelta

import mysql.connector
import numpy as np
import pandas as pd
from prophet import Prophet


def get_connection():
    db_host = os.getenv("DB_HOST")
    if not db_host or db_host.strip() == "":
        raise ValueError("DB_HOST is missing! Please configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in Render Environment Variables.")

    return mysql.connector.connect(
        host=db_host,
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT", "3306")),
        connection_timeout=5
    )


def fetch_price_history(crop_name: str, mandi_name: str):
    query = (
        "SELECT p.price_date, p.modal_price "
        "FROM prices p "
        "JOIN crops c ON p.crop_id = c.id "
        "JOIN mandis m ON p.mandi_id = m.id "
        "WHERE c.name = %s AND m.name = %s "
        "ORDER BY p.price_date DESC "
        "LIMIT 90"
    )

    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (crop_name, mandi_name))
        rows = cursor.fetchall()
    finally:
        conn.close()

    rows.reverse()
    return rows


def predict_price(crop_name: str, mandi_name: str):
    rows = fetch_price_history(crop_name, mandi_name)
    if not rows:
        raise ValueError(f"No price history found for crop='{crop_name}', mandi='{mandi_name}'")

    prices = [float(row["modal_price"]) for row in rows if row["modal_price"]]
    if not prices:
        raise ValueError(f"All modal_price values are null/zero for crop='{crop_name}', mandi='{mandi_name}'")

    average = float(np.mean(prices))
    if len(prices) < 14:
        # Not enough data for Prophet — return simple average as best estimate
        return average, average * 0.95, average * 1.05

    df = pd.DataFrame(
        {
            "ds": [row["price_date"] for row in rows],
            "y": prices,
        }
    )

    df["ds"] = pd.to_datetime(df["ds"])

    try:
        model = Prophet(daily_seasonality=False, yearly_seasonality=False, uncertainty_samples=50)
        model.fit(df)

        future = model.make_future_dataframe(periods=7)
        forecast = model.predict(future)
        next_day = forecast.tail(1).iloc[0]
        predicted = float(next_day["yhat"])
        lower = float(next_day.get("yhat_lower", predicted))
        upper = float(next_day.get("yhat_upper", predicted))
        return predicted, lower, upper
    except Exception as error:
        print(f"Prophet failed: {error}")
        return average, average, average
