import { useEffect, useState } from "react";
import { BACKEND_URL } from "../../../config";

const AllEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  async function getAllEmployee() {
    const adminToken = localStorage.getItem("token");

    try {
      const response = await fetch(`${BACKEND_URL}/employees/`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await response.json();
      setEmployees(data.employees);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  useEffect(() => {
    getAllEmployee();
  }, []);

  // Get unique departments
  const departments = [...new Set(employees.map((emp) => emp.department))];

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const fullName =
      `${employee.user_id?.first_name} ${employee.user_id?.last_name}`.toLowerCase();
    const email = employee.user_id?.email.toLowerCase();
    const matchesSearch =
      fullName?.includes(searchTerm?.toLowerCase()) ||
      email?.includes(searchTerm?.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || employee?.department === filterDepartment;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && employee?.is_active) ||
      (filterStatus === "inactive" && !employee?.is_active);

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
          <p className="text-teal-700 text-lg font-medium">
            Loading employees...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-teal-900 mb-2">
                Employee Directory
              </h1>
              <p className="text-teal-700">
                Manage and view all employees in your organization
              </p>
            </div>
            <div className=" text-blue-500 px-6 py-3 rounded-full font-semibold">
              {filteredEmployees.length}{" "}
              {filteredEmployees.length === 1 ? "Employee" : "Employees"}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg border border-teal-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Department Filter */}
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-3 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-teal-900"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-teal-900"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employee Cards/Table */}
        {filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-teal-200 p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-teal-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-teal-900 mb-2">
              No employees found
            </h3>
            <p className="text-teal-600">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-teal-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-teal-100 to-cyan-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-teal-900">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-teal-900">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-teal-900">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-teal-900">
                      Team Lead
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-teal-900">
                      Hire Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-teal-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {filteredEmployees.map((employee, index) => {
                    const fullName = `${employee.user_id?.first_name} ${employee.user_id?.last_name}`;
                    const teamLeadName = employee.team_lead_id
                      ? `${employee.team_lead_id.user_id?.first_name} ${employee.team_lead_id.user_id?.last_name}`
                      : "—";

                    return (
                      <tr
                        key={employee._id}
                        className="hover:bg-teal-50 transition"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold mr-3">
                              {employee.user_id?.first_name[0]}
                              {employee.user_id?.last_name[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-teal-900">
                                {fullName}
                              </div>
                              <div className="text-sm text-teal-600">
                                {employee.user_id?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800">
                            {employee?.department}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-teal-700">
                          {employee?.position}
                        </td>
                        <td className="px-6 py-4 text-teal-700">
                          {teamLeadName}
                        </td>
                        <td className="px-6 py-4 text-teal-700">
                          {new Date(employee?.hire_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {employee?.is_active ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-teal-100">
              {filteredEmployees.map((employee) => {
                const fullName = `${employee.user_id?.first_name} ${employee.user_id?.last_name}`;
                const teamLeadName = employee.team_lead_id
                  ? `${employee.team_lead_id.user_id?.first_name} ${employee.team_lead_id.user_id?.last_name}`
                  : "—";

                return (
                  <div
                    key={employee._id}
                    className="p-6 hover:bg-teal-50 transition"
                  >
                    <div className="flex items-start mb-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold mr-4">
                        {employee.user_id?.first_name[0]}
                        {employee.user_id?.last_name[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-teal-900 text-lg">
                          {fullName}
                        </h3>
                        <p className="text-sm text-teal-600">
                          {employee.user_id?.email}
                        </p>
                      </div>
                      {employee?.is_active ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-teal-600">Department:</span>
                        <p className="font-medium text-teal-900">
                          {employee?.department}
                        </p>
                      </div>
                      <div>
                        <span className="text-teal-600">Position:</span>
                        <p className="font-medium text-teal-900">
                          {employee?.position}
                        </p>
                      </div>
                      <div>
                        <span className="text-teal-600">Team Lead:</span>
                        <p className="font-medium text-teal-900">
                          {teamLeadName}
                        </p>
                      </div>
                      <div>
                        <span className="text-teal-600">Hire Date:</span>
                        <p className="font-medium text-teal-900">
                          {new Date(employee.hire_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllEmployees;
