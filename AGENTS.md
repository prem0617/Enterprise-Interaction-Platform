# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service | Port | Command | Notes |
|---------|------|---------|-------|
| Backend (Express + Socket.IO) | 8000 | `cd backend && npm run dev` | Requires MongoDB running first. Port depends on `PORT` env var (system default is 8000). |
| Frontend (Vite + React) | 5173 | `cd frontend && npm run dev` | Set `VITE_API_URL` in `frontend/.env` to match backend port. |
| MongoDB | 27017 | `mongod --dbpath /data/db --logpath /var/log/mongodb/mongod.log --fork` | Must start before backend |

### Startup sequence

1. **Start MongoDB** (must be running before the backend):
   ```bash
   mkdir -p /data/db /var/log/mongodb
   mongod --dbpath /data/db --logpath /var/log/mongodb/mongod.log --fork
   ```
2. **Start backend**: `cd backend && npm run dev`
3. **Start frontend**: `cd frontend && npm run dev`

### Key gotchas

- **npm install requires `--legacy-peer-deps`** for both `backend/` and `frontend/` due to peer dependency conflicts (`multer-storage-cloudinary` vs `cloudinary` in backend; `eslint-plugin-react-hooks` vs `eslint@10` in frontend).
- **`OPENAI_API_KEY` must be set** (even a placeholder like `sk-placeholder-for-dev-startup`) in `backend/.env` or the backend will crash at startup — the OpenAI client is instantiated at module load time in `controllers/ai/ai.controller.js`.
- **Backend `.env` file** is not committed. Minimum required vars: `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`. See `CLAUDE.md` for the full list.
- **Nodemon does not watch `.env` files**. After changing `backend/.env`, you must restart the backend process manually.
- **Frontend `config.js`** dynamically resolves the backend URL from `window.location.hostname:3000` by default. In Cloud Agent environments where the backend runs on port 8000, you must set `VITE_API_URL=http://localhost:8000/api` in `frontend/.env`.
- **System `PORT` env var** may override `backend/.env` — Cloud Agent VMs have `PORT=8000` pre-set. The dotenv library (v17) does not override existing env vars. Either unset `MONGODB_URI` before starting the backend (if a system-level value exists) or explicitly export the correct value.
- **MongoDB is required** — the backend calls `process.exit(1)` if it cannot connect.
- **Email service** uses Nodemailer Ethereal test accounts as fallback when `EMAIL_USER`/`EMAIL_PASSWORD` are not set. Emails "send" successfully to Ethereal; preview URLs are logged to console.
- **Lint** (`cd frontend && npm run lint`): pre-existing warnings/errors exist in the codebase; the lint command itself works.
- **No test suite** is configured — `npm run test` in backend is a placeholder that exits with code 1.
- **Admin signup** requires `country` to be one of: `"germany"`, `"india"`, `"usa"` (lowercase).
