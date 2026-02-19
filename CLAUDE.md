# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise Interaction Platform — a full-stack internal collaboration tool with three user roles: **Admin**, **Employee**, and **Customer**. Features include real-time chat (channels & direct messages), video meetings, AI assistant, attendance/leave management, department management, support tickets, and analytics.

## Tech Stack

- **Frontend:** React 19 + Vite, TailwindCSS 4, Radix UI primitives, React Router v7, Socket.IO client, Recharts
- **Backend:** Express 5 (ESM), MongoDB/Mongoose 9, Socket.IO, JWT auth, Cloudinary (file uploads), OpenAI API, Nodemailer
- **UI components:** shadcn/ui pattern (`frontend/src/components/ui/`) with `cn()` utility from `frontend/src/lib/utils.js`

## Commands

```bash
# Backend (from backend/)
npm run dev          # starts with nodemon on port 3000

# Frontend (from frontend/)
npm run dev          # Vite dev server on port 5173
npm run build        # production build
npm run lint         # ESLint
```

No test suite is configured. The root `package-lock.json` is for the monorepo; each app has its own `package.json`.

## Architecture

### Backend (`backend/`)

- **Entry:** `index.js` — Express app + Socket.IO server (created in `socket/socketServer.js`)
- **Routes:** `routes/<domain>.routes.js` → `controllers/<domain>.controller.js` → `models/<Model>.js`
- **Auth:** JWT via `middlewares/auth.middleware.js` (`verifyToken`). Three user types share the `User` model with a `role` field; `Customer` is a separate model.
- **Real-time:** Socket.IO handles chat messages, direct messages, call signaling, and meeting events (all in `socket/socketServer.js`)
- **File uploads:** Multer + Cloudinary
- **Services:** `services/` contains auth, email, and meeting reminder logic; `utils/emailService.js` is the mailer wrapper

### Frontend (`frontend/src/`)

- **Routing:** `App.jsx` defines routes with role-based guards (`ProtectedRoute`, `AdminProtectedRoute`, `CustomerProtectedRoute`)
- **Auth state:** `context/AuthContextProvider.jsx` — stores user/token, exposes login/logout
- **Calls:** `context/CallContextProvider.jsx` — WebRTC call state
- **Pages by role:** `pages/admin/`, `pages/employee/`, `pages/customer/`
- **Dashboard shells:** `AdminDashboard.jsx` and `EmployeeDashboard.jsx` act as layout wrappers with sidebar navigation, rendering child views via nested routes
- **API calls:** Axios with base URL from `config.js`

### Key Patterns

- All backend route files use ESM (`import/export`)
- Backend env vars loaded via `env.js` (calls `dotenv.config()`) imported before everything else in `index.js`
- CORS whitelist is hardcoded in `index.js` for localhost origins
- Frontend uses `@/` path alias (mapped to `src/`) for imports
