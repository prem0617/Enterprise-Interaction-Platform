import crypto from "crypto";

function getSecret() {
  return process.env.PUSH_CALL_SECRET || process.env.JWT_SECRET || "change-me-in-production";
}

/**
 * Signed token for incoming-call push: reject from SW without session, accept verified on open.
 * Payload: { fromUserId, toUserId, callType, exp }
 */
export function signCallPushToken({ fromUserId, toUserId, callType = "audio" }) {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = {
    fromUserId: String(fromUserId),
    toUserId: String(toUserId),
    callType: callType === "video" ? "video" : "audio",
    exp,
  };
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("hex");
  return Buffer.from(`${body}::${sig}`, "utf8").toString("base64url");
}

export function verifyCallPushToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const sep = raw.lastIndexOf("::");
    if (sep <= 0) return null;
    const body = raw.slice(0, sep);
    const sig = raw.slice(sep + 2);
    const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("hex");
    if (expected !== sig) return null;
    const payload = JSON.parse(body);
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!payload.fromUserId || !payload.toUserId) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Signed token for “quick reply” from Web Push notification (no JWT required).
 * Payload: { userId, channelId, parentMessageId, kind, exp }
 */
export function signChatReplyPushToken({ userId, channelId, messageId, kind = "group" }) {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = {
    userId: String(userId),
    channelId: String(channelId),
    parentMessageId: String(messageId),
    kind: kind === "direct" ? "direct" : "group",
    exp,
  };
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("hex");
  return Buffer.from(`${body}::${sig}`, "utf8").toString("base64url");
}

export function verifyChatReplyPushToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const sep = raw.lastIndexOf("::");
    if (sep <= 0) return null;
    const body = raw.slice(0, sep);
    const sig = raw.slice(sep + 2);
    const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("hex");
    if (expected !== sig) return null;
    const payload = JSON.parse(body);
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!payload.userId || !payload.channelId || !payload.parentMessageId) return null;
    if (!["group", "direct"].includes(payload.kind)) return null;
    return payload;
  } catch {
    return null;
  }
}
