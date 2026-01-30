import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  ArrowUpRight,
  Sparkles,
  Clock,
  ArrowRight,
  MoreHorizontal,
  Plus,
  Building2
} from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = employees.filter((e) => e.is_active).length;
  const inactiveCount = employees.length - activeCount;
  const growthRate = employees.length > 0 ? Math.round((activeCount / employees.length) * 100) : 0;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  const departmentStats = employees.reduce((acc, emp) => {
    const dept = emp.department || "Other";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { 
      label: "Total Team", 
      value: employees.length, 
      icon: Users,
      change: "+12%",
      bgColor: "bg-violet-500",
    },
    { 
      label: "Active", 
      value: activeCount, 
      icon: UserCheck,
      change: "+8%",
      bgColor: "bg-emerald-500",
    },
    { 
      label: "Inactive", 
      value: inactiveCount, 
      icon: TrendingUp,
      change: "-2%",
      bgColor: "bg-amber-500",
    },
    { 
      label: "Departments", 
      value: Object.keys(departmentStats).length, 
      icon: Building2,
      change: null,
      bgColor: "bg-pink-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-gray-500 text-sm">{greeting} 👋</p>
          <h1 className="text-2xl font-bold mt-1">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="h-4 w-4" />
            Last 7 days
          </Button>
          <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" />
            Add Team
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-11 w-11 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              {stat.change && (
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change}
                  </span>
                  <span className="text-gray-400">from last month</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Team Members</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Recent additions to your team</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-violet-600">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium">No team members yet</p>
                <p className="text-sm text-gray-500 mt-1">Add your first team member to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.slice(0, 5).map((employee) => {
                  const name = `${employee.user_id?.first_name || ""} ${employee.user_id?.last_name || ""}`.trim();
                  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase();
                  
                  return (
                    <div 
                      key={employee._id} 
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-sm font-medium">
                          {initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate group-hover:text-violet-600 transition-colors">
                          {name || "Unknown"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {employee.user_id?.email}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {employee.department}
                        </Badge>
                        <div className={`h-2 w-2 rounded-full ${employee.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">By Department</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Team distribution</p>
          </CardHeader>
          <CardContent>
            {Object.keys(departmentStats).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data available</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(departmentStats).map(([dept, count]) => {
                  const pct = Math.round((count / employees.length) * 100);
                  
                  return (
                    <div key={dept}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium capitalize">{dept}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg. team size</span>
                <span className="font-semibold">
                  {Object.keys(departmentStats).length > 0 
                    ? Math.round(employees.length / Object.keys(departmentStats).length)
                    : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Invite Member", icon: Users, bgColor: "bg-violet-500 hover:bg-violet-600" },
          { label: "Schedule Meet", icon: Clock, bgColor: "bg-blue-500 hover:bg-blue-600" },
          { label: "View Reports", icon: TrendingUp, bgColor: "bg-emerald-500 hover:bg-emerald-600" },
          { label: "Announcements", icon: Sparkles, bgColor: "bg-amber-500 hover:bg-amber-600" },
        ].map((action) => (
          <button 
            key={action.label}
            className={`p-4 rounded-xl ${action.bgColor} text-white text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
          >
            <action.icon className="h-6 w-6 mb-3" />
            <p className="font-medium text-sm">{action.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
