"""
data_fetcher.py - Elexon BMRS API fetching with disk-based caching.
Supports both January 2026 (challenge scope) and real-time Live Grid data (today).
"""
import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants & URLs
# ---------------------------------------------------------------------------
DEFAULT_CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR = Path(os.getenv("CACHE_DIR", str(DEFAULT_CACHE_DIR)))

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

# January 2026 Scope (Historical Benchmark)
JAN_FUELHH_URL  = f"{BASE_URL}/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31"
JAN_WINDFOR_URL = f"{BASE_URL}/WINDFOR/stream?publishDateTimeFrom=2025-12-31T00:00:00Z&publishDateTimeTo=2026-02-01T00:00:00Z"

# Live Scope (Real-time Outturn & Forecasts for Today)
LIVE_FUELHH_URL  = f"{BASE_URL}/FUELHH/stream"
LIVE_WINDFOR_URL = f"{BASE_URL}/WINDFOR/stream"

# Cache TTLs
HISTORICAL_TTL = 86400 * 30  # 30 days for January 2026
LIVE_TTL = 300               # 5 minutes for live streaming data

# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{key}.json"


def _read_cache(key: str, max_age: int) -> list[dict] | None:
    p = _cache_path(key)
    if not p.exists():
        return None
    age = time.time() - p.stat().st_mtime
    if age > max_age:
        logger.info("Cache expired for %s (age=%.0fs, max=%.0fs)", key, age, max_age)
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
    """Fetch JSON array from Elexon BMRS endpoint."""
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

async def fetch_actuals(scope: str = "jan2026") -> list[dict[str, Any]]:
    """
    Fetch actual wind generation (FUELHH dataset).
    scope="jan2026": All 31 days of January 2026.
    scope="live": Real-time UK grid wind outturn for today.
    """
    is_live = (scope == "live")
    cache_key = "actuals_live" if is_live else "actuals_jan2026"
    ttl = LIVE_TTL if is_live else HISTORICAL_TTL

    cached = _read_cache(cache_key, ttl)
    if cached is not None:
        logger.info("Actuals (%s) served from cache (%d records)", scope, len(cached))
        return cached

    url = LIVE_FUELHH_URL if is_live else JAN_FUELHH_URL
    try:
        raw = await _fetch_json(url)
    except Exception as exc:
        logger.error("Failed to fetch actuals (%s): %s", scope, exc)
        stale = _read_stale_cache(cache_key)
        if stale is not None:
            logger.warning("Returning stale actuals cache for %s", scope)
            return stale
        raise

    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for rec in raw:
        fuel = rec.get("fuelType", rec.get("fuel_type", ""))
        if str(fuel).upper() != "WIND":
            continue
        start = rec.get("startTime", rec.get("start_time", rec.get("settlementDate", "")))
        gen   = rec.get("generation", rec.get("quantity", 0))

        if not start:
            continue

        if not is_live and not ("2026-01-01" <= start[:10] <= "2026-01-31"):
            continue

        if start not in seen:
            seen.add(start)
            result.append({"startTime": start, "generation": float(gen or 0)})

    result.sort(key=lambda x: x["startTime"])
    _write_cache(cache_key, result)
    return result


async def fetch_forecasts(scope: str = "jan2026") -> list[dict[str, Any]]:
    """
    Fetch wind forecasts (WINDFOR dataset).
    scope="jan2026": January 2026 forecasts.
    scope="live": Real-time live forecasts for today/tomorrow.
    """
    is_live = (scope == "live")
    cache_key = "forecasts_live" if is_live else "forecasts_jan2026"
    ttl = LIVE_TTL if is_live else HISTORICAL_TTL

    cached = _read_cache(cache_key, ttl)
    if cached is not None:
        logger.info("Forecasts (%s) served from cache (%d records)", scope, len(cached))
        return cached

    url = LIVE_WINDFOR_URL if is_live else JAN_WINDFOR_URL
    try:
        raw = await _fetch_json(url)
    except Exception as exc:
        logger.error("Failed to fetch forecasts (%s): %s", scope, exc)
        stale = _read_stale_cache(cache_key)
        if stale is not None:
            logger.warning("Returning stale forecasts cache for %s", scope)
            return stale
        raise

    result: list[dict[str, Any]] = []
    for rec in raw:
        start   = rec.get("startTime", rec.get("start_time", ""))
        publish = rec.get("publishTime", rec.get("publish_time", rec.get("createdTime", "")))
        gen     = rec.get("generation", rec.get("quantity", rec.get("windForecast", 0)))

        if not start:
            continue

        if not is_live and not ("2026-01-01" <= start[:10] <= "2026-01-31"):
            continue

        result.append({
            "startTime":   start,
            "publishTime": publish or "",
            "generation":  float(gen or 0),
        })

    result.sort(key=lambda x: (x["startTime"], x["publishTime"]))
    _write_cache(cache_key, result)
    return result


async def get_latest_forecasts(scope: str = "jan2026") -> list[dict[str, Any]]:
    """
    For each startTime, return the forecast with the latest publishTime.
    """
    forecasts = await fetch_forecasts(scope)
    best: dict[str, dict] = {}
    for rec in forecasts:
        st = rec["startTime"]
        if st not in best or rec["publishTime"] > best[st]["publishTime"]:
            best[st] = rec
    return sorted(best.values(), key=lambda x: x["startTime"])


async def get_forecast_by_vintage(publish_before: str, scope: str = "jan2026") -> list[dict[str, Any]]:
    """
    Return the most recent forecast for each startTime that was published
    strictly before `publish_before`.
    """
    forecasts = await fetch_forecasts(scope)
    best: dict[str, dict] = {}
    for rec in forecasts:
        if rec["publishTime"] and rec["publishTime"] <= publish_before:
            st = rec["startTime"]
            if st not in best or rec["publishTime"] > best[st]["publishTime"]:
                best[st] = rec
    return sorted(best.values(), key=lambda x: x["startTime"])


async def get_forecast_vintages(scope: str = "jan2026") -> list[dict[str, Any]]:
    """
    Return available publish times grouped by target date.
    """
    forecasts = await fetch_forecasts(scope)
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
