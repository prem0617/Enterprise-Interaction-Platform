# Enterprise Interaction Platform

A full-stack internal collaboration tool with real-time chat, video meetings, AI assistant, attendance/leave management, and more.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- npm

### Installation

```bash
# Install dependencies for both backend and frontend
cd backend && npm install
cd ../frontend && npm install
```

### Running the Application

```bash
# Terminal 1: Start Backend (from backend/)
npm run dev

# Terminal 2: Start Frontend (from frontend/)
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api

## Features

- **Real-time Chat** — Channels & direct messages via Socket.IO
- **Video Meetings** — Group calls with WebRTC signaling
- **AI Assistant** — OpenAI-powered chat support
- **Attendance & Leave** — Manage attendance records and leave requests
- **Department Management** — Hierarchical organization structure with departments and teams
- **Support Tickets** — Create and manage support requests
- **Role-Based Access** — Admin, Employee, and Customer roles with granular permissions
- **Analytics** — Dashboard with metrics and insights

## Project Structure

```
.
├── backend/           # Express.js + MongoDB backend
│   ├── controllers/   # Business logic organized by domain
│   ├── models/        # MongoDB schemas
│   ├── routes/        # API endpoints
│   ├── socket/        # WebSocket (Socket.IO) handlers
│   ├── middlewares/   # Authentication & authorization
│   └── services/      # Reusable services (email, auth, etc.)
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/  # React components (UI, features)
│   │   ├── pages/       # Role-based pages (admin, employee, customer)
│   │   ├── context/     # Auth & call state management
│   │   ├── lib/         # Utilities and helpers
│   │   └── App.jsx      # Main app with routing
│   └── vite.config.js   # Vite configuration
└── CLAUDE.md          # Detailed architecture guide

```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Complete architecture, tech stack, API events, and development guide
- **[PLAN.md](./PLAN.md)** — Current feature roadmap and implementation plans

## Tech Stack

- **Frontend:** React 19, Vite, TailwindCSS 4, Radix UI, Socket.IO client, Recharts
- **Backend:** Express 5 (ESM), MongoDB 9, Socket.IO, JWT, Cloudinary, OpenAI API, Nodemailer
- **Database:** MongoDB with Mongoose ODM

## Environment Configuration

Create `.env` files in `backend/` and `frontend/` with required variables. Refer to CLAUDE.md for complete list.

**Key Variables:**
- `backend/.env` — JWT_SECRET, MONGODB_URI, CLOUDINARY_*, OPENAI_API_KEY, EMAIL_*
- `frontend/.env` — VITE_API_URL (e.g., http://localhost:3000/api)

## API Documentation

Socket.IO events are documented in [CLAUDE.md](./CLAUDE.md#socketio-events).

REST endpoints follow the pattern: `/api/<domain>/<resource>`

## License

Internal use only.
