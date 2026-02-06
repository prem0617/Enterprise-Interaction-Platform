import { useState, useEffect } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  Video,
  Calendar,
  X,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BACKEND_URL } from "../../../config";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MEETING_TYPES = [
  { value: "internal", label: "Internal Meeting", color: "bg-blue-500" },
  { value: "customer_consultation", label: "Customer Consultation", color: "bg-emerald-500" },
  { value: "support", label: "Support Call", color: "bg-amber-500" }
];

export default function MeetingsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchMeetings();
    fetchParticipants();
  }, [currentMonth, currentYear]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/meetings`, {
        params: { month: currentMonth + 1, year: currentYear },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(res.data.meetings || []);
    } catch (err) {
      console.error("Fetch meetings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/meetings/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParticipants(res.data.participants || []);
    } catch (err) {
      console.error("Fetch participants error:", err);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get days in month
  const getDaysInMonth = () => {
    const year = currentYear;
    const month = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const getMeetingsForDay = (date) => {
    return meetings.filter(m => {
      const meetingDate = new Date(m.scheduled_at);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDayClick = (day) => {
    setSelectedDate(day.date);
    setShowCreateModal(true);
  };

  const handleMeetingClick = (meeting, e) => {
    e.stopPropagation();
    setSelectedMeeting(meeting);
    setShowViewModal(true);
  };

  const handleDeleteMeeting = async (id) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/meetings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMeetings();
      setShowViewModal(false);
    } catch (err) {
      console.error("Delete meeting error:", err);
    }
  };

  const upcomingMeetings = meetings
    .filter(m => new Date(m.scheduled_at) >= new Date() && m.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule and manage your meetings</p>
        </div>
        <Button 
          onClick={() => { setSelectedDate(new Date()); setShowCreateModal(true); }}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          New Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg">
                  {MONTHS[currentMonth]} {currentYear}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {getDaysInMonth().map((day, index) => {
                    const dayMeetings = getMeetingsForDay(day.date);
                    const today = isToday(day.date);

                    return (
                      <div
                        key={index}
                        onClick={() => handleDayClick(day)}
                        className={`min-h-24 p-2 bg-white dark:bg-gray-900 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          !day.isCurrentMonth ? "opacity-40" : ""
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          today 
                            ? "h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center" 
                            : ""
                        }`}>
                          {day.day}
                        </div>
                        <div className="space-y-1">
                          {dayMeetings.slice(0, 2).map(meeting => {
                            const typeConfig = MEETING_TYPES.find(t => t.value === meeting.meeting_type);
                            return (
                              <div
                                key={meeting._id}
                                onClick={(e) => handleMeetingClick(meeting, e)}
                                className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${typeConfig?.color || "bg-gray-500"}`}
                              >
                                {new Date(meeting.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {meeting.title}
                              </div>
                            );
                          })}
                          {dayMeetings.length > 2 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dayMeetings.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings Sidebar */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-600" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No upcoming meetings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map(meeting => {
                  const typeConfig = MEETING_TYPES.find(t => t.value === meeting.meeting_type);
                  const meetingDate = new Date(meeting.scheduled_at);
                  const isToday = meetingDate.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={meeting._id}
                      onClick={() => { setSelectedMeeting(meeting); setShowViewModal(true); }}
                      className="p-3 rounded-lg border bg-white dark:bg-gray-900 hover:border-violet-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">{meeting.title}</h4>
                        <div className={`h-2 w-2 rounded-full ${typeConfig?.color || "bg-gray-500"}`} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {isToday ? "Today" : meetingDate.toLocaleDateString([], { month: "short", day: "numeric" })},{" "}
                          {meetingDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {meeting.participants?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{meeting.participants.length} participant(s)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal
          selectedDate={selectedDate}
          participants={participants}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchMeetings(); }}
        />
      )}

      {/* View Meeting Modal */}
      {showViewModal && selectedMeeting && (
        <ViewMeetingModal
          meeting={selectedMeeting}
          onClose={() => { setShowViewModal(false); setSelectedMeeting(null); }}
          onDelete={handleDeleteMeeting}
          onEdit={() => {
            setShowViewModal(false);
            setSelectedDate(new Date(selectedMeeting.scheduled_at));
            setShowCreateModal(true);
          }}
        />
      )}
    </div>
  );
}

