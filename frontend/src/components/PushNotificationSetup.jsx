import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import {
  enableWebPush,
  getLocalPushSubscription,
  isWebPushSupported,
} from "@/lib/webPushClient";
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

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    setSupported(isWebPushSupported());
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // If we already have a valid subscription locally, treat it as "on".
        const existing = await getLocalPushSubscription();
        if (cancelled) return;
        if (existing) {
          setStatus("on");
          return;
        }

        // Permission already granted: try to (re)subscribe so the backend gets a fresh subscription.
        if (Notification.permission === "granted") {
          setStatus("enabling");
          const result = await enableWebPush(getAuthHeaders);
          if (cancelled) return;

          if (result.ok) setStatus("on");
          else setStatus(Notification.permission === "denied" ? "denied" : "idle");

          if (!result.ok) toast.error("Could not enable notifications", { description: result.reason });
        }
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders]);

  const enable = useCallback(async () => {
    setStatus("enabling");
    const result = await enableWebPush(getAuthHeaders);
    if (result.ok) setStatus("on");
    else if (Notification.permission === "denied") setStatus("denied");
    else setStatus("idle");

    if (!result.ok) toast.error("Could not enable notifications", { description: result.reason });
  }, [getAuthHeaders]);

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
