import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Send,
  Ticket,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  Clock,
  MessageCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { BACKEND_URL } from "../../config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function EmployeeTicketView() {
  const { user, socket } = useAuthContext();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTickets = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/tickets/assigned`, { headers });
      setTickets(res.data.tickets);
    } catch (err) {
      console.error("Fetch assigned tickets error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (ticketId) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/tickets/${ticketId}/messages`, {
        headers,
      });
      setMessages(res.data.messages);
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Socket: join/leave ticket room
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

  const handleResolve = async () => {
    if (!selectedTicket) return;
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
  };

  const userId = user?.id || user?._id;

  return (
    <div className="flex h-full overflow-hidden border rounded-lg bg-white dark:bg-zinc-950">
      {/* Ticket List */}
      <div className="w-80 border-r flex flex-col flex-shrink-0">
        <div className="p-3 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Assigned Tickets
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No tickets assigned to you
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
                  {ticket.customer_id?.user_id && (
                    <span className="text-[10px] text-muted-foreground">
                      {ticket.customer_id.user_id.first_name}{" "}
                      {ticket.customer_id.user_id.last_name}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="h-14 border-b flex items-center gap-3 px-4 flex-shrink-0">
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
                  {selectedTicket.customer_id?.user_id && (
                    <span className="text-xs text-muted-foreground">
                      Customer: {selectedTicket.customer_id.user_id.first_name}{" "}
                      {selectedTicket.customer_id.user_id.last_name}
                    </span>
                  )}
                </div>
              </div>
              {selectedTicket.status !== "resolved" &&
                selectedTicket.status !== "closed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResolve}
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
                const isMe =
                  msg.sender_id?._id === userId || msg.sender_id === userId;
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-md"
                          : "bg-white dark:bg-zinc-800 border rounded-bl-md"
                      }`}
                    >
                      {!isMe && msg.sender_id?.first_name && (
                        <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mb-0.5">
                          {msg.sender_id.first_name} {msg.sender_id.last_name}
                          {msg.sender_id.user_type === "customer" &&
                            " (Customer)"}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isMe ? "text-indigo-200" : "text-muted-foreground"
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

            {/* Input */}
            {selectedTicket.status !== "resolved" &&
            selectedTicket.status !== "closed" ? (
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t flex gap-2"
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
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="font-semibold text-lg">Support Tickets</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select a ticket to start chatting with the customer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
