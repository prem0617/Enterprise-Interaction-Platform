import User from "../models/User.js";
import { getPublicAppUrl, sendPushToUser } from "./pushService.js";

export async function buildMeetingDeepLink(userId, meetingCode) {
  const code = String(meetingCode || "").trim();
  const u = await User.findById(userId).select("user_type").lean();
  const base = getPublicAppUrl();
  const q = `tab=meetings&joinCode=${encodeURIComponent(code)}`;
  if (u?.user_type === "admin") return `${base}/adminDashboard?${q}`;
  if (u?.user_type === "customer") return `${base}/customer/dashboard?joinCode=${encodeURIComponent(code)}`;
  return `${base}/?${q}`;
}

export async function buildMessagesDeepLink(userId, channelId) {
  const u = await User.findById(userId).select("user_type").lean();
  const base = getPublicAppUrl();
  const q = `tab=messages&channel=${encodeURIComponent(channelId)}`;
  if (u?.user_type === "admin") return `${base}/adminDashboard?${q}`;
  return `${base}/?${q}`;
}

export async function notifyUsersAddedToMeeting({ meeting, userIds, actorName }) {
  const code = meeting.meeting_code;
  const title = meeting.title || "Meeting";
  await Promise.all(
    userIds.map(async (uid) => {
      const url = await buildMeetingDeepLink(uid, code);
      return sendPushToUser(uid, {
        title: "Added to a meeting",
        body: `${actorName} added you to "${title}"`,
        url,
        tag: `eip-mtg-inv-${meeting._id}-${uid}`,
        actions: [{ action: "open", title: "View meeting" }],
        data: { type: "meeting_invite", meetingId: String(meeting._id) },
      });
    })
  );
}
