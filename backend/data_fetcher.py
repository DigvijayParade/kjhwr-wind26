"""
data_fetcher.py - Elexon BMRS API fetching with disk-based caching.
"""
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR = Path(os.getenv("CACHE_DIR", str(DEFAULT_CACHE_DIR)))
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", str(86400 * 7)))  # 7 days (January 2026 is historical)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
FUELHH_URL  = f"{BASE_URL}/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31"
WINDFOR_URL = f"{BASE_URL}/WINDFOR/stream?publishDateTimeFrom=2025-12-31T00:00:00Z&publishDateTimeTo=2026-02-01T00:00:00Z"

# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{key}.json"


def _read_cache(key: str) -> list[dict] | None:
    p = _cache_path(key)
    if not p.exists():
        return None
    age = time.time() - p.stat().st_mtime
    if age > CACHE_TTL_SECONDS:
        logger.info("Cache expired for %s (age=%.0fs)", key, age)
        return None
    try:
        with p.open(encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("Failed to read cache %s: %s", key, exc)
        return None


def _write_cache(key: str, data: list[dict]) -> None:
    p = _cache_path(key)
    try:
        with p.open("w", encoding="utf-8") as f:
            json.dump(data, f)
        logger.info("Cached %d records to %s", len(data), p)
    except Exception as exc:
        logger.warning("Failed to write cache %s: %s", key, exc)


def _read_stale_cache(key: str) -> list[dict] | None:
    """Return cached data regardless of age (used as fallback when API fails)."""
    p = _cache_path(key)
    if not p.exists():
        return None
    try:
        with p.open(encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Fetch helpers
# ---------------------------------------------------------------------------

async def _fetch_json(url: str) -> list[dict]:
    """Fetch JSON array from a URL with a generous timeout."""
    async with httpx.AsyncClient(timeout=90.0) as client:
        logger.info("Fetching %s", url)
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in ("data", "items", "results"):
                if key in data and isinstance(data[key], list):
                    return data[key]
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fetch_actuals() -> list[dict[str, Any]]:
    """
    Fetch actual wind generation (FUELHH dataset) for January 2026.
    Returns list of {startTime, generation} dicts.
    Filters to fuelType == 'WIND' and January 2026 date window.
    """
    cache_key = "actuals_jan2026"
    cached = _read_cache(cache_key)
    if cached is not None:
        logger.info("Actuals served from cache (%d records)", len(cached))
        return cached

    try:
        raw = await _fetch_json(FUELHH_URL)
    except Exception as exc:
        logger.error("Failed to fetch actuals: %s", exc)
        stale = _read_stale_cache(cache_key)
        if stale is not None:
            logger.warning("Returning stale actuals cache")
            return stale
        raise

    # Normalise and filter
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for rec in raw:
        fuel = rec.get("fuelType", rec.get("fuel_type", ""))
        if str(fuel).upper() != "WIND":
            continue
        start = rec.get("startTime", rec.get("start_time", rec.get("settlementDate", "")))
        gen   = rec.get("generation", rec.get("quantity", 0))
        if start and "2026-01-01" <= start[:10] <= "2026-01-31":
            if start not in seen:
                seen.add(start)
                result.append({"startTime": start, "generation": float(gen or 0)})

    result.sort(key=lambda x: x["startTime"])
    _write_cache(cache_key, result)
    return result


async def fetch_forecasts() -> list[dict[str, Any]]:
    """
    Fetch wind power forecasts (WINDFOR dataset) for January 2026.
    Returns list of {startTime, publishTime, generation} dicts.
    """
    cache_key = "forecasts_jan2026"
    cached = _read_cache(cache_key)
    if cached is not None:
        logger.info("Forecasts served from cache (%d records)", len(cached))
        return cached

    try:
        raw = await _fetch_json(WINDFOR_URL)
    except Exception as exc:
        logger.error("Failed to fetch forecasts: %s", exc)
        stale = _read_stale_cache(cache_key)
        if stale is not None:
            logger.warning("Returning stale forecasts cache")
            return stale
        raise

    result: list[dict[str, Any]] = []
    for rec in raw:
        start   = rec.get("startTime", rec.get("start_time", ""))
        publish = rec.get("publishTime", rec.get("publish_time", rec.get("createdTime", "")))
        gen     = rec.get("generation", rec.get("quantity", rec.get("windForecast", 0)))
        if start and "2026-01-01" <= start[:10] <= "2026-01-31":
            result.append({
                "startTime":   start,
                "publishTime": publish or "",
                "generation":  float(gen or 0),
            })

    result.sort(key=lambda x: (x["startTime"], x["publishTime"]))
    _write_cache(cache_key, result)
    return result


async def get_latest_forecasts() -> list[dict[str, Any]]:
    """
    For each startTime, return the forecast with the latest publishTime.
    """
    forecasts = await fetch_forecasts()
    best: dict[str, dict] = {}
    for rec in forecasts:
        st = rec["startTime"]
        if st not in best or rec["publishTime"] > best[st]["publishTime"]:
            best[st] = rec
    result = sorted(best.values(), key=lambda x: x["startTime"])
    return result


async def get_forecast_by_vintage(publish_before: str) -> list[dict[str, Any]]:
    """
    Return the most recent forecast for each startTime that was published
    strictly before `publish_before` (ISO datetime string).
    """
    forecasts = await fetch_forecasts()
    best: dict[str, dict] = {}
    for rec in forecasts:
        if rec["publishTime"] and rec["publishTime"] <= publish_before:
            st = rec["startTime"]
            if st not in best or rec["publishTime"] > best[st]["publishTime"]:
                best[st] = rec
    return sorted(best.values(), key=lambda x: x["startTime"])


async def get_forecast_vintages() -> list[dict[str, Any]]:
    """
    Return available publish times grouped by target date.
    """
    forecasts = await fetch_forecasts()
    grouped: dict[str, set] = {}
    for rec in forecasts:
        st = rec["startTime"]
        pt = rec["publishTime"]
        if not st or not pt:
            continue
        date = st[:10]  # YYYY-MM-DD
        grouped.setdefault(date, set()).add(pt)

    result = [
        {"targetDate": date, "publishTimes": sorted(pts)}
        for date, pts in sorted(grouped.items())
    ]
    return result
