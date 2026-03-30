/* global self, clients */
self.addEventListener("push", (event) => {
  let payload = {
    title: "Enterprise Platform",
    body: "",
    url: "/",
    tag: "eip",
    actions: [],
    data: {},
  };
  try {
    if (event.data) {
      const j = event.data.json();
      payload = {
        title: j.title || payload.title,
        body: j.body || "",
        url: j.url || "/",
        tag: j.tag || "eip",
        actions: j.actions || [],
        data: {
          ...(j.data || {}),
          url: j.data?.url || j.url || "/",
          apiBase: j.data?.apiBase || "",
        },
      };
    }
  } catch (_) {
    /* ignore */
  }

  try {
    console.log("[SW] push received", {
      tag: payload.tag,
      title: payload.title,
      bodyLen: String(payload.body || "").length,
    });
  } catch (_) {}

  const type = payload.data?.type || "";
  const cleanText = (v) =>
    typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";

  // Format OS notifications per type for clearer, less “dull” UX.
  // (Payloads already provide good defaults; we just improve consistency.)
  let displayTitle = payload.title || "Notification";
  let displayBody = payload.body ? cleanText(payload.body) : "";

  switch (type) {
    case "incoming_call": {
      const ct = payload.data?.callType;
      displayTitle = ct === "video" ? "Incoming video call" : "Incoming audio call";
      displayBody = payload.body ? cleanText(payload.body) : displayBody || "Someone is calling you";
      break;
    }
    case "chat_message": {
      displayTitle = payload.title || "New message";
      displayBody = displayBody || "You have a new chat message";
      break;
    }
    case "meeting_reminder": {
      displayTitle = payload.title || "Meeting reminder";
      displayBody = displayBody || "Your meeting is coming up";
      break;
    }
    case "meeting_invite": {
      displayTitle = payload.title || "Meeting invite";
      displayBody = displayBody || "You were added to a meeting";
      break;
    }
    case "meeting_absentee": {
      displayTitle = payload.title || "Join your meeting";
      displayBody = displayBody || "The meeting is live—join the room";
      break;
    }
    case "meeting_started": {
      displayTitle = payload.title || "Meeting is live";
      displayBody = displayBody || "Join the meeting now";
      break;
    }
    case "ticket_new": {
      displayTitle = payload.title || "New support ticket";
      displayBody = displayBody || "A new ticket was created";
      break;
    }
    case "ticket_assigned":
    case "ticket_assigned_customer": {
      displayTitle = payload.title || "Ticket assigned";
      displayBody = displayBody || "Your ticket has been assigned";
      break;
    }
    case "ticket_status": {
      displayTitle = payload.title || "Ticket update";
      displayBody = displayBody || "Ticket status changed";
      break;
    }
    case "leave_request": {
      displayTitle = payload.title || "Leave request";
      displayBody = displayBody || "A new leave request was submitted";
      break;
    }
    case "leave_decision": {
      displayTitle = payload.title || "Leave decision";
      displayBody = displayBody || "Your leave request was updated";
      break;
    }
    case "group_add": {
      displayTitle = payload.title || "Added to a group";
      displayBody = displayBody || "You were added to a group chat";
      break;
    }
    default: {
      // Leave existing payload.title/body as-is for unknown types.
      break;
    }
  }

  // If any client page is open, also send a debug message to it.
  // This helps differentiate "push not received" vs "notification blocked".
  try {
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          clientList.forEach((c) => {
            try {
              c.postMessage({
                type: "EIP_PUSH_RECEIVED",
                payload: {
                  title: payload.title,
                  body: payload.body,
                  tag: payload.tag,
                  url: payload.url,
                },
              });
            } catch (_) {}
          });
        })
    );
  } catch (_) {}

  const options = {
    body: displayBody,
    icon: "/vite.svg",
    badge: "/vite.svg",
    tag: payload.tag,
    data: payload.data,
    // Some browsers can throw if `actions` is provided but empty/invalid.
    // Only include actions when there are actual action buttons.
    requireInteraction: payload.data?.type === "incoming_call",
    vibrate: [160, 70, 160],
  };

  if (Array.isArray(payload.actions) && payload.actions.length > 0) {
    options.actions = payload.actions;
  }

  event.waitUntil(
    (async () => {
      try {
        // Helps debug cases where the push is received but nothing appears.
        console.log("[SW] showNotification()", {
          title: displayTitle,
          bodyLen: String(displayBody || "").length,
          tag: payload.tag,
          permission: Notification.permission,
        });
        await self.registration.showNotification(displayTitle, options);
      } catch (err) {
        console.error("[SW] showNotification failed:", err);
      }
    })()
  );
});

function openOrFocusUrl(url) {
  const target = url || "/";
  return clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      let origin;
      try {
        origin = new URL(target, self.location.origin).origin;
      } catch {
        origin = self.location.origin;
      }
      for (const c of clientList) {
        try {
          if (c.url.startsWith(origin)) {
            if (c.navigate) {
              c.navigate(target);
            }
            return c.focus();
          }
        } catch (_) {
          /* continue */
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    });
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  n.close();
  const d = n.data || {};
  const action = event.action || "";
  const apiBase = d.apiBase || "";

  if (d.type === "incoming_call" && d.token) {
    if (action === "reject") {
      event.waitUntil(
        fetch(`${apiBase}/api/push/call-response`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: d.token, accept: false }),
        }).catch(() => {})
      );
      return;
    }
    // Redirect only when user explicitly hits "accept" or clicks the notification body.
    // For "accept", also append `autoAccept=1` so the in-app call screen can auto-start.
    if (action === "accept" || action === "") {
      let openUrl = d.url || "/";
      if (action === "accept") {
        try {
          const u = new URL(openUrl, self.location.origin);
          u.searchParams.set("autoAccept", "1");
          u.searchParams.set("tab", "messages");
          openUrl = u.toString();
        } catch {
          // If URL parsing fails, fall back to redirect without autoAccept.
        }
      }
      event.waitUntil(openOrFocusUrl(openUrl));
    }
    return;
  }

  if (d.type === "chat_message") {
    if (action === "reply") {
      const replyText = typeof event.reply === "string" ? event.reply.trim() : "";
      const replyToken = d.replyToken;

      // Quick reply (no page open required) if we have a valid signed token.
      if (replyToken && replyText) {
        event.waitUntil(
          fetch(`${apiBase}/api/push/reply-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: replyToken, reply: replyText }),
          })
            .then(async () => {
              // If a tab is already open, focus it. Don't force-open a new tab.
              const target = d.url || "/";
              const origin = self.location.origin;
              const windowClients = await clients.matchAll({
                type: "window",
                includeUncontrolled: true,
              });
              for (const c of windowClients) {
                if (c.url && c.url.startsWith(origin) && "focus" in c) {
                  c.focus();
                  // Optionally navigate if possible.
                  if ("navigate" in c && typeof c.navigate === "function") c.navigate(target);
                  return;
                }
              }
            })
            .catch(() => {})
        );
        return;
      }

      // Fallback: open/focus composer with draft so the user can send manually.
      const base = d.url || self.location.origin + "/";
      const urlObj = new URL(base, self.location.origin);
      urlObj.searchParams.set("focusComposer", "1");
      if (replyText) urlObj.searchParams.set("draft", replyText);
      event.waitUntil(openOrFocusUrl(urlObj.toString()));
      return;
    }

    // Default click for chat notifications: open the chat page.
    event.waitUntil(openOrFocusUrl(d.url || "/"));
    return;
  }

  event.waitUntil(openOrFocusUrl(d.url || "/"));
});
