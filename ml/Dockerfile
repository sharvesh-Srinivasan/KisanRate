# ── Stage 1: build dependencies ──────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /app

# Install dependencies into a prefix so we can copy cleanly
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM python:3.11-slim AS runner

# Security: non-root user
RUN addgroup --system kisanrate && adduser --system --ingroup kisanrate kisanrate

WORKDIR /app

# Copy installed packages from build stage
COPY --from=deps /install /usr/local

# Copy application source
COPY . .

# Remove local .env — runtime env should come from docker-compose / secrets
RUN rm -f .env

USER kisanrate

EXPOSE 8000

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
