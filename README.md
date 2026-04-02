# Classic Chat App

Full-stack chat application for coursework/homework submission.

The project includes authentication, rooms, friends, and direct dialogs (DM) with real-time room messaging via WebSocket.

## Short Description

Classic Chat App is a Dockerized web chat system built with Django + DRF + Channels on the backend and React + TypeScript + Vite on the frontend. It supports session-based authentication, room chat, friendship workflows, direct dialogs between friends, and presence heartbeat.

## Features Already Implemented

### Authentication

- User registration
- User login/logout
- Current user endpoint (`/api/auth/me/`)
- Change password endpoint
- Session/cookie-based auth across frontend and backend

### Rooms

- Create room (public/private)
- List public rooms
- List my rooms
- Join/leave room
- Room detail
- Room messages (list/create)
- Edit/delete own messages
- Room-level moderation endpoints for bans/member removal exist in backend
- Message attachments upload endpoint exists in backend

### Real-time Messaging (WebSocket)

- WebSocket room channel: `/ws/rooms/<room_id>/`
- Authenticated room members can send and receive real-time messages
- REST fallback for sending messages exists in frontend

### Friends + Direct Dialogs

- Send friend request (by username)
- Incoming/outgoing request lists
- Accept/reject/cancel friend request
- Friends list
- Remove friend
- User ban/unban endpoints in backend
- Direct dialog create-or-get
- Direct dialogs list
- Open DM in existing room detail/chat page

### Presence

- Heartbeat endpoint
- Presence users endpoint
- Frontend heartbeat hook (`usePresence`) active in protected layout

## Tech Stack

- Backend: Django 6, Django REST Framework, Channels, Daphne
- Frontend: React 19, TypeScript, Vite, React Router
- Database: PostgreSQL (Docker service)
- WebSockets: Django Channels (`InMemoryChannelLayer` in current settings)
- Docker: Docker + Docker Compose

## How to Run Locally

### 1. Clone repository

```bash
git clone <your-repo-url>
cd online-web-chat
```

### 2. Create `.env` in project root

Example values:

```env
POSTGRES_DB=chatdb
POSTGRES_USER=chatuser
POSTGRES_PASSWORD=chatpass
POSTGRES_HOST=db
POSTGRES_PORT=5432

DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
```

### 3. Start from project root

Exact startup command:

```bash
docker compose up --build
```

### 4. Apply migrations (first run or after model changes)

```bash
docker compose exec backend python manage.py migrate
```

### 5. Optional: create admin user

```bash
docker compose exec backend python manage.py createsuperuser
```

## Access URLs

- Frontend: `http://localhost:5173`
- Backend API base: `http://localhost:8000/api/`
- Django admin: `http://localhost:8000/admin/`
- Health endpoint: `http://localhost:8000/api/`

## Authentication and Session Notes

- The backend uses DRF SessionAuthentication.
- Login creates a session cookie used by subsequent API calls.
- Frontend requests are configured to send cookies (`credentials: include`).
- Protected frontend routes are wrapped with `ProtectedRoute`.

## Migration Notes

- Migrations are versioned in each Django app under `migrations/`.
- Do not skip `manage.py migrate` when starting on a clean environment.
- If model changes are introduced, create and commit new migrations before submission.

## Project Structure Overview

```text
online-web-chat/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── manage.py
│   ├── config/          # Django settings, urls, asgi/wsgi
│   ├── accounts/        # register/login/logout/me/change-password
│   ├── rooms/           # rooms, messages, moderation, websocket consumer
│   ├── friends/         # friend requests, friendships, user bans
│   └── core/            # health + presence APIs
└── frontend/
	├── src/
	│   ├── App.tsx
	│   ├── pages/       # Home, Login, Register, Rooms, RoomDetail, Friends
	│   ├── components/  # rooms, friends, navigation shared UI
	│   ├── lib/         # API clients + presence hook
	│   └── types/       # TypeScript types
	└── package.json
```

## Partially Implemented / Not Implemented Yet

- Moderation UI is incomplete on frontend (some moderation endpoints exist only on backend).
- Banned-users management UI is limited.
- Presence API exists, but full presence visualization/UX is minimal.
- WebSocket channel layer uses in-memory backend (good for local dev, not for multi-instance production).
- No advanced notifications/unread counters yet.

## Known Limitations

- Current CORS setup is permissive for local development.
- Channel layer is in-memory, so scaling WebSocket across multiple backend instances is not ready.
- Error handling and UX polish vary between pages.
- Automated test coverage exists for key backend flows, but full end-to-end frontend coverage is not included.

## Future Improvements

- Add Redis channel layer for production-grade WebSocket scaling.
- Extend moderation UI (room bans, member management, role controls).
- Add notifications, unread counters, and better presence indicators.
- Add stronger frontend validation and unified error components.
- Add CI checks and broader automated tests (frontend + integration).

## Author

Olesia Kubska
