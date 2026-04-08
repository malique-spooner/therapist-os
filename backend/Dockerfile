FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV CMAKE_ARGS="-DCMAKE_POLICY_VERSION_MINIMUM=3.5"

ARG REQUIREMENTS_FILE=requirements.txt

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential cmake curl ninja-build espeak-ng \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements*.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/${REQUIREMENTS_FILE}

COPY backend /app/backend
RUN chmod +x /app/backend/start-api.sh /app/backend/start-scheduler.sh /app/backend/start-test.sh

EXPOSE 8000

CMD ["/app/backend/start-api.sh"]
