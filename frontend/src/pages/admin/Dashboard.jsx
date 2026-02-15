import { useState, useEffect } from "react";
import { Users, MessageSquare, Video, Activity, UserCheck } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ messagesToday: 0, activeMeetings: 0 });
  const adminToken = localStorage.getItem("token");

  const activeEmployeesList = employees
    .filter((employee) => employee.is_active)
    .map((employee) => ({
      id: employee._id,
      name: `${employee.user_id?.first_name} ${employee.user_id?.last_name}`,
      email: employee.user_id?.email,
      department: employee?.department,
      position: employee?.position,
      teamLead: employee?.team_lead_id
        ? `${employee?.team_lead_id.user_id?.first_name} ${employee?.team_lead_id.user_id?.last_name}`
        : "N/A",
    }));

  useEffect(() => {
    loadEmployees();
    loadStats();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/employees`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setStats(res.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const statsData = [
    { label: "Total Employees", value: employees?.length, icon: Users },
    {
      label: "Active Users",
      value: activeEmployeesList.length,
      icon: UserCheck,
    },
    {
      label: "Messages Today",
      value: stats.messagesToday,
      icon: MessageSquare,
    },
    { label: "Active Meetings", value: stats.activeMeetings, icon: Video },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3 h-80 rounded-lg" />
          <Skeleton className="lg:col-span-2 h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsData.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="size-9 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-semibold">{stat.value ?? 0}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Employees</CardTitle>
            <Badge variant="secondary">
              {activeEmployeesList.length} active
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {employees
                .filter((employee) => employee.is_active)
                .slice(0, 5)
                .map((employee) => {
                  const fullName = `${employee.user_id?.first_name} ${employee.user_id?.last_name}`;
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("");
                  return (
                    <div
                      key={employee._id}
                      className="flex items-center justify-between px-2 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.user_id?.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  );
                })}
              {employees.filter((e) => e.is_active).length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No active employees found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeEmployeesList.slice(0, 5).map((emp) => (
                <div key={emp.id} className="flex items-start gap-3">
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {emp.name}
                      </span>{" "}
                      joined {emp.department}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {emp.position}
                    </p>
                  </div>
                </div>
              ))}
              {activeEmployeesList.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
