import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Search,
  Send,
  Plus,
  MessageSquare,
  Users,
  User,
  MoreVertical,
  Check,
  CheckCheck,
  Loader2,
  X,
  Hash,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BACKEND_URL } from "../../../config";

const SOCKET_URL = "http://localhost:8000";

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [mobileShowChat, setMobileShowChat] = useState(false);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserId = useRef(null);

  // Get current user ID from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId.current = payload.id;
      } catch (e) {
        console.error("Token parse error:", e);
      }
    }
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available users for new chat
  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/messages/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableUsers(res.data.users || []);
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    socketRef.current = io(`${SOCKET_URL}/messages`, {
      auth: { token }
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to message socket");
    });

    socketRef.current.on("new-message", ({ conversationId, message }) => {
      if (selectedConversation?._id === conversationId) {
        // Only add if not already in messages (avoid duplicates from our own HTTP + socket combo)
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
      // Update conversation list
      setConversations(prev => prev.map(c => 
        c._id === conversationId 
          ? { ...c, last_message: message, last_message_at: message.created_at }
          : c
      ).sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)));
    });

    socketRef.current.on("conversation-updated", ({ conversationId, lastMessage, lastMessageAt }) => {
      setConversations(prev => prev.map(c => 
        c._id === conversationId 
          ? { ...c, last_message: { content: lastMessage }, last_message_at: lastMessageAt }
          : c
      ).sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)));
    });

    socketRef.current.on("user-typing", ({ conversationId, userId, userName }) => {
      if (selectedConversation?._id === conversationId) {
        setTypingUsers(prev => ({ ...prev, [userId]: userName }));
      }
    });

    socketRef.current.on("user-stop-typing", ({ conversationId, userId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    fetchConversations();
    fetchAvailableUsers();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Join conversation room when selected
  useEffect(() => {
    if (selectedConversation && socketRef.current) {
      socketRef.current.emit("join-conversation", selectedConversation._id);
      fetchMessages(selectedConversation._id);
    }

    return () => {
      if (selectedConversation && socketRef.current) {
        socketRef.current.emit("leave-conversation", selectedConversation._id);
      }
    };
  }, [selectedConversation?._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async (conversationId) => {
    setMessagesLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/messages/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Stop typing indicator
    if (socketRef.current) {
      socketRef.current.emit("stop-typing", { conversationId: selectedConversation._id });
    }

    // Create optimistic message for immediate display
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      channel_id: selectedConversation._id,
      sender_id: { _id: currentUserId.current },
      content,
      message_type: "text",
      created_at: new Date().toISOString(),
      pending: true
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Send via HTTP for reliability (socket can be backup for real-time)
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/messages/conversations/${selectedConversation._id}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => 
        m._id === tempId ? res.data.message : m
      ));

      // Also emit via socket for real-time delivery to others
      if (socketRef.current) {
        socketRef.current.emit("send-message", {
          conversationId: selectedConversation._id,
          content,
          messageId: res.data.message._id // Tell socket this message already exists
        });
      }
    } catch (err) {
      console.error("Send message error:", err);
      // Remove failed optimistic message and restore input
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !socketRef.current) return;

    socketRef.current.emit("typing", { conversationId: selectedConversation._id });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop-typing", { conversationId: selectedConversation._id });
    }, 2000);
  };

  const startNewConversation = async (user) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/messages/conversations/direct`,
        { userId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const conversation = res.data.conversation;
      
      // Add to conversations if not exists
      setConversations(prev => {
        const exists = prev.find(c => c._id === conversation._id);
        if (!exists) {
          return [conversation, ...prev];
        }
        return prev;
      });
      
      setSelectedConversation(conversation);
      setShowNewChat(false);
      setMobileShowChat(true);
    } catch (err) {
      console.error("Start conversation error:", err);
    }
  };

  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getInitials = (name) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
      {/* Conversations Sidebar */}
      <div className={`w-full md:w-80 border-r flex flex-col ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Messages</h2>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9 bg-gray-100 dark:bg-gray-800 border-0"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No conversations yet</p>
              <p className="text-sm text-gray-400 mt-1">Start a new chat to begin messaging</p>
              <Button 
                className="mt-4 gap-2"
                onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv._id}
                onClick={() => { setSelectedConversation(conv); setMobileShowChat(true); }}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b ${
                  selectedConversation?._id === conv._id
                    ? "bg-violet-50 dark:bg-violet-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                    {conv.channel_type === "group" ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      getInitials(conv.name)
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{conv.name}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.last_message?.content || "No messages yet"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!mobileShowChat ? "hidden md:flex" : "flex"}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b flex items-center justify-between bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setMobileShowChat(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                    {selectedConversation.channel_type === "group" ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      getInitials(selectedConversation.name)
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConversation.name}</p>
                  {Object.keys(typingUsers).length > 0 && (
                    <p className="text-xs text-emerald-600">
                      {Object.values(typingUsers).join(", ")} typing...
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No messages yet</p>
                  <p className="text-sm text-gray-400">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_id?._id === currentUserId.current || msg.sender_id === currentUserId.current;
                  const senderName = msg.sender_id?.first_name 
                    ? `${msg.sender_id.first_name} ${msg.sender_id.last_name || ""}`.trim()
                    : "Unknown";
                  const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.sender_id?._id !== msg.sender_id?._id);

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                        {!isOwn && showAvatar && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                              {getInitials(senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div>
                          {!isOwn && showAvatar && (
                            <p className="text-xs text-gray-500 mb-1 ml-1">{senderName}</p>
                          )}
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-violet-600 text-white rounded-br-md"
                                : "bg-white dark:bg-gray-800 rounded-bl-md shadow-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <p className={`text-xs text-gray-400 mt-1 ${isOwn ? "text-right mr-1" : "ml-1"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button type="submit" disabled={!newMessage.trim() || sending}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Your Messages</h3>
              <p className="text-gray-500 text-sm mb-4">Select a conversation or start a new one</p>
              <Button 
                className="gap-2"
                onClick={() => { setShowNewChat(true); fetchAvailableUsers(); }}
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNewChat(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-lg">New Conversation</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewChat(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No users found</p>
                ) : (
                  filteredUsers.map(user => (
                    <div
                      key={user._id}
                      onClick={() => startNewConversation(user)}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">
                        {user.user_type}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
