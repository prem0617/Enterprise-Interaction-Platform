import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Smile,
  Paperclip,
  Loader2,
  Users,
  MessageCircle,
  Settings,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuthContext } from "../context/AuthContextProvider";
import CreateGroupModal from "./CreateGroupModal";
import StartChatModal from "./StartChatModal";
import ChannelSettingsModal from "./ChannelSettingsModal";

import { BACKEND_URL } from "../../config";

const ChatInterface = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [userChannel, setUserChannel] = useState([]);
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
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const { socket } = useAuthContext();

  const token = localStorage.getItem("token");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDirectChats = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/direct_chat/list",
        axiosConfig
      );
      setDirectChats(response.data.chats || []);
    } catch (error) {
      console.error("Error fetching direct chats:", error);
    } finally {
      setDirectMessageLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      setLoadingMessages(true);
      const response = await axios.get(
        `http://localhost:8000/api/direct_chat/channels/${channelId}/messages`,
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
        `http://localhost:8000/api/direct_chat/search?query=${query}`,
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
        "http://localhost:8000/api/direct_chat/start",
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

  const selectChat = (chat) => {
    setSelectedChat(chat);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    try {
      const response = await axios.post(
        `http://localhost:8000/api/direct_chat/channels/${selectedChat._id}/messages`,
        { content: messageContent },
        axiosConfig
      );

      if (response.data.data) {
        setMessages([...messages, response.data.data]);
        await fetchDirectChats();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
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
      const response = await axios.post(
        `${BACKEND_URL}/chat/channels`,
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
      console.log({ response });
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

      console.log("Members added:", response.data);

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

      console.log("Member role updated:", response.data);
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

      console.log("Member removed:", response.data);
      toast.success("Member removed successfully");

      await getUserChannel();

      return response.data;
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(error.response?.data?.error || "Failed to remove member");
      throw error;
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (chat) => {
      setDirectChats((prev) => {
        if (prev.some((c) => c._id === chat._id)) return prev;
        return [chat, ...prev];
      });
    };

    const appendMessage = (data) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === data._id)) return prev;
        return [...prev, data];
      });
    };

    socket.on("direct_chat_created", handleNewChat);
    socket.on("new_message", appendMessage);

    return () => {
      socket.off("direct_chat_created", handleNewChat);
      socket.off("new_message", appendMessage);
    };
  }, [socket]);

  const getAllChats = () => {
    const allChats = [...directChats, ...userChannel];

    const uniqueChats = allChats.filter(
      (chat, index, self) => index === self.findIndex((c) => c._id === chat._id)
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
      return filteredByTab.filter((chat) => {
        if (chat.channel_type === "direct") {
          const userName = chat.other_user?.full_name?.toLowerCase() || "";
          const userEmail = chat.other_user?.email?.toLowerCase() || "";
          return userName.includes(query) || userEmail.includes(query);
        } else {
          const groupName = chat.name?.toLowerCase() || "";
          return groupName.includes(query);
        }
      });
    }

    return filteredByTab;
  };

  const displayedChats = getAllChats();

  const getChatDisplayInfo = (chat) => {
    if (chat.channel_type === "direct") {
      return {
        name: chat.other_user?.full_name || "Unknown User",
        subtitle: chat.other_user?.email || "",
        initials: `${chat.other_user?.first_name?.[0] || ""}${
          chat.other_user?.last_name?.[0] || ""
        }`,
        isGroup: false,
      };
    } else {
      return {
        name: chat.name || "Group Chat",
        subtitle: `${chat.member_count || 0} members${
          chat.department ? ` • ${chat.department}` : ""
        }`,
        initials: chat.name?.[0] || "G",
        isGroup: true,
      };
    }
  };

  const openChannelSettings = () => {
    if (selectedChat?.channel_type === "group") {
      setShowSettingsModal(true);
    }
  };

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
              return (
                <div
                  key={chat._id}
                  onClick={() => selectChat(chat)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-teal-100 hover:bg-teal-50 ${
                    selectedChat?._id === chat._id
                      ? "bg-gradient-to-r from-cyan-50 to-blue-50 border-l-4 border-l-cyan-500"
                      : ""
                  }`}
                >
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-teal-900 truncate">
                          {displayInfo.name}
                        </h3>
                        {displayInfo.isGroup && (
                          <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full font-medium">
                            Group
                          </span>
                        )}
                      </div>
                      {chat.last_message && (
                        <span className="text-xs text-teal-600">
                          {formatTime(chat.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-teal-600 truncate">
                        {chat.last_message?.content ||
                          displayInfo.subtitle ||
                          "No messages yet"}
                      </p>
                    </div>
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
                      : selectedChat.other_user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
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
                <button className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
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
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${
                      message.is_own ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-2xl ${
                        message.is_own
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                          : "bg-white border-2 border-teal-200 text-teal-900"
                      }`}
                    >
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
                        {message.is_own && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

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
                placeholder="Type a message..."
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
    </div>
  );
};

export default ChatInterface;
