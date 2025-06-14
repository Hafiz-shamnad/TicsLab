#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up TicsLab project..."

# Folder structure
mkdir -p ticslab/apps/{backend,frontend,shared} infra/docker
cd ticslab

# -------------------------------
# Backend Setup: FastAPI + PostgreSQL
# -------------------------------
cd apps/backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi[all] uvicorn psycopg2-binary sqlalchemy pydantic python-dotenv
deactivate

# Create basic FastAPI app
cat <<EOF > main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Welcome to TicsLab Backend"}
EOF

# -------------------------------
# Frontend Setup: Next.js + Tailwind + ShadCN
# -------------------------------
cd ../frontend
npm create next-app@latest . --use-npm --ts --app --no-eslint --tailwind --src-dir --import-alias "@/*"
npm install @shadcn/ui class-variance-authority tailwind-merge lucide-react react-icons three monaco-editor zustand @tanstack/react-query
npx shadcn-ui@latest init --tailwindcss

# Add sample page
cat <<EOF > src/app/page.tsx
export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold text-center">Welcome to TicsLab 🌐</h1>
    </main>
  );
}
EOF

# -------------------------------
# Docker Compose Setup
# -------------------------------
cd ../../../
cat <<EOF > docker-compose.yml
version: "3.9"
services:
  backend:
    build: ./apps/backend
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./apps/backend:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://tics:ticspass@db:5432/ticsdb

  frontend:
    build: ./apps/frontend
    command: npm run dev
    volumes:
      - ./apps/frontend:/app
    ports:
      - "3000:3000"

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ticsdb
      POSTGRES_USER: tics
      POSTGRES_PASSWORD: ticspass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
EOF

# -------------------------------
# Dockerfiles
# -------------------------------
# Backend Dockerfile
cat <<EOF > apps/backend/Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY ./ ./
RUN pip install fastapi[all] psycopg2-binary sqlalchemy pydantic python-dotenv
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Frontend Dockerfile
cat <<EOF > apps/frontend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "dev"]
EOF

echo "✅ TicsLab structure created successfully."
echo "➡️ To start the dev environment: cd ticslab && docker-compose up --build"

# ADDITIONAL CMNDS 
npm install @vercel/font
