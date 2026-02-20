# iLike - Dating + Random Chat Platform

A full-stack dating application (Tinder + Omegle hybrid) built with **React + TypeScript** and **Node.js + Express + MongoDB**, featuring real-time chat, Cloudinary photo storage, refresh-token authentication, and block/report safety features.

[![Platform](https://img.shields.io/badge/Platform-Dating%20%2B%20Chat-blue)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61dafb)](#)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express%205-339933)](#)
[![Database](https://img.shields.io/badge/Database-MongoDB-47a248)](#)
[![Real-time](https://img.shields.io/badge/Real--time-Socket.IO-010101)](#)

## Features

### Core Dating
- **JWT Auth + Refresh Tokens** — 15-minute access tokens, 7-day httpOnly refresh cookies, silent token refresh
- **Profile Management** — Full profiles with Cloudinary-backed photo uploads
- **Preference-Based Matching** — Discover potential matches filtered by preferences
- **Like / Dislike** — Swipe-style interactions with mutual match detection
- **Block & Report** — Block users and report inappropriate behavior

### Real-Time Chat
- **Socket.IO Messaging** — Instant messaging with delivered/read status
- **Typing Indicators & Read Receipts** — Real-time presence and feedback
- **Chat History** — Persistent messages and conversation management

### UI & UX
- **Responsive Design** — Mobile, tablet, and desktop
- **shadcn/ui + Tailwind** — Modern, accessible components
- **Framer Motion** — Smooth animations
- **Dark/Light Themes** — User preference support

### Security & Operations
- **Rate Limiting** — Auth routes protected against brute force
- **CORS** — Configurable via `FRONTEND_URL`
- **Input Validation** — express-validator on register/login
- **Secure Cookies** — Refresh tokens in httpOnly cookies

---

## Tech Stack

| Layer      | Technologies                                           |
|-----------|---------------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite 6, React Router 7, Tailwind CSS, shadcn/ui, Axios, Socket.IO Client, Framer Motion |
| Backend   | Node.js (ESM), Express 5, MongoDB, Mongoose, JWT, bcrypt, Multer, Cloudinary, Socket.IO, Vitest |
| DevOps    | ESLint, Vitest, Git                                    |

---

## Project Structure

```
ilike-web/
├── backend/                 # Express API (port 5000)
│   ├── controllers/         # user, match, chat, profile, blockReport
│   ├── middleware/          # auth (JWT verification)
│   ├── models/              # User, Profile, Match, Chat, Message, Block, Report
│   ├── routes/              # userRoutes, matchRoutes, chatRoutes, profileRoutes
│   ├── socket/              # socketServer.js (Socket.IO)
│   └── utils/               # cloudinaryConfig, authUtils
├── frontend/                # React SPA (port 3000)
│   └── src/
│       ├── components/      # Navbar, ProfileSetup, auth, ui
│       ├── context/         # AuthProvider
│       ├── pages/           # Home, Explore, Matches, Chat, Profile, Settings
│       ├── services/        # api, authService, matchService, chatService
│       └── routes/          # AppRoutes, AdminRoutes
└── docs/                    # Architecture diagrams (Mermaid)
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MongoDB** 6+ (local or Atlas)
- **Cloudinary** account (free tier)

### 1. Clone & Install

```bash
git clone https://github.com/Pin3appl3ishan/ilike-web.git
cd ilike-web

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Environment Variables

**Backend** — create `backend/.env`:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/ilike

JWT_SECRET=<generate-a-strong-secret>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

FRONTEND_URL=http://localhost:3000
```

**Frontend** — create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Run

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5000](http://localhost:5000)

---

## API Reference

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/users/register` | No | Register |
| POST | `/api/users/login` | No | Login |
| POST | `/api/users/refresh` | Cookie | Refresh access token |
| POST | `/api/users/logout` | Yes | Logout |
| GET | `/api/users/me` | Yes | Current user |
| GET | `/api/users` | Yes | List users |

### Block & Report
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/users/block/:id` | Yes | Block user |
| DELETE | `/api/users/block/:id` | Yes | Unblock user |
| POST | `/api/users/report/:id` | Yes | Report user |

### Matches
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/matches/potential` | Yes | Potential matches |
| POST | `/api/matches/like/:userId` | Yes | Like user |
| DELETE | `/api/matches/like/:userId` | Yes | Dislike user |
| GET | `/api/matches` | Yes | Mutual matches |
| GET | `/api/matches/likes` | Yes | Who liked me |
| GET | `/api/matches/likes-sent` | Yes | Likes I sent |

### Profile
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/profile/me` | Yes | Own profile |
| POST | `/api/profile/setup` | Yes | Create/update profile |
| PUT | `/api/profile/update` | Yes | Update profile |
| PUT | `/api/profile/picture` | Yes | Update profile picture |
| POST | `/api/profile/upload` | Yes | Upload photo |

### Chat
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/chats` | Yes | All chats |
| POST | `/api/chats` | Yes | Create chat |
| GET | `/api/chats/:chatId` | Yes | Get chat |
| GET | `/api/chats/:chatId/messages` | Yes | Get messages |
| POST | `/api/chats/:chatId/messages` | Yes | Send message |
| PUT | `/api/chats/:chatId/read` | Yes | Mark as read |
| DELETE | `/api/chats/:chatId` | Yes | Soft delete chat |

### Socket.IO Events
| Event (C→S) | Payload | Description |
|-------------|---------|-------------|
| `join_chat` | `chatId` | Join chat room |
| `leave_chat` | `chatId` | Leave chat room |
| `typing_start` | `{ chatId }` | Start typing |
| `typing_stop` | `{ chatId }` | Stop typing |
| `send_message` | `{ chatId, content, type }` | Send message |
| `mark_read` | `{ chatId }` | Mark messages read |

| Event (S→C) | Payload | Description |
|-------------|---------|-------------|
| `new_message` | message | New message received |
| `message_sent` | message | Message confirmed |
| `user_typing` | `{ userId, chatId, isTyping }` | Typing indicator |
| `messages_read` | `{ chatId, readBy, timestamp }` | Read receipts |

---

## Testing

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

Backend uses **Vitest**; frontend uses **Vitest** + **Testing Library**.

---

## Deployment

### Backend (Render, Railway, or Heroku)

1. Set environment variables:
   - `MONGODB_URI` (e.g. MongoDB Atlas)
   - `JWT_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`
   - `CLOUDINARY_*`
   - `FRONTEND_URL` (production frontend URL)
2. Ensure `NODE_ENV=production`.
3. Use `npm run start` or `node server.js`.

### Frontend (Vercel, Netlify)

1. Set `VITE_API_BASE_URL` to your production backend API URL.
2. Build: `npm run build`.
3. Serve the `dist/` folder.

### Production Checklist

- [ ] Use MongoDB Atlas or managed MongoDB
- [ ] Set strong `JWT_SECRET` and rotate periodically
- [ ] Set `FRONTEND_URL` to production origin
- [ ] Use HTTPS in production
- [ ] Configure Cloudinary usage limits
- [ ] Add rate limiting beyond auth (optional)

---

## Mobile Integration

This backend is shared with a companion **Flutter mobile app**. The API, Socket.IO events, and auth flow are designed for web and mobile clients.

---

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Commit (`git commit -m 'feat: add my feature'`)
4. Push (`git push origin feature/my-feature`)
5. Open a Pull Request

Use conventional commits (`feat:`, `fix:`, `chore:`).

---

## License

MIT — see [LICENSE](LICENSE) for details.
