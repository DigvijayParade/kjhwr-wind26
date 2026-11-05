# 🌬️ AeroCast UK — Wind Power Day-Ahead Forecasting & Procurement Desk

A full-stack software application tailored for a **UK Energy Utility's Day-Ahead Trading Desk**. It empowers energy procurement managers to monitor latest renewable wind power generation forecasts, quantify historical prediction errors (MAE, RMSE, MAPE), and accurately calculate how much thermal power to buy to balance Great Britain's electricity grid.

> **Note on AI Tools:** Developed with AI assistance using **Antigravity (Claude Sonnet 4.6 & Gemini 3.8 Flash)**.

---

## 🌐 Live Application Links

| Component | Target Platform | Link / Status |
|-----------|-----------------|---------------|
| **Frontend Web App** | Vercel | `[Deploy on Vercel or open http://localhost:5173 locally]` |
| **Backend REST API** | Render | https://kjhwr-wind26.onrender.com |
| **API Documentation** | OpenAPI / Swagger | https://kjhwr-wind26.onrender.com/docs |

---

## 🎯 The Business Problem: UK Wholesale Power Trading

In Great Britain, energy utilities must purchase electricity in the **Day-Ahead wholesale market (N2EX / EPEX SPOT)** before the noon gate closure for delivery during the 48 half-hour settlement periods of the next day:

$$\text{Power Needed from Thermal Generators} = \text{Consumer Demand} - \text{Wind Generation}$$

- **The Challenge:** Wind generation is zero-fuel-cost and renewable, but inherently weather-dependent.
- **The Risk:** 
  - **Over-forecasting wind:** The utility buys too little thermal power; when wind drops, they face expensive emergency imbalance system prices (often £200–£500+/MWh).
  - **Under-forecasting wind:** The utility over-buys expensive thermal power and burns unnecessary fossil fuels.
- **The Solution:** AeroCast UK provides real-time access to official Elexon BMRS forecasts (`WINDFOR`) alongside historical outturn actuals (`FUELHH`), quantifying forecast errors so traders can size a precise, cost-optimal risk buffer.

---

## 🌟 Key Application Features

1. **Executive Overview Dashboard**:
   - High-level KPIs: **MAE** (1,764 MW), **RMSE** (2,259 MW), and **MAPE** (15.97%) across all 744 hourly settlement points in January 2026.
   - Plain English explainers on every card breaking down what each metric means for a non-technical judge or executive.
   - Animated wind turbines and ambient UK atmospheric sky graphics.
2. **Forecast vs Actuals Time Series**:
   - Direct visual overlay of actual metered wind output (green) vs latest forecasts (blue).
   - Week-by-week interactive zoom filters (Full Month, Week 1, Week 2, Week 3, Week 4).
   - Rich interactive hover tooltip displaying the instantaneous surplus or deficit in Megawatts.
3. **Accuracy & Mathematical Error Drilldown**:
   - Directional Bias breakdown: reveals the % of time the model over-forecasted vs under-forecasted.
   - Dual-bar daily comparison of MAE vs RMSE to detect outlier storm days.
   - Hourly error residual line chart and searchable daily audit table with accuracy ratings.
4. **Day-Ahead Decision Desk (Vintage Simulator)**:
   - Simulates the exact state of knowledge available to the trading desk prior to bid submission.
   - **Interactive Wholesale Purchase Recommendation Engine**: Lets traders adjust consumer demand (e.g. 28,000 MW) to automatically compute net thermal procurement plus the quantified safety buffer.

---

## 🗂️ Repository & Directory Structure

