FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

ENV PORT=8000
ENV HOST=0.0.0.0

EXPOSE 8000

CMD ["python", "run.py"]

