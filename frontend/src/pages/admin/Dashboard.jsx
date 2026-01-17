import React from "react";
import { useState, useEffect } from "react";
import {
  Users,
  MessageSquare,
  Video,
  Activity,
  UserCheck,
  Clock,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../../../config";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const adminToken = localStorage.getItem("token");
  console.log(adminToken);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeUsers: 0,
  });

  const activeEmployeesList = employees
    .filter((employee) => employee.is_active)
    .map((employee) => ({
      id: employee._id,
      name: `${employee.user_id.first_name} ${employee.user_id.last_name}`,
      email: employee.user_id.email,
      department: employee.department,
      position: employee.position,
      teamLead: employee.team_lead_id
        ? `${employee.team_lead_id.user_id.first_name} ${employee.team_lead_id.user_id.last_name}`
        : "N/A",
    }));

  useEffect(() => {
    loadEmployees();
  }, []);
  console.log(employees);
  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/employees`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      console.log(response);
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
      color: "from-cyan-500 to-blue-500",
    },
    {
      label: "Active Users",
      value: activeEmployeesList.length,
      icon: UserCheck,
      color: "from-teal-500 to-cyan-500",
    },
    {
      label: "Messages Today",
      // value: "2,847",
      icon: MessageSquare,
      color: "from-blue-500 to-purple-500",
    },
    {
      label: "Active Meetings",
      // value: "12",
      icon: Video,
      color: "from-purple-500 to-pink-500",
    },
  ];

  const recentEmployees =
    employees.length > 0
      ? employees.slice(0, 4)
      : [
          {
            name: "John Doe",
            email: "john.doe@company.com",
            status: "Active",
            joined: "2 hours ago",
          },
          {
            name: "Jane Smith",
            email: "jane.smith@company.com",
            status: "Active",
            joined: "5 hours ago",
          },
          {
            name: "Bob Johnson",
            email: "bob.j@company.com",
            status: "Pending",
            joined: "1 day ago",
          },
          {
            name: "Alice Williams",
            email: "alice.w@company.com",
            status: "Active",
            joined: "2 days ago",
          },
        ];

  const activities = [
    {
      user: "Sarah Connor",
      action: "created a new channel",
      time: "5 min ago",
    },
    { user: "Mike Ross", action: "uploaded a document", time: "12 min ago" },
    {
      user: "Rachel Green",
      action: "joined video meeting",
      time: "23 min ago",
    },
    {
      user: "John Watson",
      action: "sent a message in #general",
      time: "45 min ago",
    },
  ];

  if (loading) return <div>LOADING</div>;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-teal-900 mb-2">
          Dashboard Overview
        </h1>
        <p className="text-teal-700">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsData.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border-2 border-teal-200 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-teal-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-teal-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-teal-200 shadow-sm">
          <div className="p-6 border-b-2 border-teal-200">
            <h2 className="text-xl font-bold text-teal-900">
              Recent Employees
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {employees
              .filter((employee) => employee.is_active)
              .slice(0, 5) // 👈 ONLY FIRST 5
              .map((employee) => {
                const fullName = `${employee.user_id.first_name} ${employee.user_id.last_name}`;
                const initials = fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("");

                return (
                  <div
                    key={employee._id}
                    className="flex items-center justify-between p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {initials}
                      </div>

                      <div>
                        <p className="font-semibold text-teal-900">
                          {fullName}
                        </p>
                        <p className="text-sm text-teal-600">
                          {employee.user_id.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-teal-100 text-teal-700">
                        Active
                      </span>
                      <p className="text-xs text-teal-600 mt-1">
                        Joined{" "}
                        {new Date(employee.hire_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-sm">
          <div className="p-6 border-b-2 border-teal-200">
            <h2 className="text-xl font-bold text-teal-900">Recent Activity</h2>
          </div>

          <div className="p-6 space-y-4">
            {activeEmployeesList.slice(0, 5).map((emp) => (
              <div key={emp.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-teal-900">
                    <span className="font-semibold">{emp.name}</span> joined the{" "}
                    <span className="font-medium">{emp.department}</span> team
                    as <span className="font-medium">{emp.position}</span>
                  </p>

                  <p className="text-xs text-teal-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> Active employee
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
