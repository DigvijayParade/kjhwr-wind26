"""
main.py - FastAPI application for Wind Power Forecasting Dashboard.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from data_fetcher import (
    fetch_actuals,
    get_forecast_by_vintage,
    get_forecast_vintages,
    get_latest_forecasts,
)
from metrics import calculate_metrics

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Wind Power Forecasting API",
    description="Serves Elexon BMRS wind generation forecasts and accuracy metrics for January 2026.",
    version="1.0.0",
)

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health() -> dict[str, str]:
    """Health check."""
    return {"status": "ok"}


@app.get("/api/actuals")
async def actuals() -> list[dict[str, Any]]:
    """
    Returns actual wind generation for January 2026.
    Each item: {startTime, generation}
    """
    try:
        data = await fetch_actuals()
    except Exception as exc:
        logger.error("actuals endpoint error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data


@app.get("/api/forecast/latest")
async def forecast_latest() -> list[dict[str, Any]]:
    """
    Returns the most recent forecast for each 30-min settlement period in January 2026.
    Each item: {startTime, generation, publishTime}
    """
    try:
        data = await get_latest_forecasts()
    except Exception as exc:
        logger.error("forecast/latest endpoint error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data


@app.get("/api/metrics")
async def metrics() -> dict[str, Any]:
    """
    Calculates MAE, RMSE, MAPE comparing actuals vs latest forecasts.
    Response: {mae, rmse, mape, n, daily: [...], series: [...]}
    """
    try:
        act  = await fetch_actuals()
        fcst = await get_latest_forecasts()
    except Exception as exc:
        logger.error("metrics endpoint error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")

    result = calculate_metrics(act, fcst)
    return result


@app.get("/api/forecast/vintages")
async def forecast_vintages() -> list[dict[str, Any]]:
    """
    Returns available forecast publish times (vintages) grouped by target date.
    Response: [{targetDate, publishTimes: [...]}]
    """
    try:
        data = await get_forecast_vintages()
    except Exception as exc:
        logger.error("forecast/vintages endpoint error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data


@app.get("/api/forecast/by-vintage")
async def forecast_by_vintage(
    publishBefore: str = Query(..., description="ISO datetime – return latest forecast published before this time"),
) -> list[dict[str, Any]]:
    """
    Returns the forecast for each startTime using the most recent forecast
    published strictly before `publishBefore`.
    """
    try:
        data = await get_forecast_by_vintage(publishBefore)
    except Exception as exc:
        logger.error("forecast/by-vintage endpoint error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data