// Create Meeting Modal Component
function CreateMeetingModal({ selectedDate, participants, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meeting_type: "internal",
    date: selectedDate ? selectedDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    time: "09:00",
    participants: [],
    recording_enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const scheduled_at = new Date(`${formData.date}T${formData.time}`);

      await axios.post(`${BACKEND_URL}/meetings`, {
        title: formData.title,
        description: formData.description,
        meeting_type: formData.meeting_type,
        scheduled_at: scheduled_at.toISOString(),
        participants: formData.participants,
        recording_enabled: formData.recording_enabled
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create meeting");
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (id) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(id)
        ? prev.participants.filter(p => p !== id)
        : [...prev.participants, id]
    }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white dark:bg-neutral-900">
          <h2 className="font-semibold text-lg">Schedule Meeting</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Meeting Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter meeting title"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Meeting description (optional)"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Time *</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meeting Type *</Label>
            <Select
              value={formData.meeting_type}
              onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}
            >
              <SelectTrigger className="bg-white dark:bg-neutral-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-neutral-800 z-[100]">
                {MEETING_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${type.color}`} />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search participants..."
                className="pl-9"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-lg">
              {filteredParticipants.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4">No participants found</p>
              ) : (
                filteredParticipants.map(p => (
                  <div
                    key={p._id}
                    onClick={() => toggleParticipant(p._id)}
                    className={`flex items-center gap-3 p-2 cursor-pointer transition-colors ${
                      formData.participants.includes(p._id)
                        ? "bg-violet-50 dark:bg-violet-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs">
                        {p.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate">{p.email}</p>
                    </div>
                    {formData.participants.includes(p._id) && (
                      <CheckCircle className="h-4 w-4 text-violet-600" />
                    )}
                  </div>
                ))
              )}
            </div>
            {formData.participants.length > 0 && (
              <p className="text-xs text-gray-500">{formData.participants.length} participant(s) selected</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recording"
              checked={formData.recording_enabled}
              onChange={(e) => setFormData({ ...formData, recording_enabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="recording" className="text-sm font-normal cursor-pointer">
              Enable recording
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule Meeting"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

// View Meeting Modal Component
function ViewMeetingModal({ meeting, onClose, onDelete, onEdit }) {
  const typeConfig = MEETING_TYPES.find(t => t.value === meeting.meeting_type);
  const meetingDate = new Date(meeting.scheduled_at);
  const hostName = `${meeting.host_id?.first_name || ""} ${meeting.host_id?.last_name || ""}`.trim();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl z-[51] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${typeConfig?.color || "bg-gray-500"} flex items-center justify-center`}>
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">{meeting.title}</h2>
              <Badge variant="outline" className="mt-1">{typeConfig?.label}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {meeting.description && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <p className="text-sm">{meeting.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <p className="font-medium">{meetingDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Time</p>
              <p className="font-medium">{meetingDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Host</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                  {hostName.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{hostName}</span>
            </div>
          </div>

          {meeting.participants?.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Participants ({meeting.participants.length})</p>
              <div className="flex flex-wrap gap-2">
                {meeting.participants.map(p => {
                  const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
                  return (
                    <div key={p._id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                          {name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Badge variant={meeting.status === "scheduled" ? "default" : meeting.status === "cancelled" ? "destructive" : "secondary"}>
              {meeting.status}
            </Badge>
            {meeting.recording_enabled && (
              <Badge variant="outline">Recording enabled</Badge>
            )}
          </div>

          <div className="text-xs text-gray-400">
            Meeting Code: {meeting.meeting_code}
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t bg-gray-50 dark:bg-neutral-800">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={() => onDelete(meeting._id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
