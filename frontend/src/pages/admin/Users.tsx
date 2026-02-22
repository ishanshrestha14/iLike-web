import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { toast } from "react-toastify";
import {
  getAdminUsers,
  updateUserStatus,
  getUserStatus,
  type AdminUser,
} from "@/services/adminService";

const Users = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminUsers({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setUsers(result.data);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleAction = async (
    user: AdminUser,
    action: "ban" | "suspend" | "activate",
    suspendUntil?: string
  ) => {
    setActionLoading(String(user.id));
    try {
      await updateUserStatus(user.id, { action, suspendUntil });
      toast.success(
        action === "ban"
          ? `${user.name} has been banned`
          : action === "suspend"
          ? `${user.name} has been suspended`
          : `${user.name} has been activated`
      );
      load();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = (user: AdminUser) => {
    const days = window.prompt(`Suspend ${user.name} for how many days?`, "7");
    if (!days) return;
    const n = parseInt(days, 10);
    if (isNaN(n) || n < 1) {
      toast.error("Please enter a valid number of days");
      return;
    }
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + n);
    handleAction(user, "suspend", suspendUntil.toISOString());
  };

  const getStatusBadge = (user: AdminUser) => {
    const status = getUserStatus(user);
    const classes = {
      active: "bg-green-100 text-green-800",
      banned: "bg-red-100 text-red-800",
      suspended: "bg-orange-100 text-orange-800",
      deleted: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
        {status === "suspended" && user.suspendedUntil && (
          <span className="ml-1 font-normal">
            until {new Date(user.suspendedUntil).toLocaleDateString()}
          </span>
        )}
      </span>
    );
  };

  const start = total === 0 ? 0 : (page - 1) * 20 + 1;
  const end = Math.min(page * 20, total);

  return (
    <AdminLayout title="User Management" subtitle="Manage and monitor user accounts">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <form onSubmit={handleSearch} className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition-colors"
            >
              Search
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block pl-3 pr-10 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sign Up Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-6 py-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const status = getUserStatus(user);
                const isActioning = actionLoading === String(user.id);
                return (
                  <tr key={String(user.id)} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {user.name}
                          {user.isAdmin && (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Admin</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${user.reportCount > 0 ? "text-red-600" : "text-gray-500"}`}>
                        {user.reportCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.isAdmin || user.deletedAccount ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <div className="flex justify-end space-x-3">
                          {status === "active" && (
                            <>
                              <button
                                onClick={() => handleSuspend(user)}
                                disabled={isActioning}
                                className="text-orange-600 hover:text-orange-900 font-medium disabled:opacity-50"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => handleAction(user, "ban")}
                                disabled={isActioning}
                                className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                              >
                                Ban
                              </button>
                            </>
                          )}
                          {(status === "banned" || status === "suspended") && (
                            <button
                              onClick={() => handleAction(user, "activate")}
                              disabled={isActioning}
                              className="text-green-600 hover:text-green-900 font-medium disabled:opacity-50"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            {total === 0 ? "No results" : `Showing ${start}–${end} of ${total} users`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              {page} / {pages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages || loading}
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Users;
