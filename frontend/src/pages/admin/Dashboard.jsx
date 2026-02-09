import React from "react";
import { useState, useEffect } from "react";
import {
  Users,
  MessageSquare,
  Video,
  Activity,
  UserCheck,
  Clock,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
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
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/employees`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const employeeData = response.data.employees;
      setEmployees(employeeData);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      label: "Total Employees",
      value: employees?.length,
      icon: Users,
      trend: "+2 this month",
    },
    {
      label: "Active Users",
      value: activeEmployeesList.length,
      icon: UserCheck,
      trend: "All active",
    },
    {
      label: "Messages Today",
      value: "--",
      icon: MessageSquare,
      trend: "Real-time",
    },
    {
      label: "Active Meetings",
      value: "--",
      icon: Video,
      trend: "Live",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-slate-400">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsData.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900 rounded-xl border border-slate-700/50 p-5 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-white mb-0.5">
                {stat.value ?? 0}
              </p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Employees */}
        <div className="lg:col-span-3 bg-slate-900 rounded-xl border border-slate-700/50">
          <div className="px-5 py-4 border-b border-slate-700/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Recent Employees
            </h2>
            <span className="text-xs text-slate-500">{activeEmployeesList.length} active</span>
          </div>
          <div className="divide-y divide-slate-700/30">
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
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
                        <span className="text-indigo-400 font-medium text-xs">
                          {initials}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {employee.user_id?.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                        Active
                      </span>
                    </div>
                  </div>
                );
              })}
            {employees.filter((e) => e.is_active).length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                No active employees found
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-700/50">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h2 className="text-sm font-semibold text-white">
              Activity
            </h2>
          </div>
          <div className="divide-y divide-slate-700/30">
            {activeEmployeesList.slice(0, 5).map((emp) => (
              <div key={emp.id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-white">{emp.name}</span>{" "}
                      joined {emp.department}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {emp.position}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {activeEmployeesList.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
