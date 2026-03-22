# Online Web Chat

Fullstack chat application built with Django, React, and PostgreSQL using Docker.

---

## 🚀 Tech Stack

- Backend: Django, Django REST Framework
- Frontend: React + Vite + TypeScript
- Database: PostgreSQL
- DevOps: Docker, Docker Compose

---

## ⚙️ Setup (Docker)

### 1. Clone repository

```bash
git clone https://github.com/your-username/online-web-chat.git
cd online-web-chat

```

### 2. Create .env file

Create `.env` in root:

```
POSTGRES_DB=chatdb
POSTGRES_USER=chatuser
POSTGRES_PASSWORD=chatpass
POSTGRES_HOST=db
POSTGRES_PORT=5432

DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
```

### 3. Run project

`docker compose up --build`

---

## 🌐 Services

_Frontend:_ `http://localhost:5173`
_Backend API:_ `http://localhost:8000`
_Health check:_ `http://localhost:8000/api/health/`
