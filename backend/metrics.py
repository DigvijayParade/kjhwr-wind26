"""
metrics.py - Wind forecast error metrics: MAE, RMSE, MAPE.
"""
from __future__ import annotations

import math
from collections import defaultdict
from typing import Any


def _safe_mape(actual: float, forecast: float) -> float | None:
    if actual == 0:
        return None
    return abs((forecast - actual) / actual) * 100.0


def calculate_metrics(
    actuals: list[dict[str, Any]],
    forecasts: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Compare actuals vs latest forecasts.

    Parameters
    ----------
    actuals   : list of {startTime, generation}
    forecasts : list of {startTime, publishTime, generation}  (already "latest" filtered)

    Returns
    -------
    {
      mae: float,
      rmse: float,
      mape: float,
      n: int,
      daily: [{date, mae, rmse, mape, n}],
      series: [{startTime, actual, forecast, error}]
    }
    """
    # Build lookup maps
    actual_map: dict[str, float] = {r["startTime"]: r["generation"] for r in actuals}
    forecast_map: dict[str, float] = {r["startTime"]: r["generation"] for r in forecasts}

    # Align on common startTimes
    common_times = sorted(set(actual_map) & set(forecast_map))

    series: list[dict[str, Any]] = []
    daily_errors: dict[str, list] = defaultdict(list)

    for st in common_times:
        actual_val   = actual_map[st]
        forecast_val = forecast_map[st]
        error        = forecast_val - actual_val
        mape_val     = _safe_mape(actual_val, forecast_val)
        date         = st[:10]

        series.append({
            "startTime": st,
            "actual":    round(actual_val, 2),
            "forecast":  round(forecast_val, 2),
            "error":     round(error, 2),
        })
        daily_errors[date].append((actual_val, forecast_val, error, mape_val))

    # Overall metrics
    n = len(series)
    if n == 0:
        return {
            "mae": 0.0, "rmse": 0.0, "mape": 0.0, "n": 0,
            "daily": [], "series": [],
        }

    errors       = [s["error"] for s in series]
    abs_errors   = [abs(e) for e in errors]
    sq_errors    = [e ** 2 for e in errors]
    mape_values  = [
        _safe_mape(actual_map[s["startTime"]], forecast_map[s["startTime"]])
        for s in series
        if _safe_mape(actual_map[s["startTime"]], forecast_map[s["startTime"]]) is not None
    ]

    mae  = sum(abs_errors) / n
    rmse = math.sqrt(sum(sq_errors) / n)
    mape = (sum(mape_values) / len(mape_values)) if mape_values else 0.0

    # Daily metrics
    daily: list[dict[str, Any]] = []
    for date in sorted(daily_errors):
        rows = daily_errors[date]
        d_errs   = [r[2] for r in rows]
        d_mapes  = [r[3] for r in rows if r[3] is not None]
        d_n      = len(rows)
        d_mae    = sum(abs(e) for e in d_errs) / d_n
        d_rmse   = math.sqrt(sum(e ** 2 for e in d_errs) / d_n)
        d_mape   = (sum(d_mapes) / len(d_mapes)) if d_mapes else 0.0
        daily.append({
            "date":  date,
            "mae":   round(d_mae, 2),
            "rmse":  round(d_rmse, 2),
            "mape":  round(d_mape, 2),
            "n":     d_n,
        })

    return {
        "mae":    round(mae, 2),
        "rmse":   round(rmse, 2),
        "mape":   round(mape, 2),
        "n":      n,
        "daily":  daily,
        "series": series,
    }
