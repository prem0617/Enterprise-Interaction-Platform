import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Users, Loader2, Wifi, WifiOff, Building2 } from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export default function AdminTeamsView() {
  const [loading, setLoading] = useState(true);
  const [teamsData, setTeamsData] = useState([]); // [{ team, members }]
  const [error, setError] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(`${BACKEND_URL}/departments`, {
          headers: getAuthHeaders(),
        });
        const all = data?.departments || [];
        const teams = all.filter((d) => d.type === "team");

        const withMembers = await Promise.all(
          teams.map(async (team) => {
            const { data: membersResp } = await axios.get(
              `${BACKEND_URL}/departments/${team._id}/members`,
              { headers: getAuthHeaders() }
            );
            return { team, members: membersResp?.members || [] };
          })
        );

        if (mounted) setTeamsData(withMembers);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error || e?.message || "Failed to load teams");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  // lightweight presence list from existing socket event (polling-less)
  useEffect(() => {
    if (!token) return;
    // lazy import to avoid extra initial bundle for admin dashboard
    let socket;
    (async () => {
      const { io } = await import("socket.io-client");
      socket = io(BACKEND_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
      });
      socket.on("online-users-updated", (data) => {
        const ids = new Set((data.onlineUsers || []).map(String));
        setOnlineUserIds(ids);
      });
      socket.emit("request-online-users");
    })();
    return () => {
      try {
        socket?.disconnect?.();
      } catch {}
    };
  }, [token]);

  const isOnline = (userId) => onlineUserIds.has(String(userId));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
          <Users className="size-5 text-indigo-300" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Teams</h1>
          <p className="text-sm text-zinc-500">All teams and their members</p>
        </div>
      </div>

      {teamsData.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-10 text-center">
          <p className="text-sm text-zinc-500">No teams found.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {teamsData.map(({ team, members }) => {
            const onlineCount = members.filter((m) => isOnline(m.user_id?._id)).length;
            return (
              <div key={team._id}>
                <div className="rounded-2xl overflow-hidden mb-5 border border-zinc-800/80">
                  <div className="h-1.5" style={{ backgroundColor: team.color || "#6366f1" }} />
                  <div className="bg-zinc-900/60 p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="size-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${team.color || "#6366f1"}20` }}
                      >
                        <Users className="size-6" style={{ color: team.color || "#6366f1" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h2 className="text-lg font-bold text-zinc-100">{team.name}</h2>
                          <Badge className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                            Team
                          </Badge>
                        </div>
                        {team.description && (
                          <p className="text-sm text-zinc-400 mb-2">{team.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <Users className="size-3.5" />
                            {members.length} member{members.length !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <Wifi className="size-3.5" />
                            {onlineCount} online
                          </span>
                          {team.parent_department_id?.name && (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="size-3.5" />
                              {team.parent_department_id.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {members.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-10 text-center">
                    <p className="text-sm text-zinc-500">No members in this team yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {members.map((emp) => {
                      const user = emp.user_id || {};
                      const online = isOnline(user._id);
                      const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` || "U";
                      return (
                        <div
                          key={emp._id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors"
                        >
                          <div className="relative shrink-0">
                            <Avatar className="size-10">
                              <AvatarImage src={user.profile_picture} />
                              <AvatarFallback className="text-xs bg-zinc-800 text-zinc-300">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-zinc-900 ${
                                online ? "bg-emerald-500" : "bg-zinc-600"
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-200 truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">{emp.position || "—"}</p>
                            <p
                              className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                                online ? "text-emerald-400" : "text-zinc-600"
                              }`}
                            >
                              {online ? (
                                <>
                                  <Wifi className="size-2.5" /> Online
                                </>
                              ) : (
                                <>
                                  <WifiOff className="size-2.5" /> Offline
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

