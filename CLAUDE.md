# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

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
npm run test         # placeholder only

# Frontend (from frontend/)
npm run dev          # Vite dev server on port 5173
npm run build        # production build
npm run lint         # ESLint
npm run preview      # preview production build
```

No test suite is configured. The root `package-lock.json` is for the monorepo; each app has its own `package.json`.

## Architecture

### Backend (`backend/`)

- **Entry:** `index.js` — Express app + Socket.IO server (created in `socket/socketServer.js`)
- **Routes:** `routes/<domain>.routes.js` → `controllers/<domain>/<entity>.controller.js` → `models/<Model>.js`
- **Controllers:** Organized in subdirectories by domain: `auth/`, `chat/`, `call/`, `meeting/`, `attendance/`, `leave/`, `department/`, `ticket/`, `employee/`, `analytics/`, `role/`, `helper/`
- **Auth:** JWT via `middlewares/auth.middleware.js` (`verifyToken`). Three user types share the `User` model with a `role` field; `Customer` is a separate model.
- **Real-time:** Socket.IO handles chat messages, direct messages, call signaling, and meeting events (all in `socket/socketServer.js`)
- **File uploads:** Multer + Cloudinary
- **Services:** `services/` contains auth, email, and meeting reminder logic; `utils/emailService.js` is the mailer wrapper
- **Utils:** `utils/passwordGenerator.js`, `utils/emailService.js`

### Frontend (`frontend/src/`)

- **Routing:** `App.jsx` defines routes with role-based guards (`ProtectedRoute`, `AdminProtectedRoute`, `CustomerProtectedRoute`)
- **Auth state:** `context/AuthContextProvider.jsx` — stores user/token, exposes login/logout, manages Socket.IO connection
- **Calls:** `context/CallContextProvider.jsx` — WebRTC call state for direct audio/video calls
- **Pages by role:** `pages/admin/`, `pages/employee/`, `pages/customer/`
- **Dashboard shells:** `AdminDashboard.jsx` and `EmployeeDashboard.jsx` act as layout wrappers with sidebar navigation, rendering child views via nested routes
- **API calls:** Axios with base URL from `config.js`
- **Path alias:** `@/` maps to `src/` (configured in `vite.config.js`)

### Key Patterns

- All backend route files use ESM (`import/export`)
- Backend env vars loaded via `env.js` (calls `dotenv.config()`) imported before everything else in `index.js`
- CORS whitelist is hardcoded in `index.js` for localhost origins
- Frontend uses `@/` path alias (mapped to `src/`) for imports
- Socket.IO connection is managed in `AuthContextProvider` and tied to user authentication state

## Role & Permission System

The app has a hybrid role system:

- **Native Admin:** `user_type === "admin"` — bypasses all permission checks
- **Assigned Roles:** `UserRole` model links users to `Role` documents with permission arrays
- **Permission Middleware:** `requirePermission(permission)` in `auth.middleware.js` checks if user has a specific permission from any assigned role

Key permissions used: `employees:create`, `employees:delete`, `employees:update`, `leave:approve`, `attendance:manage`, `departments:manage`, `roles:manage`, `tickets:manage`, `analytics:view`, `chat:manage`, `meetings:manage`.

## Socket.IO Events

The `socket/socketServer.js` handles:

### WebRTC Signaling (Direct Calls)
- `audio-call-request`, `audio-call-accept`, `audio-call-reject` — audio call lifecycle
- `video-call-request`, `video-call-accept`, `video-call-reject` — video call lifecycle
- `webrtc-offer`, `webrtc-answer`, `webrtc-ice` — SDP/candidate exchange
- `video-webrtc-offer`, `video-webrtc-answer`, `video-webrtc-ice` — video variants
- `audio-call-end`, `video-call-end` — call termination

### Group Calls (Channels)
- `group-call-webrtc-offer`, `group-call-webrtc-answer`, `group-call-webrtc-ice` — mesh WebRTC for channel calls

### Meetings
- `meeting-join`, `meeting-leave` — enter/exit meeting room
- `meeting-join-request`, `meeting-admit` — lobby admission flow for private meetings
- `meeting-message` — in-meeting chat
- `meeting-end` — host ends meeting for all
- `meeting-media-state`, `meeting-hand-raise` — mute/video/hand raise status
- `meeting-screen-share-start`, `meeting-screen-share-stop` — screen sharing signals
- `meeting-webrtc-offer`, `meeting-webrtc-answer`, `meeting-webrtc-ice` — mesh WebRTC for meetings
- `meeting-participants` — broadcast participant list
- `meeting-lobby-request`, `meeting-lobby-left`, `meeting-admitted` — lobby flow events

### Tickets
- `ticket-join`, `ticket-leave`, `ticket-message`, `ticket-typing` — real-time ticket chat
- `ticket-new-message` — broadcast ticket message

### Online Status
- `request-online-users` — client requests current online list
- `online-users-updated` — server broadcasts online user IDs

## Dashboard Routing Pattern

Both dashboards use **conditional rendering** (not React Router nested routes):

- `AdminDashboard.jsx`: `currentPage` state switches between `dashboard`, `employees`, `departments`, `messages`, `meetings`, `attendance`, `tickets`, `roles`, `analytics`, `profile`
- `EmployeeDashboard.jsx`: `activeTab` state switches between `home`, `messages`, `team`, `files`, `attendance`, `meetings`, `tickets`

`MeetingModule` is always mounted in both dashboards and hidden via CSS when not active—this preserves meeting state when users navigate to other tabs.

## Environment Variables

**Backend** (see `backend/env.js`):
- `JWT_SECRET` — JWT signing secret
- `MONGODB_URI` — MongoDB connection string
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary config
- `OPENAI_API_KEY` — OpenAI API key for AI assistant
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` — SMTP config
- `PORT` — Server port (default: 3000)

**Frontend** (see `frontend/src/config.js`):
- `VITE_API_URL` — Backend API URL (default: `http://localhost:8000/api`)

**Note:** The backend runs on port 3000 by default, but the frontend default points to port 8000. Ensure `VITE_API_URL` matches the actual backend port.

## Models

**Core:** `User`, `Employee`, `Customer`, `Company`, `Department`, `Role`, `Permission`, `UserRole`

**Chat:** `ChatChannel`, `ChannelMember`, `Message`, `SupportTicket`, `TicketMessage`

**Attendance/Leave:** `Attendance`, `LeaveRequest`, `LeaveBalance`, `Holiday`

**Meetings:** `Meeting`, `MeetingRecording`

**Audit:** `AuditLog`, `File`
