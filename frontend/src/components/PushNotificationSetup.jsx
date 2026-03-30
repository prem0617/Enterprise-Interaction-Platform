import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { subscribeUserPush, isPushSupported } from "@/lib/pushNotifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PushNotificationSetup() {
  // Show this prompt on platform entry. We intentionally do not persist
  // the "Later" decision via sessionStorage, so it can appear again after
  // a user navigates back into the app.
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | enabling | on | unsupported | denied
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    isPushSupported().then(setSupported);
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "denied") setStatus("denied");
      // If permission is already granted, try to (re)subscribe so the server
      // has a fresh, valid PushSubscription (e.g. VAPID keys were set later).
      else if (Notification.permission === "granted") {
        setStatus("enabling");
        subscribeUserPush()
          .then((ok) => setStatus(ok ? "on" : Notification.permission === "denied" ? "denied" : "idle"))
          .catch(() => setStatus("idle"));
      }
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event) => {
      const data = event.data || {};
      if (data?.type === "EIP_PUSH_RECEIVED") {
        toast.info(`Push received: ${data.payload?.title || "Notification"}`, {
          duration: 2500,
        });
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const enable = useCallback(async () => {
    setStatus("enabling");
    const ok = await subscribeUserPush();
    if (ok) setStatus("on");
    else if (Notification.permission === "denied") setStatus("denied");
    else setStatus("idle");
  }, []);

  if (!supported || dismissed) return null;
  if (status === "on" && Notification.permission === "granted") return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[100] max-w-md rounded-2xl border shadow-2xl backdrop-blur-md",
        "border-indigo-500/25 bg-gradient-to-br from-zinc-950/95 to-zinc-900/95 text-zinc-100 p-4",
        "animate-in slide-in-from-bottom-4 duration-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
          {status === "denied" ? <BellOff className="size-5" /> : <Bell className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-50">Desktop notifications</p>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {status === "denied"
              ? "Notifications are blocked for this site. Enable them in your browser settings to get calls and messages when the app is in the background."
              : "Get alerts for calls, chat, meetings, tickets, and leave updates—even when this tab is closed."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {status !== "denied" && (
              <Button
                size="sm"
                type="button"
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                disabled={status === "enabling"}
                onClick={enable}
              >
                {status === "enabling" ? "Enabling…" : "Enable notifications"}
              </Button>
            )}
            <Button
              size="sm"
              type="button"
              variant="ghost"
              className="text-zinc-400 hover:text-zinc-200"
              onClick={() => {
                setDismissed(true);
              }}
            >
              Later
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800/80"
          onClick={() => {
            setDismissed(true);
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
