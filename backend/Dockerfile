FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV CACHE_DIR=/tmp/windforecast_cache
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
