import { useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function BroadcastDialog() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", priority: "high", target: "all" });
  const token = localStorage.getItem("token");

  const handleSend = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSending(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/notifications/broadcast`, form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Broadcast sent to ${res.data.sent} users`);
      setOpen(false);
      setForm({ title: "", body: "", priority: "high", target: "all" });
    } catch (e) { toast.error(e.response?.data?.error || "Failed to send"); }
    finally { setSending(false); }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 gap-1.5 border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30" onClick={() => setOpen(true)}>
        <Megaphone className="size-3.5" /> Broadcast
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg"><Megaphone className="size-5 text-amber-400" />Send Broadcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. System Maintenance Notice" className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Message</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Details of the broadcast..." className="bg-zinc-800 border-zinc-700 min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Audience</Label>
                <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="employees">Employees Only</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                    <SelectItem value="customers">Customers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Send Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
