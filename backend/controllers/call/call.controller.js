import { getReceiverSocketId, io } from "../../socket/socketServer.js";

/**
 * Request a voice call to a user.
 * Same mechanism as chat: HTTP request -> server emits to target's socket (getReceiverSocketId + io.to().emit).
 */
export const requestCall = async (req, res) => {
  try {
    const { toUserId } = req.body;
    const callerUserId = req.userId;
    const callerUser = req.user;

    if (!toUserId) {
      return res.status(400).json({ error: "toUserId is required" });
    }

    const normalizedTo = String(toUserId);
    if (normalizedTo === String(callerUserId)) {
      return res.status(400).json({ error: "Cannot call yourself" });
    }

    const receiverSocketId = getReceiverSocketId(normalizedTo);

    if (!receiverSocketId) {
      return res.status(404).json({
        error: "User unavailable",
        message: "The user is not online or not connected.",
      });
    }

    const fromUserName =
      callerUser?.first_name && callerUser?.last_name
        ? `${callerUser.first_name} ${callerUser.last_name}`
        : "Someone";

    io.to(receiverSocketId).emit("incoming-audio-call", {
      fromUserId: callerUserId,
      fromUserName,
    });

    return res.json({
      success: true,
      message: "Call request sent",
    });
  } catch (error) {
    console.error("[CALL] requestCall error:", error);
    return res.status(500).json({ error: error.message });
  }
};
