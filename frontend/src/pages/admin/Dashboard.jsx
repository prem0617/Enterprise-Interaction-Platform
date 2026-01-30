import { useState, useEffect } from "react";
import axios from "axios";
import { Users, UserCheck, UserX, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, MoreHorizontal } from "lucide-react";
import { BACKEND_URL } from "../../../config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

  const stats = [
    { 
      label: "Total Employees", 
      value: employees.length, 
      icon: Users,
      change: "+12%",
      trend: "up",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    },
    { 
      label: "Active", 
      value: activeCount, 
      icon: UserCheck,
      change: "+8%",
      trend: "up",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    },
    { 
      label: "Inactive", 
      value: inactiveCount, 
      icon: UserX,
      change: "-2%",
      trend: "down",
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400"
    },
    { 
      label: "Growth Rate", 
      value: "24%", 
      icon: TrendingUp,
      change: "+5%",
      trend: "up",
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400"
    },
  ];

  const departmentStats = employees.reduce((acc, emp) => {
    const dept = emp.department || "Unassigned";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const departmentColors = {
    frontend: "bg-blue-500",
    backend: "bg-emerald-500",
    devops: "bg-orange-500",
    qa: "bg-violet-500",
    hr: "bg-pink-500",
    finance: "bg-cyan-500",
    Unassigned: "bg-gray-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's an overview of your organization.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Activity className="h-4 w-4" />
          View Reports
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.label} className="overflow-hidden group hover:shadow-md transition-all duration-300" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl ${stat.color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  stat.trend === "up" 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Employees */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent Employees</CardTitle>
              <CardDescription>Latest additions to your team</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No employees found
              </div>
            ) : (
              <div className="space-y-1">
                {employees.slice(0, 5).map((employee, index) => {
                  const name = `${employee.user_id?.first_name || ""} ${employee.user_id?.last_name || ""}`.trim();
                  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();
                  
                  return (
                    <div 
                      key={employee._id} 
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {employee.user_id?.email}
                        </p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs font-normal capitalize">
                          {employee.department}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{employee.position}</span>
                      </div>
                      <div className={`h-2 w-2 rounded-full ${employee.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">By Department</CardTitle>
            <CardDescription>Employee distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(departmentStats).map(([dept, count], index) => {
                const percentage = Math.round((count / employees.length) * 100);
                const color = departmentColors[dept] || "bg-gray-400";
                return (
                  <div key={dept} className="space-y-2" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize">{dept}</span>
                      <span className="text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-6" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Departments</span>
              <span className="font-semibold">{Object.keys(departmentStats).length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
