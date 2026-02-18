import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Send,
  LogOut,
  Ticket,
  MessageCircle,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  HeadphonesIcon,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { BACKEND_URL } from "../../../config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/context/AuthContextProvider";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, socket } = useAuthContext();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "",
  });
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTickets = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/tickets/my-tickets`, { headers });
      setTickets(res.data.tickets);
    } catch (err) {
      console.error("Fetch tickets error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (ticketId) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/tickets/${ticketId}/messages`, { headers });
      setMessages(res.data.messages);
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Socket: join ticket room when selected
  useEffect(() => {
    if (!socket || !selectedTicket) return;
    socket.emit("ticket-join", { ticketId: selectedTicket._id });
    return () => {
      socket.emit("ticket-leave", { ticketId: selectedTicket._id });
    };
  }, [socket, selectedTicket?._id]);

  // Socket: listen for new messages
  useEffect(() => {
    if (!socket) return;
    const handler = ({ ticketId, message }) => {
      if (selectedTicket && ticketId === selectedTicket._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };
    socket.on("ticket-new-message", handler);
    return () => socket.off("ticket-new-message", handler);
  }, [socket, selectedTicket?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket._id);
    setShowCreateForm(false);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/tickets`, ticketForm, { headers });
      toast.success("Ticket created successfully");
      setTicketForm({ title: "", description: "", priority: "medium", category: "" });
      setShowCreateForm(false);
      fetchTickets();
      setSelectedTicket(res.data.ticket);
      fetchMessages(res.data.ticket._id);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;
    setSendingMessage(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/tickets/${selectedTicket._id}/messages`,
        { content: newMessage.trim() },
        { headers }
      );
      // Emit via socket
      socket?.emit("ticket-message", {
        ticketId: selectedTicket._id,
        message: res.data.message,
      });
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data.message._id)) return prev;
        return [...prev, res.data.message];
      });
      setNewMessage("");
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customerData");
    localStorage.removeItem("token");
    navigate("/customer/login");
  };

  const userId = user?.id || user?._id;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-white dark:bg-zinc-950 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <HeadphonesIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">Customer Support</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {user?.first_name} {user?.last_name}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Ticket List */}
        <div className="w-80 border-r flex flex-col bg-white dark:bg-zinc-950 flex-shrink-0">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">My Tickets</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowCreateForm(true);
                setSelectedTicket(null);
              }}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Ticket className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No tickets yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Create your first support ticket
                </p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-3 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedTicket?._id === ticket._id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm truncate flex-1">
                      {ticket.title}
                    </h3>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        statusColors[ticket.status]
                      }`}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        priorityColors[ticket.priority]
                      }`}
                    >
                      {ticket.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {ticket.ticket_number}
                    </span>
                  </div>
                  {ticket.assigned_agent_id?.user_id && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Agent: {ticket.assigned_agent_id.user_id.first_name}{" "}
                      {ticket.assigned_agent_id.user_id.last_name}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {showCreateForm ? (
            /* Create Ticket Form */
            <div className="flex-1 flex items-start justify-center p-8 overflow-y-auto">
              <div className="w-full max-w-lg">
                <h2 className="text-xl font-bold mb-6">Create Support Ticket</h2>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of your issue"
                      value={ticketForm.title}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      placeholder="Provide details about your issue..."
                      value={ticketForm.description}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, description: e.target.value })
                      }
                      required
                      rows={5}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <select
                        id="priority"
                        value={ticketForm.priority}
                        onChange={(e) =>
                          setTicketForm({ ...ticketForm, priority: e.target.value })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        placeholder="e.g. Billing, Technical"
                        value={ticketForm.category}
                        onChange={(e) =>
                          setTicketForm({ ...ticketForm, category: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create Ticket"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : selectedTicket ? (
            /* Ticket Chat View */
            <>
              {/* Ticket Header */}
              <div className="h-14 border-b flex items-center gap-3 px-4 flex-shrink-0 bg-white dark:bg-zinc-950">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8"
                  onClick={() => setSelectedTicket(null)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {selectedTicket.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedTicket.ticket_number}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        statusColors[selectedTicket.status]
                      }`}
                    >
                      {selectedTicket.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                {selectedTicket.status !== "resolved" &&
                  selectedTicket.status !== "closed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await axios.put(
                            `${BACKEND_URL}/tickets/${selectedTicket._id}/status`,
                            { status: "resolved" },
                            { headers }
                          );
                          toast.success("Ticket resolved!");
                          setSelectedTicket({ ...selectedTicket, status: "resolved" });
                          fetchTickets();
                        } catch {
                          toast.error("Failed to resolve");
                        }
                      }}
                      className="gap-1 text-green-600"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve
                    </Button>
                  )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-zinc-900">
                {messages.map((msg) => {
                  if (msg.message_type === "system") {
                    return (
                      <div key={msg._id} className="flex justify-center">
                        <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }
                  const isMe = msg.sender_id?._id === userId || msg.sender_id === userId;
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-white dark:bg-zinc-800 border rounded-bl-md"
                        }`}
                      >
                        {!isMe && msg.sender_id?.first_name && (
                          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">
                            {msg.sender_id.first_name} {msg.sender_id.last_name}
                            {msg.sender_id.user_type === "employee" && " (Agent)"}
                            {msg.sender_id.user_type === "admin" && " (Admin)"}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            isMe ? "text-blue-200" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {selectedTicket.assigned_agent_id &&
              selectedTicket.status !== "resolved" &&
              selectedTicket.status !== "closed" ? (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t flex gap-2 bg-white dark:bg-zinc-950"
                >
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              ) : !selectedTicket.assigned_agent_id ? (
                <div className="p-4 border-t bg-yellow-50 dark:bg-yellow-900/20 text-center">
                  <div className="flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">
                      Waiting for an agent to be assigned...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t bg-green-50 dark:bg-green-900/20 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-sm">This ticket has been resolved.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageCircle className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="font-semibold text-lg">Welcome to Support</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Select a ticket to view the conversation, or create a new ticket
                to get help.
              </p>
              <Button
                className="mt-6 bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4" />
                Create Ticket
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
