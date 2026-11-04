"""
main.py - FastAPI application for Wind Power Forecasting Dashboard.
Supports both January 2026 (assignment scope) and Live Today real-time data.
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
    title="AeroCast UK - Wind Power Forecasting API",
    description="Serves Elexon BMRS wind generation forecasts and accuracy metrics for January 2026 & Live Grid.",
    version="2.0.0",
)

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:5173", "http://localhost:3000", "*"],
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
    return {"status": "ok", "app": "AeroCast UK"}


@app.get("/api/actuals")
async def actuals(
    scope: str = Query("jan2026", description="jan2026 or live"),
) -> list[dict[str, Any]]:
    """
    Returns actual wind generation (FUELHH dataset).
    scope='jan2026': January 2026 (challenge scope).
    scope='live': Real-time outturn for today.
    """
    try:
        data = await fetch_actuals(scope)
    except Exception as exc:
        logger.error("actuals endpoint error (%s): %s", scope, exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data


@app.get("/api/forecast/latest")
async def forecast_latest(
    scope: str = Query("jan2026", description="jan2026 or live"),
) -> list[dict[str, Any]]:
    """
    Returns the most recent forecast for each period (WINDFOR dataset).
    scope='jan2026' or 'live'.
    """
    try:
        data = await get_latest_forecasts(scope)
    except Exception as exc:
        logger.error("forecast/latest endpoint error (%s): %s", scope, exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data


@app.get("/api/metrics")
async def metrics(
    scope: str = Query("jan2026", description="jan2026 or live"),
) -> dict[str, Any]:
    """
    Calculates MAE, RMSE, MAPE comparing actuals vs latest forecasts.
    """
    try:
        act  = await fetch_actuals(scope)
        fcst = await get_latest_forecasts(scope)
    except Exception as exc:
        logger.error("metrics endpoint error (%s): %s", scope, exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")

    result = calculate_metrics(act, fcst)
    return result


@app.get("/api/forecast/vintages")
async def forecast_vintages(
    scope: str = Query("jan2026", description="jan2026 or live"),
) -> list[dict[str, Any]]:
    """
    Returns available forecast publish times (vintages) grouped by target date.
    """
    try:
        data = await get_forecast_vintages(scope)
    except Exception as exc:
        logger.error("forecast/vintages endpoint error (%s): %s", scope, exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data


@app.get("/api/forecast/by-vintage")
async def forecast_by_vintage(
    publishBefore: str = Query(..., description="ISO datetime"),
    scope: str = Query("jan2026", description="jan2026 or live"),
) -> list[dict[str, Any]]:
    """
    Returns the forecast for each startTime published strictly before `publishBefore`.
    """
    try:
        data = await get_forecast_by_vintage(publishBefore, scope)
    except Exception as exc:
        logger.error("forecast/by-vintage endpoint error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Upstream data unavailable: {exc}")
    return data
