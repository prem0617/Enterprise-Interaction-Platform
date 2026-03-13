import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Users, Search, Mail, Briefcase, Building2, MessageSquare, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TeamDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const token = localStorage.getItem("token");

  const loadEmployees = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get(`${BACKEND_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      toast.error("Failed to load team members");
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = employees
    .filter((emp) => emp.is_active)
    .filter((emp) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const fullName = `${emp.user_id?.first_name || ""} ${emp.user_id?.last_name || ""}`.toLowerCase();
      const email = emp.user_id?.email?.toLowerCase() || "";
      const department = emp.department?.name?.toLowerCase() || "";
      const position = emp.position?.toLowerCase() || "";
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        department.includes(query) ||
        position.includes(query)
      );
    });

  const handleInitiateChat = (employee) => {
    // Navigate to messages tab - parent component should handle this
    toast.info(`Opening chat with ${employee.user_id?.first_name}...`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="size-5 text-indigo-400" />
            Team Directory
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Browse and connect with {filteredEmployees.length} team members
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadEmployees(true)}
          disabled={refreshing}
          className="h-8 gap-1.5 bg-zinc-900/60 border-zinc-700"
        >
          <RefreshCcw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search by name, email, department, or position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-zinc-900/60 border-zinc-700 h-10"
        />
      </div>

      {/* Employee Cards */}
      {filteredEmployees.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800/80">
          <CardContent className="p-12 text-center">
            <Users className="size-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 font-medium">No team members found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => {
            const fullName = `${employee.user_id?.first_name || ""} ${employee.user_id?.last_name || ""}`;
            const initials = fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase();
            const deptName = employee.department?.name || "No Department";
            const deptColor = employee.department?.color || "#6366f1";

            return (
              <Card
                key={employee._id}
                className="bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-200 group"
              >
                <CardContent className="p-5">
                  {/* Avatar and Name */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="size-12 ring-2 ring-zinc-800">
                      <AvatarImage src={employee.user_id?.profile_picture} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-300 font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-zinc-100 truncate">
                        {fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Mail className="size-3 text-zinc-500" />
                        <p className="text-xs text-zinc-500 truncate">
                          {employee.user_id?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Position and Department */}
                  <div className="space-y-2 mb-4">
                    {employee.position && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="size-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="text-xs text-zinc-400 truncate">
                          {employee.position}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 text-zinc-500 flex-shrink-0" />
                      <Badge
                        variant="secondary"
                        className="text-xs border"
                        style={{
                          backgroundColor: `${deptColor}15`,
                          color: deptColor,
                          borderColor: `${deptColor}30`,
                        }}
                      >
                        {deptName}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 gap-1.5 text-xs bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400"
                    onClick={() => handleInitiateChat(employee)}
                  >
                    <MessageSquare className="size-3.5" />
                    Start Chat
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {filteredEmployees.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-zinc-600">
            Showing {filteredEmployees.length} of {employees.filter((e) => e.is_active).length} team members
          </p>
        </div>
      )}
    </div>
  );
}
