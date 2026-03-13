// Dynamically determine backend URL based on the current browser location.
// This allows the app to work on any host (localhost, Tailscale IP, VM, etc.)
// without needing to change configuration.
// Override by setting VITE_API_URL in .env if needed.
const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

export { BACKEND_URL };
