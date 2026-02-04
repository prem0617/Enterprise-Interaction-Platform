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
import { useAudioCall } from "../hooks/useAudioCall";

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
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const { socket, user } = useAuthContext();
  const currentUserName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"
    : "User";

  const token = localStorage.getItem("token");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  /** Same mechanism as chat: HTTP request -> server emits "incoming-audio-call" to target socket (getReceiverSocketId + io.to().emit) */
  const requestCallApi = useCallback(
    async (toUserId) => {
      const { data } = await axios.post(
        `${BACKEND_URL}/call/request`,
        { toUserId: String(toUserId) },
        axiosConfig
      );
      return data;
    },
    [token]
  );

  const audioCall = useAudioCall(socket, user?.id, currentUserName, requestCallApi);

  useEffect(() => {
    fetchDirectChats();
    getUserChannel();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChat?._id) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat?._id]);

  useEffect(() => {
    if (audioCall.errorMessage) {
      toast.error(audioCall.errorMessage);
    }
  }, [audioCall.errorMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const markMessagesAsSeenInChannel = async (channelId) => {
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

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 300);
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
        if (response.data.is_new) {
          await fetchDirectChats();
        }

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
    if (chat?._id) {
      await markMessagesAsSeenInChannel(chat._id);
    }
  };

  const leaveGroup = async (id) => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/chat/channels/${id}/leave`,
        {},
        axiosConfig
      );
      console.log(response);
    } catch (error) {
      const err = error.response.data.error || "Failed to leave Group";
      toast.error(err);
      console.log(error);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    const messageContent = newMessage.trim();
    const parentMessageId = replyingTo?._id || null;

    setNewMessage("");
    setReplyingTo(null);
    setSendingMessage(true);

    try {
      const payload = {
        content: messageContent,
      };

      if (parentMessageId) {
        payload.parent_message_id = parentMessageId;
      }

      const response = await axios.post(
        `${BACKEND_URL}/direct_chat/channels/${selectedChat._id}/messages`,
        payload,
        axiosConfig
      );

      if (response.data.data) {
        setMessages([...messages, response.data.data]);
        setSendingMessage(false);
        await fetchDirectChats();
        await getUserChannel();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent);
      if (parentMessageId) {
        setReplyingTo(messages.find((m) => m._id === parentMessageId));
      }
      toast.error("Failed to send message. Please try again.");
    } finally {
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

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
      const response = await axios.post(
        `${BACKEND_URL}/chat/`,
        payload,
        axiosConfig
      );
      console.log({ response });
      toast.success("Group created successfully!");
      await getUserChannel();
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsers([]);
      setDepartment("");
    } catch (error) {
      console.log({ error });
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
      const channels = response.data.channels;
      setUserChannel(channels);
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

      if (response.data.added_members?.length > 0) {
        toast.success(
          `Successfully added ${response.data.added_members.length} member(s)`
        );
      }

      if (response.data.errors?.length > 0) {
        console.warn("Some members could not be added:", response.data.errors);
        toast.error(
          `${response.data.errors.length} member(s) could not be added`
        );
      }

      await getUserChannel();

      return response.data;
    } catch (error) {
      console.error("Error adding members:", error);
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
      console.error("Error updating member role:", error);
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
      console.error("Error removing member:", error);
      toast.error(error.response?.data?.error || "Failed to remove member");
      throw error;
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId?.toString());
  };

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

    const handleMessagesSeen = (data) => {
      const { channel_id, seen_by_user_id, message_ids } = data;

      if (selectedChat && selectedChat._id === channel_id) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (message_ids.includes(msg._id)) {
              const existingSeen = msg.seen_by || [];
              const alreadySeen = existingSeen.some(
                (s) => s.user_id._id === seen_by_user_id
              );

              if (!alreadySeen) {
                return {
                  ...msg,
                  seen_by: [
                    ...existingSeen,
                    {
                      user_id: { _id: seen_by_user_id },
                      seen_at: new Date(),
                    },
                  ],
                  seen_count: (msg.seen_count || 0) + 1,
                };
              }
            }
            return msg;
          })
        );
      }

      fetchDirectChats();
      getUserChannel();
    };

    const appendMessage = (data) => {
      console.log("📨 Received new_message event:", data);

      if (selectedChat && data.channel_id === selectedChat._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data._id)) return prev;

          // ✅ FIX: Ensure sender information exists
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

          console.log("✅ Message with sender:", messageWithSender);
          return [...prev, messageWithSender];
        });

        if (!data.is_own) {
          markMessagesAsSeenInChannel(data.channel_id);
        }
      } else {
        fetchDirectChats();
        getUserChannel();
      }

      const updateChatList = (chats) => {
        return chats.map((chat) => {
          if (chat._id === data.channel_id) {
            return {
              ...chat,
              last_message: {
                ...data,
                sender_id: data.sender_id || chat.last_message?.sender_id,
              },
              unread_count:
                selectedChat?._id === data.channel_id
                  ? 0
                  : (chat.unread_count || 0) + 1,
            };
          }
          return chat;
        });
      };

      setDirectChats((prev) => updateChatList(prev));
      setUserChannel((prev) => updateChatList(prev));
    };

    function handleLeaveChannel(id) {
      setUserChannel((prev) => prev.filter((channel) => channel._id !== id));
    }

    const handleOnlineUsersUpdate = (data) => {
      console.log("Online users updated:", data.onlineUsers);
      setOnlineUsers(data.onlineUsers || []);
    };

    const handleChannelNameUpdate = (data) => {
      const { channel_id, name } = data;

      setUserChannel((prevChannels) =>
        prevChannels.map((channel) =>
          channel._id === channel_id ? { ...channel, name } : channel
        )
      );

      setDirectChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === channel_id ? { ...chat, name } : chat
        )
      );

      setSelectedChat((prevSelected) => {
        if (prevSelected && prevSelected._id === channel_id) {
          return { ...prevSelected, name };
        }
        return prevSelected;
      });
    };

    socket.on("channel_name_changed", handleChannelNameUpdate);
    socket.on("direct_chat_created", handleNewChat);
    socket.on("new_message", appendMessage);
    socket.on("messages_seen", handleMessagesSeen);
    socket.on("leavechannel", handleLeaveChannel);
    socket.on("online-users-updated", handleOnlineUsersUpdate);

    return () => {
      socket.off("direct_chat_created", handleNewChat);
      socket.off("new_message", appendMessage);
      socket.off("messages_seen", handleMessagesSeen);
      socket.off("leavechannel", handleLeaveChannel);
      socket.off("online-users-updated", handleOnlineUsersUpdate);
      socket.off("channel_name_changed", handleChannelNameUpdate);
    };
  }, [socket, selectedChat]);

  const sortChatsByLastMessage = (chats) => {
    return [...chats].sort((a, b) => {
      const aTime = a.last_message?.created_at
        ? new Date(a.last_message.created_at).getTime()
        : new Date(a.created_at).getTime();
      const bTime = b.last_message?.created_at
        ? new Date(b.last_message.created_at).getTime()
        : new Date(b.created_at).getTime();

      return bTime - aTime;
    });
  };

  const getAllChats = () => {
    const allChats = [...directChats, ...userChannel].filter(Boolean);

    const uniqueChats = allChats.filter(
      (chat, index, self) =>
        chat?._id && index === self.findIndex((c) => c?._id === chat._id)
    );

    let filteredByTab = uniqueChats;

    if (activeTab === "direct") {
      filteredByTab = uniqueChats.filter(
        (chat) => chat.channel_type === "direct"
      );
    } else if (activeTab === "groups") {
      filteredByTab = uniqueChats.filter(
        (chat) => chat.channel_type === "group"
      );
    }

    if (chatSearchQuery.trim()) {
      const query = chatSearchQuery.toLowerCase();

      filteredByTab = filteredByTab.filter((chat) => {
        if (chat.channel_type === "direct") {
          const userName = chat.other_user?.full_name?.toLowerCase() || "";
          const userEmail = chat.other_user?.email?.toLowerCase() || "";
          return userName.includes(query) || userEmail.includes(query);
        }

        const groupName = chat.name?.toLowerCase() || "";
        return groupName.includes(query);
      });
    }

    return sortChatsByLastMessage(filteredByTab);
  };

  const displayedChats = getAllChats().filter((chat) => chat && chat._id);

  const getChatDisplayInfo = (chat = {}) => {
    if (chat.channel_type === "direct") {
      return {
        name: chat.other_user?.full_name || "Unknown User",
        subtitle: chat.other_user?.email || "",
        initials: `${chat.other_user?.first_name?.[0] || ""}${
          chat.other_user?.last_name?.[0] || ""
        }`,
        isGroup: false,
      };
    }

    return {
      name: chat.name || "Group Chat",
      subtitle: `${chat.member_count || 0} members${
        chat.department ? ` • ${chat.department}` : ""
      }`,
      initials: chat.name?.[0] || "G",
      isGroup: true,
    };
  };

  const openChannelSettings = () => {
    if (selectedChat?.channel_type === "group") {
      setShowSettingsModal(true);
    }
  };

  const getParentMessage = (parentMessageId) => {
    return messages.find((m) => m._id === parentMessageId);
  };

  console.log({ displayedChats });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Left Sidebar - Chats List */}
      <div className="w-80 bg-white border-r-2 border-teal-200 flex flex-col">
        <div className="p-4 border-b-2 border-teal-100">
          <div className="flex flex-col items-center gap-2 mb-3">
            <h2 className="text-xl font-bold text-teal-900">Messages</h2>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
              >
                New Chat
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
              >
                Create Group
              </button>
            </div>
          </div>

          <div className="flex gap-1 mb-3 p-1 bg-teal-50 rounded-lg">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "all"
                  ? "bg-white text-teal-900 shadow-sm"
                  : "text-teal-600 hover:text-teal-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("direct")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "direct"
                  ? "bg-white text-teal-900 shadow-sm"
                  : "text-teal-600 hover:text-teal-900"
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "groups"
                  ? "bg-white text-teal-900 shadow-sm"
                  : "text-teal-600 hover:text-teal-900"
              }`}
            >
              Groups
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-400" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-teal-50 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {directMessageLoading ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
              <p className="text-teal-700 font-medium mb-1">Loading</p>
            </div>
          ) : displayedChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                <Search className="w-8 h-8 text-teal-500" />
              </div>
              <p className="text-teal-700 font-medium mb-1">
                {chatSearchQuery ? "No results found" : "No conversations yet"}
              </p>
              <p className="text-sm text-teal-600">
                {chatSearchQuery
                  ? "Try a different search term"
                  : "Click 'New Chat' to start messaging"}
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
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-teal-100 hover:bg-teal-50 ${
                    selectedChat?._id === chat._id
                      ? "bg-gradient-to-r from-cyan-50 to-blue-50 border-l-4 border-l-cyan-500"
                      : ""
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                        displayInfo.isGroup
                          ? "bg-gradient-to-br from-cyan-500 to-blue-500"
                          : "bg-gradient-to-br from-purple-500 to-pink-500"
                      }`}
                    >
                      {displayInfo.isGroup ? (
                        <Users className="w-6 h-6" />
                      ) : (
                        displayInfo.initials
                      )}
                    </div>
                    {!displayInfo.isGroup && userOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                    {chat.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-white">
                        {chat.unread_count > 9 ? "9+" : chat.unread_count}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3
                          className={`font-semibold text-teal-900 truncate ${
                            chat.unread_count > 0 ? "font-bold" : ""
                          }`}
                        >
                          {displayInfo.name}
                        </h3>
                        {displayInfo.isGroup && (
                          <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full font-medium flex-shrink-0">
                            Group
                          </span>
                        )}
                      </div>
                    </div>
                    {!displayInfo.isGroup && (
                      <p className="text-xs text-teal-600 mb-1">
                        {userOnline ? (
                          <span className="text-green-600 font-medium">
                            Online
                          </span>
                        ) : (
                          <span className="text-gray-500">Offline</span>
                        )}
                      </p>
                    )}
                    {chat.last_message && (
                      <div className="flex items-center gap-1">
                        <p
                          className={`text-xs truncate flex-1 ${
                            chat.unread_count > 0
                              ? "text-teal-900 font-semibold"
                              : "text-teal-600"
                          }`}
                        >
                          {chat.last_message.content}
                        </p>
                        {chat.unread_count > 0 && (
                          <span className="px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full font-bold min-w-[20px] text-center flex-shrink-0">
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

      {/* Right Side - Chat Window */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b-2 border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      selectedChat.channel_type === "group"
                        ? "bg-gradient-to-br from-cyan-500 to-blue-500"
                        : "bg-gradient-to-br from-purple-500 to-pink-500"
                    }`}
                  >
                    {selectedChat.channel_type === "group" ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <>
                        {selectedChat.other_user?.first_name?.[0]}
                        {selectedChat.other_user?.last_name?.[0]}
                      </>
                    )}
                  </div>
                  {selectedChat.channel_type === "direct" &&
                    isUserOnline(selectedChat.other_user?._id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                </div>
                <div>
                  <h3 className="font-semibold text-teal-900">
                    {selectedChat.channel_type === "group"
                      ? selectedChat.name
                      : selectedChat.other_user?.full_name}
                  </h3>
                  <p className="text-sm text-teal-600">
                    {selectedChat.channel_type === "group"
                      ? `${selectedChat.member_count || 0} members${
                          selectedChat.department
                            ? ` • ${selectedChat.department}`
                            : ""
                        }`
                      : isUserOnline(selectedChat.other_user?._id)
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
<<<<<<< HEAD
                {selectedChat.channel_type === "direct" && selectedChat.other_user && (
                  <button
                    onClick={() =>
                      audioCall.startCall(
                        String(selectedChat.other_user._id),
                        selectedChat.other_user.full_name ||
                          `${selectedChat.other_user.first_name || ""} ${selectedChat.other_user.last_name || ""}`.trim()
                      )
                    }
                    disabled={audioCall.callState !== "idle"}
                    className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Voice call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                )}
                <button
                  disabled={
                    audioCall.callState !== "idle" &&
                    !(
                      selectedChat.channel_type === "direct" &&
                      selectedChat.other_user &&
                      String(selectedChat.other_user._id) === String(audioCall.remoteUser?.id)
                    )
                  }
                  className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Video call"
                >
=======
                {selectedChat.channel_type === "direct" &&
                  selectedChat.other_user && (
                    <button
                      onClick={() =>
                        audioCall.startCall(
                          selectedChat.other_user._id,
                          selectedChat.other_user.full_name ||
                            `${selectedChat.other_user.first_name || ""} ${
                              selectedChat.other_user.last_name || ""
                            }`.trim()
                        )
                      }
                      disabled={audioCall.callState !== "idle"}
                      className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Voice call"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  )}
                <button className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
>>>>>>> 68a4ef2715a24562c921287bcf4882cfc25f9ff6
                  <Video className="w-5 h-5" />
                </button>
                {selectedChat.channel_type === "group" && (
                  <button
                    onClick={openChannelSettings}
                    className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                    title="Channel Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
                {selectedChat?.member_count > 2 && (
                  <button
                    onClick={() => leaveGroup(selectedChat._id)}
                    className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-teal-50/30 to-cyan-50/30">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-10 h-10 text-teal-500" />
                </div>
                <p className="text-teal-700 font-medium mb-1">
                  Start the conversation
                </p>
                <p className="text-sm text-teal-600">
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

                  // ✅ FIX: Safely get sender name with fallback
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
                      <div className="group relative">
                        <div
                          className={`max-w-md px-4 py-2 rounded-2xl ${
                            message.is_own
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                              : "bg-white border-2 border-teal-200 text-teal-900"
                          }`}
                        >
                          {/* Replied message preview */}
                          {parentMessage && (
                            <div
                              className={`mb-2 pl-3 border-l-4 ${
                                message.is_own
                                  ? "border-white/50"
                                  : "border-cyan-500"
                              } py-1`}
                            >
                              <p
                                className={`text-xs font-semibold ${
                                  message.is_own
                                    ? "text-white/80"
                                    : "text-cyan-700"
                                }`}
                              >
                                {parentMessage.is_own
                                  ? "You"
                                  : parentMessage.sender?.first_name || "User"}
                              </p>
                              <p
                                className={`text-xs ${
                                  message.is_own
                                    ? "text-white/70"
                                    : "text-teal-600"
                                } truncate`}
                              >
                                {parentMessage.content}
                              </p>
                            </div>
                          )}

                          {/* Show sender name in group chats for received messages */}
                          {!message.is_own &&
                            selectedChat.channel_type === "group" && (
                              <p className="text-xs font-semibold text-teal-700 mb-1">
                                {senderName}
                              </p>
                            )}
                          <p className="text-sm">{message.content}</p>
                          <div
                            className={`flex items-center gap-1 justify-end mt-1 ${
                              message.is_own ? "text-white/70" : "text-teal-600"
                            }`}
                          >
                            <span className="text-xs">
                              {formatTime(message.created_at)}
                            </span>
                            {message.is_edited && (
                              <span className="text-xs ml-1">(edited)</span>
                            )}
                            {message.is_own && (
                              <div className="flex items-center gap-1">
                                {message.seen_count > 0 ? (
                                  <button
                                    onClick={() => showSeenByList(message)}
                                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                                    {selectedChat?.channel_type === "group" &&
                                      message.seen_count > 0 && (
                                        <span className="text-xs">
                                          {message.seen_count}
                                        </span>
                                      )}
                                  </button>
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-white/50" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reply button - appears on hover */}
                        <button
                          onClick={() => handleReply(message)}
                          className={`absolute top-0 ${
                            message.is_own
                              ? "left-0 -translate-x-10"
                              : "right-0 translate-x-10"
                          } p-1.5 bg-white border-2 border-teal-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-teal-50`}
                          title="Reply to this message"
                        >
                          <Reply className="w-4 h-4 text-teal-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Reply preview bar */}
          {replyingTo && (
            <div className="px-4 py-2 bg-teal-50 border-t-2 border-teal-200 flex items-center justify-between">
              <div className="flex-1 flex items-start gap-2">
                <Reply className="w-4 h-4 text-teal-600 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-teal-900">
                    Replying to{" "}
                    {replyingTo.is_own
                      ? "yourself"
                      : replyingTo.sender?.first_name || "User"}
                  </p>
                  <p className="text-sm text-teal-700 truncate">
                    {replyingTo.content}
                  </p>
                </div>
              </div>
              <button
                onClick={cancelReply}
                className="p-1 hover:bg-teal-100 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-teal-600" />
              </button>
            </div>
          )}

          <div className="p-4 border-t-2 border-teal-200 bg-white">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  replyingTo ? "Type your reply..." : "Type a message..."
                }
                disabled={sendingMessage}
                className="flex-1 px-4 py-2 bg-teal-50 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-teal-50/30 to-cyan-50/30">
          <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="w-12 h-12 text-teal-500" />
          </div>
          <h3 className="text-2xl font-bold text-teal-900 mb-2">
            Select a conversation
          </h3>
          <p className="text-teal-700 mb-6">
            Choose a chat or start a new conversation
          </p>
          <button
            onClick={() => setShowSearchModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            Start New Chat
          </button>
        </div>
      )}

      {/* Seen By Modal */}
      {showSeenByModal && selectedMessageSeenBy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b-2 border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-teal-900">Seen By</h3>
              </div>
              <button
                onClick={() => setShowSeenByModal(false)}
                className="p-1 hover:bg-teal-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-teal-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedMessageSeenBy.seen_by &&
              selectedMessageSeenBy.seen_by.length > 0 ? (
                <div className="space-y-3">
                  {selectedMessageSeenBy.seen_by.map((seen, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {seen.user_id?.first_name?.[0] || "U"}
                        {seen.user_id?.last_name?.[0] || ""}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-teal-900 truncate">
                          {seen.user_id?.first_name || "Unknown"}{" "}
                          {seen.user_id?.last_name || ""}
                        </p>
                        <p className="text-xs text-teal-600">
                          {new Date(seen.seen_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                      <CheckCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Eye className="w-12 h-12 text-teal-300 mb-3" />
                  <p className="text-teal-600">
                    No one has seen this message yet
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t-2 border-teal-100">
              <button
                onClick={() => setShowSeenByModal(false)}
                className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Close
              </button>
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
    </div>
  );
};

export default ChatInterface;
