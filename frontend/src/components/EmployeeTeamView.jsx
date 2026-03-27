import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Users,
  Wifi,
  WifiOff,
  UserCircle,
  Loader2,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BACKEND_URL } from "../../config";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export default function EmployeeTeamView() {
  const [teamsData, setTeamsData] = useState([]); // Array of { team, members }
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [noTeam, setNoTeam] = useState(false);

  // ─── Fetch teams and determine which ones to show
  const loadTeam = useCallback(async () => {
    setLoading(true);
    setNoTeam(false);
    try {
      // 1. Get current employee profile
      const { data: profileResp } = await axios.get(
        `${BACKEND_URL}/auth/profile`,
        { headers: getAuthHeaders() }
      );
      
      const empId = profileResp?.employee?.id;
      const deptRaw = profileResp?.employee?.department;
      const assignedDeptId = typeof deptRaw === "object" && deptRaw !== null
        ? (deptRaw._id || deptRaw)
        : deptRaw;

      // 2. Fetch all departments to find teams led by this employee
      const { data: deptsData } = await axios.get(
        `${BACKEND_URL}/departments`,
        { headers: getAuthHeaders() }
      );
      const allDepts = deptsData?.departments || [];

      // 3. Filter for teams the employee belongs to OR leads
      const relevantTeams = allDepts.filter((dept) => {
        if (dept.type !== "team") return false;
        const isAssigned = String(dept._id) === String(assignedDeptId);
        const isLead =
          dept.head_id &&
          String(dept.head_id._id || dept.head_id) === String(empId);
        return isAssigned || isLead;
      });

      if (relevantTeams.length === 0) {
        setNoTeam(true);
        return;
      }

      // 4. Fetch members for all relevant teams
      const teamsWithMembers = await Promise.all(
        relevantTeams.map(async (team) => {
          const { data: empData } = await axios.get(
            `${BACKEND_URL}/employees?department=${team._id}&is_active=true`,
            { headers: getAuthHeaders() }
          );
          return { team, members: empData?.employees || [] };
        })
      );

      setTeamsData(teamsWithMembers);
    } catch (err) {
      console.error("EmployeeTeamView fetch error:", err);
      setNoTeam(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  // ─── Real-time presence via socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("online-users-updated", (data) => {
      const ids = new Set((data.onlineUsers || []).map(String));
      setOnlineUserIds(ids);
    });
    socket.emit("request-online-users");

    return () => { socket.disconnect(); };
  }, []);

  const isOnline = (userId) => onlineUserIds.has(String(userId));

  // ─── Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // ─── No team assigned
  if (noTeam || teamsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <ShieldAlert className="size-7 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200 mb-1">
          Not assigned to any team
        </h3>
        <p className="text-sm text-zinc-500 max-w-xs">
          You haven&apos;t been assigned to a team, and aren&apos;t leading any teams yet. Contact your admin to be added to one.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 space-y-10">
        {teamsData.map(({ team, members }) => {
          const onlineCount = members.filter((m) => isOnline(m.user_id?._id)).length;

          return (
            <div key={team._id}>
              {/* Team Header */}
              <div className="rounded-2xl overflow-hidden mb-6 border border-zinc-800/80">
                <div className="h-1.5" style={{ backgroundColor: team.color || "#6366f1" }} />
                <div className="bg-zinc-900/60 p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="size-12 rounded-xl flex items-center justify-center flex-shrink-0"
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
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
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

              {/* Team Members Grid */}
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                {team.name} Members
              </h3>
              {members.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-10 text-center">
                  <UserCircle className="mx-auto size-10 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">No members in this team yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {members.map((emp) => {
                    const user = emp.user_id || {};
                    const online = isOnline(user._id);
                    const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`;
                    const isLead =
                      team.head_id &&
                      (String(team.head_id?._id || team.head_id) === String(emp._id));

                    return (
                      <div
                        key={emp._id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors"
                      >
                        <div className="relative flex-shrink-0">
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
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-zinc-200 truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            {isLead && (
                              <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20 py-0 px-1 flex-shrink-0">
                                Lead
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 truncate">
                            {emp.position || "—"}
                          </p>
                          <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${online ? "text-emerald-400" : "text-zinc-600"}`}>
                            {online ? (
                              <><Wifi className="size-2.5" /> Online</>
                            ) : (
                              <><WifiOff className="size-2.5" /> Offline</>
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
    </div>
  );
}