```
windforecast/
├── backend/
│   ├── main.py              # FastAPI application & REST routing
│   ├── data_fetcher.py      # Elexon BMRS client with 7-day disk caching
│   ├── metrics.py           # Mathematical calculation of MAE, RMSE, MAPE
│   ├── cache/               # Pre-warmed local JSON cache of January 2026 data
│   │   ├── actuals_jan2026.json
│   │   └── forecasts_jan2026.json
│   ├── requirements.txt     # Python 3.11+ / 3.13 dependencies
│   └── Dockerfile           # Production container for backend
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Shell with atmospheric sky header & sidebar
│   │   ├── main.tsx         # React root entry
│   │   ├── index.css        # Atmospheric styles, turbine animation keyframes
│   │   ├── api.ts           # Axios / fetch client with CORS handling
│   │   ├── types.ts         # TypeScript definitions
│   │   └── components/
│   │       ├── OverviewTab.tsx      # Executive summary & 3-step decision flow
│   │       ├── ForecastChart.tsx    # Actual vs forecast time series & week zoom
│   │       ├── ErrorMetrics.tsx     # Directional bias & MAE/RMSE comparisons
│   │       ├── DecisionSummary.tsx  # Vintage selector & thermal buy calculator
│   │       ├── vintageMetrics.ts    # In-browser metric calculations
│   │       ├── hooks.ts             # useAsync lifecycle management
│   │       └── ui.tsx               # Cards, KPIs, and ExplainerBoxes
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── nginx.conf           # SPA fallback + reverse proxy configuration
│   └── Dockerfile           # Multi-stage production container (Node build + Nginx)
├── docker-compose.yml       # Orchestrates frontend + backend containers
└── README.md
```

---

## 🚀 How to Run the Application

### Option A: Running with Docker (Recommended)

Make sure [Docker Desktop](https://www.docker.com/) is installed and running:

```bash
# Clone the repository
git clone <YOUR_ANONYMOUS_REPO_URL>
cd windforecast

# Build and start both containers
docker-compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Interactive Swagger Docs:** http://localhost:8000/docs

---

### Option B: Running Locally (Development Mode)

#### 1. Backend (Python FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend (React + Vite + TypeScript)
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your web browser.

---

## ☁️ Deployment Instructions

### Deploying Frontend to Vercel
1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Select your repository and set the **Root Directory** to `frontend`.
4. Add the environment variable:
   - `VITE_API_BASE_URL` = `https://<YOUR-RENDER-BACKEND-URL>`
5. Click **Deploy**.

### Deploying Backend to Render.com (or Heroku)
1. Sign in to [Render](https://render.com/) and create a **New Web Service**.
2. Connect your repository and set the **Root Directory** to `backend`.
3. Set the Environment to **Python 3**.
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Set Environment Variables:
   - `CORS_ORIGIN` = `https://<YOUR-VERCEL-FRONTEND-URL>`

---

## 🎬 Video Demo Guide (10 Minutes Total)

This outline maps directly to the challenge rubrics:

### ⏱️ Part 1: Client Pitch (Max 5 Minutes)
- **Opening (0:00–1:00):** 
  - Introduce the core problem: UK day-ahead power procurement requires balancing wind intermittency with thermal backup before the noon gate closure.
  - Present the value proposition of AeroCast UK: turning raw weather forecasts into actionable commercial risk parameters.
- **Walkthrough (1:00–3:30):**
  - **Executive Overview:** Show the 1,764 MW MAE (~16% MAPE) and point out the Best vs Worst forecast days.
  - **Forecast vs Actuals:** Zoom into Week 2 to demonstrate how the model tracked actual wind ramping on the National Grid.
  - **Decision Desk & Thermal Calculator:** Move the consumer demand slider to show how the app computes the exact recommended purchase order including the safety buffer.
- **Client Takeaway (3:30–4:30):**
  - Highlight how having a quantified 1,764 MW buffer avoids multi-hundred-thousand-pound emergency imbalance penalties.

### ⏱️ Part 2: Technical Review for Tech Lead (Max 5 Minutes)
- **Architecture & Design (4:30–6:00):**
  - Modular decoupled architecture: FastAPI backend + React Vite frontend.
  - Real Elexon BMRS ingestion: `FUELHH` (WIND fuelType) and `WINDFOR` (publishTime vintages).
  - High-performance local caching layer (`backend/cache/`) with 7-day TTL ensuring sub-50ms query times.
- **Mathematical Error Modeling (6:00–7:30):**
  - Explain how MAE, RMSE, and MAPE are vectorized in `metrics.py` across matching settlement timestamps.
  - Explain why RMSE > MAE reflects the tail-risk penalties of sudden frontal passages.
- **Key Development Practices (7:30–9:30):**
  - Strict TypeScript interfaces with zero build errors.
  - Containerization using multi-stage Docker builds and docker-compose.
  - Graceful degradation and fallback to cached data if Elexon's upstream API experiences outages.
