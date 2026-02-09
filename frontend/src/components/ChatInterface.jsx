import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  Phone,
  Video,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  Loader2,
  Users,
  MessageCircle,
  Settings,
  Trash,
  X,
  Reply,
  Eye,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuthContext } from "../context/AuthContextProvider";
import CreateGroupModal from "./CreateGroupModal";
import StartChatModal from "./StartChatModal";
import ChannelSettingsModal from "./ChannelSettingsModal";
import IncomingCallModal from "./IncomingCallModal";
import OutgoingCallModal from "./OutgoingCallModal";
import ActiveCallBar from "./ActiveCallBar";
import GroupCallWaitingModal from "./GroupCallWaitingModal";
import GroupCallActiveBar from "./GroupCallActiveBar";
import GroupCallIncomingBanner from "./GroupCallIncomingBanner";
import { useAudioCall } from "../hooks/useAudioCall";
import { useGroupCall } from "../hooks/useGroupCall";

import { BACKEND_URL } from "../../config";

const ChatInterface = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [userChannel, setUserChannel] = useState([]);
  const [messageSeenStatus, setMessageSeenStatus] = useState({});
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [directChats, setDirectChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [directMessageLoading, setDirectMessageLoading] = useState(true);
  const [department, setDepartment] = useState("");
  const [countryRestriction, setCountryRestriction] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [roleUpdateTrigger, setRoleUpdateTrigger] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showSeenByModal, setShowSeenByModal] = useState(false);
  const [selectedMessageSeenBy, setSelectedMessageSeenBy] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [groupCallStatus, setGroupCallStatus] = useState(null);
  const [activeGroupCalls, setActiveGroupCalls] = useState({});
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const selectedChatRef = useRef(null);

  const { socket, user } = useAuthContext();

  useEffect(() => {
    if (!socket) {
      setSocketConnected(false);
      return;
    }

    const handleRoleChange = (data) => {
      console.log("Role change received:", data);
      const eventChannelId = data.channelId || data.channel_id;

      // Update userChannel with the new role
      setUserChannel((prevChannels) =>
        prevChannels.map((channel) => {
          if (channel._id === eventChannelId && channel.members) {
            return {
              ...channel,
              members: channel.members.map((member) => {
                const memberUserId = member.user_id?._id || member.user_id;
                const eventUserId =
                  data.member?.user_id?._id ||
                  data.member?.user_id ||
                  data.user_id;

                if (memberUserId === eventUserId) {
                  const newRole = data.member?.role || data.role;
                  return {
                    ...member,
                    role: newRole,
                    updatedAt: new Date().toISOString(),
                  };
                }
                return member;
              }),
            };
          }
          return channel;
        })
      );

      // Also update selectedChat if it's the current channel
      setSelectedChat((prevChat) => {
        if (prevChat?._id === eventChannelId && prevChat.members) {
          return {
            ...prevChat,
            members: prevChat.members.map((member) => {
              const memberUserId = member.user_id?._id || member.user_id;
              const eventUserId =
                data.member?.user_id?._id ||
                data.member?.user_id ||
                data.user_id;

              if (memberUserId === eventUserId) {
                const newRole = data.member?.role || data.role;
                return {
                  ...member,
                  role: newRole,
                  updatedAt: new Date().toISOString(),
                };
              }
              return member;
            }),
          };
        }
        return prevChat;
      });
    };

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    if (socket.connected) setSocketConnected(true);
    else setSocketConnected(false);

    socket.on("changesRole", handleRoleChange);
    socket.on("roleChanged", handleRoleChange);
    socket.on("role-changed", handleRoleChange);
    socket.on("updateRole", handleRoleChange);
    socket.on("memberRoleUpdated", handleRoleChange);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("changesRole", handleRoleChange);
      socket.off("roleChanged", handleRoleChange);
      socket.off("role-changed", handleRoleChange);
      socket.off("updateRole", handleRoleChange);
      socket.off("memberRoleUpdated", handleRoleChange);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  const currentUserName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"
    : "User";

  const token = localStorage.getItem("token");
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const requestCallApi = useCallback(
    async (toUserId) => {
      try {
        const { data } = await axios.post(
          `${BACKEND_URL}/call/request`,
          { toUserId: String(toUserId) },
          axiosConfig
        );
        return data;
      } catch (error) {
        if (error.response?.status === 409) {
          const errorMessage =
            error.response?.data?.message || "This person is on a call";
          toast.error(errorMessage, { duration: 1500 });
          throw new Error(errorMessage);
        }
        throw error;
      }
    },
    [token]
  );

  const checkOnlineApi = useCallback(
    async (userId) => {
      const { data } = await axios.get(
        `${BACKEND_URL}/call/online/${userId}`,
        axiosConfig
      );
      return data;
    },
    [token]
  );

  const checkUserCallStatusApi = useCallback(
    async (userId) => {
      const { data } = await axios.get(
        `${BACKEND_URL}/call/status/${userId}`,
        axiosConfig
      );
      return data;
    },
    [token]
  );

  const audioCall = useAudioCall(
    socket,
    user?.id,
    currentUserName,
    requestCallApi,
    checkOnlineApi
  );

  const startGroupCallApi = useCallback(
    async (channelId) => {
      const { data } = await axios.post(
        `${BACKEND_URL}/call/group/start`,
        { channelId },
        axiosConfig
      );
      return data;
    },
    [token]
  );

  const getGroupCallStatusApi = useCallback(
    async (channelId) => {
      const { data } = await axios.get(
        `${BACKEND_URL}/call/group/status/${channelId}`,
        axiosConfig
      );
      return data;
    },
    [token]
  );

  const joinGroupCallApi = useCallback(
    async (channelId) => {
      const { data } = await axios.post(
        `${BACKEND_URL}/call/group/join`,
        { channelId },
        axiosConfig
      );
      return data;
    },
    [token]
  );

  const leaveGroupCallApi = useCallback(
    async (channelId) => {
      const { data } = await axios.post(
        `${BACKEND_URL}/call/group/leave`,
        { channelId },
        axiosConfig
      );
      return data;
    },
    [token]
  );

  const groupCall = useGroupCall(
    socket,
    user?.id,
    currentUserName,
    startGroupCallApi,
    getGroupCallStatusApi,
    joinGroupCallApi,
    leaveGroupCallApi
  );

  // Keep ref in sync so socket handlers always see the latest selectedChat
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    fetchDirectChats();
    getUserChannel();
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    if (selectedChat?._id) fetchMessages(selectedChat._id);
  }, [selectedChat?._id]);

  useEffect(() => {
    if (
      selectedChat?.channel_type === "group" &&
      selectedChat?._id &&
      getGroupCallStatusApi
    ) {
      getGroupCallStatusApi(selectedChat._id)
        .then((res) => {
          if (res?.active)
            setGroupCallStatus({
              active: true,
              channelId: res.channelId,
              channelName: res.channelName,
              initiatorId: res.initiatorId,
              initiatorName: res.initiatorName,
            });
          else setGroupCallStatus(null);
        })
        .catch(() => setGroupCallStatus(null));
    } else {
      setGroupCallStatus(null);
    }
  }, [
    selectedChat?._id,
    selectedChat?.channel_type,
    getGroupCallStatusApi,
    groupCall?.groupCallState,
  ]);

  useEffect(() => {
    if (!socket || !getGroupCallStatusApi) return;
    const checkAllGroupCalls = async () => {
      const groupChats = userChannel.filter(
        (chat) => chat.channel_type === "group"
      );
      const callStatuses = await Promise.allSettled(
        groupChats.map((chat) => getGroupCallStatusApi(chat._id))
      );
      const activeCalls = {};
      callStatuses.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value?.active)
          activeCalls[groupChats[index]._id] = true;
      });
      setActiveGroupCalls(activeCalls);
    };
    checkAllGroupCalls();
    const interval = setInterval(checkAllGroupCalls, 5000);
    const handleGroupCallStarted = ({ channelId }) =>
      setActiveGroupCalls((prev) => ({ ...prev, [channelId]: true }));
    const handleGroupCallEnded = ({ channelId }) => {
      setActiveGroupCalls((prev) => {
        const next = { ...prev };
        delete next[channelId];
        return next;
      });
      if (selectedChat?._id && String(selectedChat._id) === String(channelId))
        setGroupCallStatus(null);
    };
    socket.on("group-call-started", handleGroupCallStarted);
    socket.on("group-call-ended", handleGroupCallEnded);
    return () => {
      clearInterval(interval);
      socket.off("group-call-started", handleGroupCallStarted);
      socket.off("group-call-ended", handleGroupCallEnded);
    };
  }, [socket, userChannel, getGroupCallStatusApi, selectedChat?._id]);

  useEffect(() => {
    if (audioCall.errorMessage) toast.error(audioCall.errorMessage);
  }, [audioCall.errorMessage]);
  useEffect(() => {
    if (groupCall.errorMessage) toast.error(groupCall.errorMessage);
  }, [groupCall.errorMessage]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const fetchDirectChats = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/direct_chat/list`,
        axiosConfig
      );
      setDirectChats(response.data.chats || []);
    } catch (error) {
      console.error("Error fetching direct chats:", error);
    } finally {
      setDirectMessageLoading(false);
    }
  };

  // const markMessagesAsSeenInChannel = async (channelId) => {
  //   try {
  //     await axios.post(
  //       `${BACKEND_URL}/direct_chat/channels/${channelId}/messages/seen`,
  //       {},
  //       axiosConfig
  //     );
  //     await fetchDirectChats();
  //     await getUserChannel();
  //   } catch (error) {
  //     console.error("Error marking messages as seen:", error);
  //   }
  // };

  const markMessagesAsSeenInChannel = async (channelId) => {
    // Get unseen messages before making the API call
    const unseenMessages = messages.filter(
      (msg) =>
        msg.sender_id !== user?.id &&
        !msg.seen_by?.some((s) => s.user_id._id === user?.id)
    );

    if (unseenMessages.length === 0) {
      return; // No messages to mark as seen
    }

    // Optimistically update UI immediately
    const currentUserSeenEntry = {
      user_id: {
        _id: user?.id,
        first_name: user?.first_name || "You",
        last_name: user?.last_name || "",
        full_name: `${user?.first_name || "You"} ${
          user?.last_name || ""
        }`.trim(),
        email: user?.email || "",
      },
      seen_at: new Date(),
    };

    setMessages((prev) =>
      prev.map((msg) => {
        // Check if this message should be marked as seen
        const shouldMarkSeen =
          msg.sender_id !== user?.id &&
          !msg.seen_by?.some((s) => s.user_id._id === user?.id);

        if (shouldMarkSeen) {
          return {
            ...msg,
            seen_by: [...(msg.seen_by || []), currentUserSeenEntry],
            seen_count: (msg.seen_count || 0) + 1,
            is_seen: true,
          };
        }
        return msg;
      })
    );

    // Now make the API call
    try {
      await axios.post(
        `${BACKEND_URL}/direct_chat/channels/${channelId}/messages/seen`,
        {},
        axiosConfig
      );
      await fetchDirectChats();
      await getUserChannel();
    } catch (error) {
      console.error("Error marking messages as seen:", error);
      // Optionally: Rollback the optimistic update on error
      // For seen messages, we typically don't rollback as it's not critical
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      setLoadingMessages(true);
      const response = await axios.get(
        `${BACKEND_URL}/direct_chat/channels/${channelId}/messages`,
        axiosConfig
      );
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await axios.get(
        `${BACKEND_URL}/direct_chat/search?query=${query}`,
        axiosConfig
      );
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(query), 300);
  };

  const startChat = async (user) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${BACKEND_URL}/direct_chat/start`,
        { user_id: user._id },
        axiosConfig
      );
      if (response.data.channel) {
        if (response.data.is_new) await fetchDirectChats();
        const chatData = {
          _id: response.data.channel._id,
          channel_type: "direct",
          other_user: {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name,
            email: user.email,
          },
          unread_count: 0,
        };
        setSelectedChat(chatData);
        setShowSearchModal(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (chat) => {
    setSelectedChat(chat);
    setReplyingTo(null);
    if (chat?._id) await markMessagesAsSeenInChannel(chat._id);
  };

  const leaveGroup = async (id) => {
    try {
      await axios.post(
        `${BACKEND_URL}/chat/channels/${id}/leave`,
        {},
        axiosConfig
      );
      setSelectedChat(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to leave Group");
    }
  };

  const handleReply = (message) => setReplyingTo(message);
  const cancelReply = () => setReplyingTo(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;
    const messageContent = newMessage.trim();
    const parentMessageId = replyingTo?._id || null;
    setNewMessage("");
    setReplyingTo(null);
    setSendingMessage(true);
    try {
      const payload = { content: messageContent };
      if (parentMessageId) payload.parent_message_id = parentMessageId;
      const response = await axios.post(
        `${BACKEND_URL}/direct_chat/channels/${selectedChat._id}/messages`,
        payload,
        axiosConfig
      );
      if (response.data.data) {
        // Use functional updater with dedup to avoid overwriting
        // messages that arrived via socket while the request was in-flight
        const newMsg = response.data.data;
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setSendingMessage(false);
        await fetchDirectChats();
        await getUserChannel();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent);
      if (parentMessageId)
        setReplyingTo(messages.find((m) => m._id === parentMessageId));
      toast.error("Failed to send message. Please try again.");
    }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const createGroup = async () => {
    const payload = {
      channel_type: "group",
      name: groupName,
      country_restriction: countryRestriction || null,
      ticket_id: ticketId || null,
      department,
      member_ids: selectedUsers.map((u) => u._id),
    };
    try {
      setCreateGroupLoading(true);
      await axios.post(`${BACKEND_URL}/chat/`, payload, axiosConfig);
      toast.success("Group created successfully!");
      await getUserChannel();
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsers([]);
      setDepartment("");
    } catch (error) {
      toast.error("Failed to create group. Please try again.");
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const getUserChannel = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/chat/channels`,
        axiosConfig
      );
      setUserChannel(response.data.channels);
    } catch (error) {
      console.log({ error });
    }
  };

  const addMembersToChannel = async (channelId, memberIds) => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/chat/channels/${channelId}/members`,
        { member_ids: memberIds },
        axiosConfig
      );
      if (response.data.added_members?.length > 0)
        toast.success(
          `Successfully added ${response.data.added_members.length} member(s)`
        );
      if (response.data.errors?.length > 0)
        toast.error(
          `${response.data.errors.length} member(s) could not be added`
        );
      await getUserChannel();
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add members");
      throw error;
    }
  };

  const updateMemberRole = async (channelId, memberId, newRole) => {
    try {
      const response = await axios.put(
        `${BACKEND_URL}/chat/channels/${channelId}/members/${memberId}`,
        { role: newRole },
        axiosConfig
      );
      toast.success(`Successfully updated member role to ${newRole}`);
      await getUserChannel();
      return response.data;
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to update member role"
      );
      throw error;
    }
  };

  const removeMemberFromChannel = async (channelId, memberId) => {
    try {
      const response = await axios.delete(
        `${BACKEND_URL}/chat/channels/${channelId}/members/${memberId}`,
        axiosConfig
      );
      toast.success("Member removed successfully");
      await getUserChannel();
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove member");
      throw error;
    }
  };

  const isUserOnline = (userId) => onlineUsers.includes(userId?.toString());
  const showSeenByList = (message) => {
    setSelectedMessageSeenBy(message);
    setShowSeenByModal(true);
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (chat) => {
      setDirectChats((prev) => {
        if (prev.some((c) => c._id === chat._id)) return prev;
        return [chat, ...prev];
      });
    };

    // const handleMessagesSeen = (data) => {
    //   const { channel_id, seen_by_user_id, message_ids } = data;
    //   const currentChat = selectedChatRef.current;
    //   if (currentChat && currentChat._id === channel_id) {
    //     setMessages((prev) =>
    //       prev.map((msg) => {
    //         if (message_ids.includes(msg._id)) {
    //           const existingSeen = msg.seen_by || [];
    //           const alreadySeen = existingSeen.some(
    //             (s) => s.user_id._id === seen_by_user_id
    //           );
    //           if (!alreadySeen)
    //             return {
    //               ...msg,
    //               seen_by: [
    //                 ...existingSeen,
    //                 { user_id: { _id: seen_by_user_id }, seen_at: new Date() },
    //               ],
    //               seen_count: (msg.seen_count || 0) + 1,
    //             };
    //         }
    //         return msg;
    //       })
    //     );
    //   }
    //   fetchDirectChats();
    //   getUserChannel();
    // };

    const handleMessagesSeen = (data) => {
      const { channel_id, seen_by_user_id, seen_by_user, message_ids } = data;
      const currentChat = selectedChatRef.current;

      if (currentChat && currentChat._id === channel_id) {
        // Optimistically update messages immediately
        setMessages((prev) =>
          prev.map((msg) => {
            if (message_ids.includes(msg._id)) {
              const existingSeen = msg.seen_by || [];
              const alreadySeen = existingSeen.some(
                (s) => s.user_id._id === seen_by_user_id
              );

              if (!alreadySeen) {
                // Create the new seen_by entry with complete user info
                const newSeenBy = {
                  user_id: {
                    _id: seen_by_user_id,
                    first_name: seen_by_user?.first_name || "Unknown",
                    last_name: seen_by_user?.last_name || "User",
                    full_name:
                      seen_by_user?.full_name ||
                      `${seen_by_user?.first_name || "Unknown"} ${
                        seen_by_user?.last_name || "User"
                      }`,
                    email: seen_by_user?.email || "",
                  },
                  seen_at: new Date(),
                };

                return {
                  ...msg,
                  seen_by: [...existingSeen, newSeenBy],
                  seen_count: (msg.seen_count || 0) + 1,
                };
              }
            }
            return msg;
          })
        );
      }

      // Update chat lists
      fetchDirectChats();
      getUserChannel();
    };

    const appendMessage = (data) => {
      const currentChat = selectedChatRef.current;
      if (currentChat && data.channel_id === currentChat._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data._id)) return prev;
          const messageWithSender = {
            ...data,
            sender: data.sender || {
              _id: data.sender_id,
              first_name: data.sender?.first_name || "Unknown",
              last_name: data.sender?.last_name || "User",
              full_name: data.sender?.full_name || "Unknown User",
              email: data.sender?.email || "",
              user_type: data.sender?.user_type || "user",
            },
          };
          return [...prev, messageWithSender];
        });
        if (!data.is_own) markMessagesAsSeenInChannel(data.channel_id);
      } else {
        fetchDirectChats();
        getUserChannel();
      }
      const updateChatList = (chats) =>
        chats.map((chat) => {
          if (chat._id === data.channel_id)
            return {
              ...chat,
              last_message: {
                ...data,
                sender_id: data.sender_id || chat.last_message?.sender_id,
              },
              unread_count:
                currentChat?._id === data.channel_id
                  ? 0
                  : (chat.unread_count || 0) + 1,
            };
          return chat;
        });
      setDirectChats((prev) => updateChatList(prev));
      setUserChannel((prev) => updateChatList(prev));
    };

    function handleLeaveChannel(id) {
      setUserChannel((prev) => prev.filter((channel) => channel._id !== id));
    }

    const handleOnlineUsersUpdate = (data) =>
      setOnlineUsers(data.onlineUsers || []);

    const handleChannelNameUpdate = (data) => {
      const { channel_id, name } = data;
      setUserChannel((prev) =>
        prev.map((ch) => (ch._id === channel_id ? { ...ch, name } : ch))
      );
      setDirectChats((prev) =>
        prev.map((ch) => (ch._id === channel_id ? { ...ch, name } : ch))
      );
      setSelectedChat((prev) => {
        if (prev && prev._id === channel_id) return { ...prev, name };
        return prev;
      });
    };

    const handleNewGroup = (data) => {
      console.log("handleNewGroup", data);
      setUserChannel((prev) => {
        if (prev.some((ch) => ch._id === data._id)) return prev;
        return [data, ...prev];
      });
    };

    socket.on("channel_name_changed", handleChannelNameUpdate);
    socket.on("direct_chat_created", handleNewChat);
    socket.on("group_created", handleNewGroup);
    socket.on("new_message", appendMessage);
    socket.on("messages_seen", handleMessagesSeen);
    socket.on("leavechannel", handleLeaveChannel);
    socket.on("online-users-updated", handleOnlineUsersUpdate);

    // Request current online users now that the listener is set up.
    // This covers the case where the broadcast was sent before this
    // component mounted (e.g. user navigated to Messages tab after login).
    socket.emit("request-online-users");

    return () => {
      socket.off("direct_chat_created", handleNewChat);
      socket.off("new_message", appendMessage);
      socket.off("messages_seen", handleMessagesSeen);
      socket.off("leavechannel", handleLeaveChannel);
      socket.off("online-users-updated", handleOnlineUsersUpdate);
      socket.off("channel_name_changed", handleChannelNameUpdate);
    };
  }, [socket]);

  const sortChatsByLastMessage = (chats) =>
    [...chats].sort((a, b) => {
      const aTime = a.last_message?.created_at
        ? new Date(a.last_message.created_at).getTime()
        : new Date(a.created_at).getTime();
      const bTime = b.last_message?.created_at
        ? new Date(b.last_message.created_at).getTime()
        : new Date(b.created_at).getTime();
      return bTime - aTime;
    });

  const getAllChats = () => {
    const allChats = [...directChats, ...userChannel].filter(Boolean);
    const uniqueChats = allChats.filter(
      (chat, index, self) =>
        chat?._id && index === self.findIndex((c) => c?._id === chat._id)
    );
    let filteredByTab = uniqueChats;
    if (activeTab === "direct")
      filteredByTab = uniqueChats.filter(
        (chat) => chat.channel_type === "direct"
      );
    else if (activeTab === "groups")
      filteredByTab = uniqueChats.filter(
        (chat) => chat.channel_type === "group"
      );
    if (chatSearchQuery.trim()) {
      const query = chatSearchQuery.toLowerCase();
      filteredByTab = filteredByTab.filter((chat) => {
        if (chat.channel_type === "direct") {
          const userName = chat.other_user?.full_name?.toLowerCase() || "";
          const userEmail = chat.other_user?.email?.toLowerCase() || "";
          return userName.includes(query) || userEmail.includes(query);
        }
        return (chat.name?.toLowerCase() || "").includes(query);
      });
    }
    return sortChatsByLastMessage(filteredByTab);
  };

  const displayedChats = getAllChats().filter((chat) => chat && chat._id);

  const getChatDisplayInfo = (chat = {}) => {
    if (chat.channel_type === "direct")
      return {
        name: chat.other_user?.full_name || "Unknown User",
        subtitle: chat.other_user?.email || "",
        initials: `${chat.other_user?.first_name?.[0] || ""}${
          chat.other_user?.last_name?.[0] || ""
        }`,
        isGroup: false,
      };
    return {
      name: chat.name || "Group Chat",
      subtitle: `${chat.member_count || 0} members${
        chat.department ? ` \u00B7 ${chat.department}` : ""
      }`,
      initials: chat.name?.[0] || "G",
      isGroup: true,
    };
  };

  const openChannelSettings = () => {
    if (selectedChat?.channel_type === "group") setShowSettingsModal(true);
  };
  const getParentMessage = (parentMessageId) =>
    messages.find((m) => m._id === parentMessageId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-slate-950">
      {/* Sidebar */}
      <div className="w-80 bg-slate-900 border-r border-slate-700/50 flex flex-col">
        <div className="p-3 border-b border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Messages</h2>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-500 transition"
              >
                New Chat
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-2.5 py-1 border border-slate-600 text-slate-300 rounded-md text-xs font-medium hover:bg-slate-800 transition"
              >
                Group
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 mb-2.5 p-0.5 bg-slate-800 rounded-lg">
            {["all", "direct", "groups"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === tab
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {directMessageLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin mb-2" />
              <p className="text-xs text-slate-500">Loading...</p>
            </div>
          ) : displayedChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <MessageCircle className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-sm text-slate-400 font-medium">
                {chatSearchQuery ? "No results" : "No conversations"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {chatSearchQuery
                  ? "Try different keywords"
                  : "Start a new chat"}
              </p>
            </div>
          ) : (
            displayedChats.map((chat) => {
              const displayInfo = getChatDisplayInfo(chat);
              const userOnline =
                chat.channel_type === "direct" &&
                isUserOnline(chat.other_user?._id);
              return (
                <div
                  key={
                    chat._id ?? `${chat.channel_type}-${chat.name ?? "chat"}`
                  }
                  onClick={() => selectChat(chat)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-slate-800/50 ${
                    selectedChat?._id === chat._id
                      ? "bg-indigo-500/10 border-l-2 border-l-indigo-500"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0 ${
                        displayInfo.isGroup ? "bg-slate-700" : "bg-indigo-500"
                      }`}
                    >
                      {displayInfo.isGroup ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        displayInfo.initials
                      )}
                    </div>
                    {!displayInfo.isGroup && userOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={`text-sm truncate ${
                          chat.unread_count > 0
                            ? "font-semibold text-white"
                            : "font-medium text-slate-300"
                        }`}
                      >
                        {displayInfo.name}
                      </h3>
                      {displayInfo.isGroup && (
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">
                          Group
                        </span>
                      )}
                    </div>
                    {/* Call indicators */}
                    {!displayInfo.isGroup &&
                      chat.other_user &&
                      audioCall.callState !== "idle" &&
                      audioCall.remoteUser &&
                      String(chat.other_user._id) ===
                        String(audioCall.remoteUser.id) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-medium text-emerald-400">
                            On call
                          </span>
                        </div>
                      )}
                    {displayInfo.isGroup &&
                      chat._id &&
                      activeGroupCalls[chat._id] && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-medium text-emerald-400">
                            Active call
                          </span>
                        </div>
                      )}
                    {chat.last_message && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <p
                          className={`text-xs truncate flex-1 ${
                            chat.unread_count > 0
                              ? "text-slate-300 font-medium"
                              : "text-slate-500"
                          }`}
                        >
                          {chat.last_message.content}
                        </p>
                        {chat.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full font-semibold min-w-[18px] text-center">
                            {chat.unread_count > 99 ? "99+" : chat.unread_count}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-slate-900">
          {/* Chat Header */}
          <div className="h-14 px-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs ${
                    selectedChat.channel_type === "group"
                      ? "bg-slate-700"
                      : "bg-indigo-500"
                  }`}
                >
                  {selectedChat.channel_type === "group" ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <>
                      {selectedChat.other_user?.first_name?.[0]}
                      {selectedChat.other_user?.last_name?.[0]}
                    </>
                  )}
                </div>
                {selectedChat.channel_type === "direct" &&
                  isUserOnline(selectedChat.other_user?._id) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                  )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {selectedChat.channel_type === "group"
                    ? selectedChat.name
                    : selectedChat.other_user?.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedChat.channel_type === "group"
                    ? `${selectedChat.member_count || 0} members${
                        selectedChat.department
                          ? ` \u00B7 ${selectedChat.department}`
                          : ""
                      }`
                    : isUserOnline(selectedChat.other_user?._id)
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {selectedChat.channel_type === "direct" &&
                selectedChat.other_user && (
                  <>
                    <button
                      onClick={async () => {
                        if (!isUserOnline(selectedChat.other_user._id)) {
                          toast.error("User is offline", { duration: 1500 });
                          return;
                        }
                        if (groupCall.groupCallState !== "idle") {
                          toast.error("You are currently in a group call", {
                            duration: 1500,
                          });
                          return;
                        }
                        try {
                          const callStatus = await checkUserCallStatusApi(
                            selectedChat.other_user._id
                          );
                          if (callStatus.inCall) {
                            toast.error(
                              `${
                                selectedChat.other_user.first_name ||
                                "This person"
                              } is on a call`,
                              { duration: 1500 }
                            );
                            return;
                          }
                          audioCall.startCall(
                            String(selectedChat.other_user._id),
                            selectedChat.other_user.full_name ||
                              `${selectedChat.other_user.first_name || ""} ${
                                selectedChat.other_user.last_name || ""
                              }`.trim()
                          );
                        } catch (error) {
                          audioCall.startCall(
                            String(selectedChat.other_user._id),
                            selectedChat.other_user.full_name ||
                              `${selectedChat.other_user.first_name || ""} ${
                                selectedChat.other_user.last_name || ""
                              }`.trim()
                          );
                        }
                      }}
                      disabled={
                        audioCall.callState !== "idle" ||
                        !socket ||
                        groupCall.groupCallState !== "idle" ||
                        !isUserOnline(selectedChat.other_user._id)
                      }
                      className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (!isUserOnline(selectedChat.other_user._id)) {
                          toast.error("User is offline", { duration: 1500 });
                          return;
                        }
                        toast("Video call coming soon...", { duration: 1500 });
                      }}
                      disabled={
                        (audioCall.callState !== "idle" &&
                          !(
                            selectedChat.channel_type === "direct" &&
                            selectedChat.other_user &&
                            String(selectedChat.other_user._id) ===
                              String(audioCall.remoteUser?.id)
                          )) ||
                        groupCall.groupCallState !== "idle" ||
                        !isUserOnline(selectedChat.other_user._id)
                      }
                      className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </>
                )}
              {selectedChat.channel_type === "group" && (
                <>
                  <button
                    onClick={() =>
                      toast("Video call coming soon...", { duration: 1500 })
                    }
                    disabled={groupCall.groupCallState !== "idle"}
                    className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  {groupCall.groupCallState === "idle" &&
                    !groupCallStatus?.active &&
                    selectedChat.user_role === "admin" && (
                      <button
                        onClick={() =>
                          groupCall.startGroupCall(
                            selectedChat._id,
                            selectedChat.name
                          )
                        }
                        disabled={
                          !socket ||
                          groupCall.groupCallState !== "idle" ||
                          audioCall.callState !== "idle"
                        }
                        className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                  <button
                    onClick={openChannelSettings}
                    className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              )}
              {selectedChat?.member_count > 2 && (
                <button
                  onClick={() => leaveGroup(selectedChat._id)}
                  className="p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Group Call Banner */}
          {((groupCall.groupCallState === "incoming" &&
            selectedChat?._id &&
            String(selectedChat._id) === String(groupCall.activeChannelId)) ||
            (groupCall.groupCallState === "idle" &&
              groupCallStatus?.active &&
              selectedChat?._id &&
              String(selectedChat._id) ===
                String(groupCallStatus.channelId))) &&
          groupCall.groupCallState !== "waiting" &&
          groupCall.groupCallState !== "active" &&
          groupCall.groupCallState !== "joined" ? (
            <div className="px-4 pt-2">
              <GroupCallIncomingBanner
                channelName={
                  groupCall.groupCallState === "incoming"
                    ? groupCall.activeChannelName
                    : groupCallStatus?.channelName
                }
                initiatorName={
                  groupCall.groupCallState === "incoming"
                    ? groupCall.initiatorName
                    : groupCallStatus?.initiatorName
                }
                onJoin={() => {
                  if (
                    groupCall.groupCallState !== "idle" &&
                    groupCall.groupCallState !== "incoming"
                  ) {
                    toast.error("You are currently in a group call", {
                      duration: 1500,
                    });
                    return;
                  }
                  groupCall.joinGroupCall(
                    groupCall.groupCallState === "incoming"
                      ? groupCall.activeChannelId
                      : groupCallStatus.channelId,
                    groupCall.groupCallState === "incoming"
                      ? groupCall.activeChannelName
                      : groupCallStatus.channelName,
                    groupCall.groupCallState === "incoming"
                      ? groupCall.initiatorId
                      : groupCallStatus.initiatorId,
                    groupCall.groupCallState === "incoming"
                      ? groupCall.initiatorName
                      : groupCallStatus.initiatorName
                  );
                }}
                onDismiss={
                  groupCall.groupCallState === "incoming"
                    ? groupCall.dismissIncoming
                    : () => {}
                }
              />
            </div>
          ) : null}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-950">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Send className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-sm text-slate-400 font-medium">
                  Start the conversation
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedChat.channel_type === "group"
                    ? `Send a message to ${selectedChat.name}`
                    : `Send a message to ${selectedChat.other_user?.first_name}`}
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const parentMessage = message.parent_message_id
                    ? getParentMessage(message.parent_message_id)
                    : null;
                  const senderName = message.sender
                    ? `${message.sender.first_name || ""} ${
                        message.sender.last_name || ""
                      }`.trim() || "User"
                    : "User";
                  return (
                    <div
                      key={message._id}
                      className={`flex ${
                        message.is_own ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className="group relative max-w-md">
                        <div
                          className={`px-3.5 py-2 rounded-xl text-sm ${
                            message.is_own
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-800 border border-slate-700/50 text-slate-100"
                          }`}
                        >
                          {parentMessage && (
                            <div
                              className={`mb-1.5 pl-2.5 border-l-2 ${
                                message.is_own
                                  ? "border-white/40"
                                  : "border-indigo-400"
                              } py-0.5`}
                            >
                              <p
                                className={`text-[11px] font-medium ${
                                  message.is_own
                                    ? "text-white/70"
                                    : "text-indigo-400"
                                }`}
                              >
                                {parentMessage.is_own
                                  ? "You"
                                  : parentMessage.sender?.first_name || "User"}
                              </p>
                              <p
                                className={`text-[11px] truncate ${
                                  message.is_own
                                    ? "text-white/60"
                                    : "text-slate-500"
                                }`}
                              >
                                {parentMessage.content}
                              </p>
                            </div>
                          )}
                          {!message.is_own &&
                            selectedChat.channel_type === "group" && (
                              <p className="text-[11px] font-semibold text-indigo-400 mb-0.5">
                                {senderName}
                              </p>
                            )}
                          <p className="leading-relaxed">{message.content}</p>
                          <div
                            className={`flex items-center gap-1 justify-end mt-1 ${
                              message.is_own
                                ? "text-white/60"
                                : "text-slate-500"
                            }`}
                          >
                            <span className="text-[10px]">
                              {formatTime(message.created_at)}
                            </span>
                            {message.is_own &&
                              (message.seen_count > 0 ? (
                                <button
                                  onClick={() => showSeenByList(message)}
                                  className="flex items-center gap-0.5 hover:opacity-80"
                                >
                                  <CheckCheck className="w-3 h-3 text-blue-400" />
                                  {selectedChat?.channel_type === "group" &&
                                    message.seen_count > 0 && (
                                      <span className="text-[10px]">
                                        {message.seen_count}
                                      </span>
                                    )}
                                </button>
                              ) : (
                                <Check className="w-3 h-3 text-white/40" />
                              ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleReply(message)}
                          className={`absolute top-0 ${
                            message.is_own
                              ? "left-0 -translate-x-8"
                              : "right-0 translate-x-8"
                          } p-1 bg-slate-800 border border-slate-700/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 shadow-sm`}
                        >
                          <Reply className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Reply Bar */}
          {replyingTo && (
            <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-between">
              <div className="flex-1 flex items-start gap-2">
                <Reply className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-300">
                    Replying to{" "}
                    {replyingTo.is_own
                      ? "yourself"
                      : replyingTo.sender?.first_name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {replyingTo.content}
                  </p>
                </div>
              </div>
              <button
                onClick={cancelReply}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900">
            {!socketConnected && (
              <div className="mb-2 flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                Connecting to chat...
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <button
                type="button"
                className="p-1.5 text-slate-500 hover:bg-slate-800 rounded-lg disabled:opacity-40"
                disabled={!socketConnected}
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  !socketConnected
                    ? "Connecting..."
                    : replyingTo
                    ? "Type your reply..."
                    : "Type a message..."
                }
                disabled={sendingMessage || !socketConnected}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={
                  !newMessage.trim() || sendingMessage || !socketConnected
                }
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950">
          <MessageCircle className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Select a conversation
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Choose a chat or start a new one
          </p>
          <button
            onClick={() => setShowSearchModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition"
          >
            Start New Chat
          </button>
        </div>
      )}

      {/* Seen By Modal */}
      {showSeenByModal && selectedMessageSeenBy && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700/50 shadow-xl max-w-sm w-full max-h-[70vh] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Seen by</h3>
              </div>
              <button
                onClick={() => setShowSeenByModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {selectedMessageSeenBy.seen_by?.length > 0 ? (
                <div className="space-y-1">
                  {selectedMessageSeenBy.seen_by.map((seen, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/50"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-400 font-medium text-[10px]">
                          {seen.user_id?.first_name?.[0] || "U"}
                          {seen.user_id?.last_name?.[0] || ""}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {seen.user_id?.first_name || "Unknown"}{" "}
                          {seen.user_id?.last_name || ""}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(seen.seen_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">
                    No one has seen this yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <StartChatModal
        show={showSearchModal}
        onClose={() => {
          setShowSearchModal(false);
          setSearchQuery("");
          setSearchResults([]);
        }}
        searchQuery={searchQuery}
        handleSearchInput={handleSearchInput}
        searchResults={searchResults}
        isSearching={isSearching}
        startChat={startChat}
        loading={loading}
      />
      <CreateGroupModal
        show={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setSearchQuery("");
          setSearchResults([]);
          setSelectedUsers([]);
          setGroupName("");
        }}
        groupName={groupName}
        setGroupName={setGroupName}
        searchQuery={searchQuery}
        setDepartment={setDepartment}
        handleSearchInput={handleSearchInput}
        searchResults={searchResults}
        selectedUsers={selectedUsers}
        setSelectedUsers={setSelectedUsers}
        isSearching={isSearching}
        createGroupLoading={createGroupLoading}
        createGroup={createGroup}
      />
      <ChannelSettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        channel={selectedChat}
        onAddMembers={addMembersToChannel}
        onUpdateRole={updateMemberRole}
        onRemoveMember={removeMemberFromChannel}
        handleSearch={handleSearch}
        searchResults={searchResults}
        isSearching={isSearching}
        roleUpdateTrigger={roleUpdateTrigger}
      />

      {audioCall.callState === "incoming" && (
        <IncomingCallModal
          remoteUser={audioCall.remoteUser}
          onAccept={audioCall.acceptCall}
          onReject={audioCall.rejectCall}
          errorMessage={audioCall.errorMessage}
        />
      )}
      {audioCall.callState === "calling" && (
        <OutgoingCallModal
          remoteUser={audioCall.remoteUser}
          onHangUp={audioCall.endCall}
        />
      )}
      {(audioCall.callState === "connecting" ||
        audioCall.callState === "active") && (
        <ActiveCallBar
          remoteUser={audioCall.remoteUser}
          remoteStream={audioCall.remoteStream}
          isMuted={audioCall.isMuted}
          onToggleMute={audioCall.toggleMute}
          onHangUp={audioCall.endCall}
          isConnecting={audioCall.callState === "connecting"}
          errorMessage={audioCall.errorMessage}
        />
      )}
      {groupCall.groupCallState === "waiting" && (
        <GroupCallWaitingModal
          channelName={groupCall.activeChannelName}
          onCancel={groupCall.leaveGroupCall}
        />
      )}
      {(groupCall.groupCallState === "active" ||
        groupCall.groupCallState === "joined") && (
        <GroupCallActiveBar
          channelName={groupCall.activeChannelName}
          participants={groupCall.participants}
          remoteStreams={groupCall.remoteStreams}
          isMuted={groupCall.isMuted}
          onToggleMute={groupCall.toggleMute}
          onHangUp={groupCall.leaveGroupCall}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
};

export default ChatInterface;
