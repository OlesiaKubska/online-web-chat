# Online Web Chat

Fullstack chat application built with **Django**, **React**, and **PostgreSQL** using **Docker**.

---

## 🚀 Tech Stack

- **Backend:** Django, Django REST Framework
- **Frontend:** React + Vite + TypeScript
- **Database:** PostgreSQL
- **DevOps:** Docker, Docker Compose

---

## 📦 Features (MVP)

### Authentication

- User registration (email, username, password)
- Login / Logout
- Persistent session (cookies)
- Current user endpoint (`/api/auth/me/`)

### Frontend

- Register page
- Login page
- Home page (current user)
- Basic route protection

### Backend API

- REST API (DRF)
- Session-based authentication
- PostgreSQL integration

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

### 4. Run migrations (first time only)

```
docker compose exec backend python manage.py migrate
```

### 5. Create superuser (optional)

```
docker compose exec backend python manage.py createsuperuser
```

---

## 🌐 Services

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`
- **Admin panel:** `http://localhost:8000/admin/`
- **Health check:** `http://localhost:8000/api/health/`

---

## 🔑 API Endpoints

### Auth

- **POST** `/api/auth/register/` — register new user
- **POST** `/api/auth/login/` — login (creates session)
- **POST** `/api/auth/logout/` — logout current session
- **GET** `/api/auth/me/` — current authenticated user

---

## 🐳 Project Structure

```
online-web-chat/
│
├── backend/        # Django + DRF
├── frontend/       # React + Vite + TS
├── docker-compose.yml
├── .env
└── README.md
```
---

## 🧪 Development Notes

- Backend runs on port **8000**
- Frontend runs on port **5173**
- Uses **session authentication (cookies)**
- Frontend requests must include:

```
credentials: "include"
```
---

## ⚠️ Important Notes

- CORS and cookies must be enabled for frontend-backend communication
- PostgreSQL runs inside Docker container
- Do not forget to run migrations after first startup

---

## 📌 Future Features (in progress)

- Chat rooms (public/private)
- Real-time messaging (WebSocket)
- Personal messages (DM)
- Friends system
- File & image upload
- Moderation (admins, bans)
- Notifications & unread indicators

---

## 🧑‍💻 Author

**Olesia Kubska**

---
