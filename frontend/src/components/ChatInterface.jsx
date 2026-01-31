import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  X,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { useAuthContext } from "../context/AuthContextProvider";

const ChatInterface = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [directChats, setDirectChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [directMessageLoading, setDirectMessageLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const { socket } = useAuthContext();
  console.log({ socket });

  // const currentUser = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Fetch direct chats on mount
  useEffect(() => {
    fetchDirectChats();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages when chat is selected
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
      console.log(response);
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

    // Debounce search
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
        // Add to direct chats if new
        if (response.data.is_new) {
          await fetchDirectChats();
        }

        // Select the chat
        const chatData = {
          _id: response.data.channel._id,
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

        // Update the chat list to reflect the new message
        await fetchDirectChats();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message in input if sending failed
      setNewMessage(messageContent);
      alert("Failed to send message. Please try again.");
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

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  // console.log(socket);
  console.log(messages);
  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (chat) => {
      setDirectChats((prev) => {
        // prevent duplicates
        if (prev.some((c) => c._id === chat._id)) return prev;
        return [chat, ...prev];
      });
    };

    const appendMessage = (data) => {
      setMessages((prev) => {
        // prevent duplicates by _id
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

  // if (directMessageLoading) return <div>Loading</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Left Sidebar - Chats List */}
      <div className="w-80 bg-white border-r-2 border-teal-200 flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b-2 border-teal-100">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xl font-bold text-teal-900">Messages</h2>
            <button
              onClick={() => setShowSearchModal(true)}
              className="ml-auto px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              New Chat
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-teal-50 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {directMessageLoading ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
              <p className="text-teal-700 font-medium mb-1">Loading</p>
              <p className="text-sm text-teal-600"></p>
            </div>
          ) : directChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                <Search className="w-8 h-8 text-teal-500" />
              </div>
              <p className="text-teal-700 font-medium mb-1">
                No conversations yet
              </p>
              <p className="text-sm text-teal-600">
                Click "New Chat" to start messaging
              </p>
            </div>
          ) : (
            directChats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => selectChat(chat)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-teal-100 hover:bg-teal-50 ${
                  selectedChat?._id === chat._id
                    ? "bg-gradient-to-r from-cyan-50 to-blue-50 border-l-4 border-l-cyan-500"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {chat.other_user?.first_name?.[0]}
                  {chat.other_user?.last_name?.[0]}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-teal-900 truncate">
                      {chat.other_user?.full_name}
                    </h3>
                    {chat.last_message && (
                      <span className="text-xs text-teal-600">
                        {formatTime(chat.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-teal-600 truncate">
                      {chat.last_message?.content || "No messages yet"}
                    </p>
                    {/* {chat.unread_count > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs rounded-full font-semibold">
                        {chat.unread_count}
                      </span>
                    )} */}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Chat Window */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="p-4 border-b-2 border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedChat.other_user?.first_name?.[0]}
                  {selectedChat.other_user?.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-teal-900">
                    {selectedChat.other_user?.full_name}
                  </h3>
                  <p className="text-sm text-teal-600">
                    {selectedChat.other_user?.email}
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
                <button className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
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
                  Send a message to {selectedChat.other_user?.first_name}
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
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

          {/* Message Input */}
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
            <Search className="w-12 h-12 text-teal-500" />
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

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-teal-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-teal-900">
                  Start New Chat
                </h2>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-6">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-teal-500" />
                  </div>
                  <p className="text-teal-700 font-medium">No users found</p>
                  <p className="text-sm text-teal-600">
                    Try searching with a different name or email
                  </p>
                </div>
              ) : !searchQuery ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-teal-500" />
                  </div>
                  <p className="text-teal-700 font-medium">Search for users</p>
                  <p className="text-sm text-teal-600">
                    Enter a email to find people
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 hover:bg-teal-50 rounded-lg transition-colors border-2 border-teal-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.first_name?.[0]}
                          {user.last_name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-teal-900">
                            {user.full_name}
                          </h3>
                          <p className="text-sm text-teal-600">{user.email}</p>
                          {user.employee_info && (
                            <p className="text-xs text-teal-500">
                              {user.employee_info.department} •{" "}
                              {user.employee_info.position}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startChat(user)}
                        disabled={loading}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {user.has_existing_chat ? "Open Chat" : "Start Chat"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
