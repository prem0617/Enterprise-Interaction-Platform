import Meeting from "../models/Meeting.js";
import { getActiveMeetingParticipantIds } from "../socket/socketServer.js";
import { sendPushToUser } from "./pushService.js";
import { buildMeetingDeepLink } from "./meetingPushNotify.js";

const pendingTimeouts = new Map();

export function clearMeetingAbsenteePush(meetingId) {
  const key = String(meetingId);
  const t = pendingTimeouts.get(key);
  if (t) clearTimeout(t);
  pendingTimeouts.delete(key);
}

/** Two minutes after meeting goes live, nudge invitees who never joined the socket room. */
export function scheduleMeetingAbsenteePush(meeting) {
  const id = String(meeting._id);
  clearMeetingAbsenteePush(id);

  const delayMs = 2 * 60 * 1000;
  const timeoutId = setTimeout(async () => {
    pendingTimeouts.delete(id);
    try {
      const m = await Meeting.findById(id).lean();
      if (!m || m.status !== "active") return;

      const hostId = String(m.host_id);
      // Re-read participants at execution time so we also cover users added
      // after the meeting became active.
      const participantIds = (m.participants || []).map((p) => String(p._id || p));
      const joined = new Set(getActiveMeetingParticipantIds(id));
      await Promise.all(
        participantIds.map(async (uid) => {
          if (uid === hostId) return;
          if (joined.has(uid)) return;
          const url = await buildMeetingDeepLink(uid, m.meeting_code);
          return sendPushToUser(uid, {
            title: "Join your meeting",
            body: `"${m.title}" is live — you're not in the room yet.`,
            url,
            tag: `eip-mtg-miss-${id}-${uid}`,
            data: { type: "meeting_absentee", meetingId: id },
          });
        })
      );
    } catch (e) {
      console.error("[PUSH] absentee meeting error:", e.message);
    }
  }, delayMs);

  pendingTimeouts.set(id, timeoutId);
}
