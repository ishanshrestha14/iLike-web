import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import {
  Users,
  Heart,
  TrendingUp,
  Shield,
  AlertTriangle,
  Eye,
  UserCheck,
  UserX,
  Activity,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getDashboardStats,
  getAdminUsers,
  updateUserStatus,
  getUserStatus,
  type AdminStats,
  type AdminUser,
} from "@/services/adminService";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        getDashboardStats(),
        getAdminUsers({ limit: 5 }),
      ]);
      setStats(s);
      setRecentUsers(u.data);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleActivate = async (user: AdminUser) => {
    try {
      await updateUserStatus(user.id, { action: "activate" });
      toast.success(`${user.name} activated`);
      load();
    } catch {
      toast.error("Action failed");
    }
  };

  const handleSuspend = async (user: AdminUser) => {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + 7);
    try {
      await updateUserStatus(user.id, {
        action: "suspend",
        suspendUntil: suspendUntil.toISOString(),
      });
      toast.success(`${user.name} suspended for 7 days`);
      load();
    } catch {
      toast.error("Action failed");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "banned": return "bg-red-100 text-red-800";
      case "suspended": return "bg-orange-100 text-orange-800";
      case "deleted": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = "pink",
    sub,
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color?: string;
    sub?: string;
  }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? "—" : value}
          </p>
          {sub && !loading && (
            <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4" />
              {sub}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600">Monitor and manage your dating platform</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={(stats?.totalUsers ?? 0).toLocaleString()}
            icon={Users}
            color="blue"
            sub={stats ? `+${stats.newUsersToday} today` : undefined}
          />
          <StatCard
            title="Active Users"
            value={(stats?.activeUsers ?? 0).toLocaleString()}
            icon={Activity}
            color="green"
          />
          <StatCard
            title="Total Matches"
            value={(stats?.totalMatches ?? 0).toLocaleString()}
            icon={Heart}
            color="pink"
          />
          <StatCard
            title="Pending Reports"
            value={(stats?.pendingReports ?? 0).toLocaleString()}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Users */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Recent Users</h2>
                <button
                  onClick={() => navigate("/admin/users")}
                  className="text-pink-500 hover:text-pink-600 font-medium"
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Reports</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map((user) => {
                        const status = getUserStatus(user);
                        return (
                          <tr key={String(user.id)} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-800">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.reportCount > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                {user.reportCount} {user.reportCount === 1 ? "report" : "reports"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => navigate("/admin/users")}
                                  className="p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="View Users"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {status === "active" ? (
                                  <button
                                    onClick={() => handleSuspend(user)}
                                    className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                                    title="Suspend 7 days"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                ) : status === "suspended" || status === "banned" ? (
                                  <button
                                    onClick={() => handleActivate(user)}
                                    className="p-1 text-green-500 hover:text-green-600 hover:bg-green-50 rounded"
                                    title="Activate"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {recentUsers.length === 0 && (
                    <p className="text-center text-gray-500 py-6">No users found</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions + Platform Stats */}
          <div className="space-y-6">
            {/* Platform Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Platform Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">New Users Today</span>
                  <span className="font-semibold text-green-600">
                    {loading ? "—" : `+${stats?.newUsersToday ?? 0}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pending Reports</span>
                  <span className="font-semibold text-red-600">
                    {loading ? "—" : stats?.pendingReports ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Matches</span>
                  <span className="font-semibold">{loading ? "—" : stats?.totalMatches ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/admin/users")}
                  className="w-full flex items-center gap-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Users className="w-5 h-5 text-blue-500" />
                  <span>Manage Users</span>
                </button>
                <button
                  onClick={() => navigate("/admin/reports")}
                  className="w-full flex items-center gap-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>
                    View Reports
                    {!loading && (stats?.pendingReports ?? 0) > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        {stats!.pendingReports} pending
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => navigate("/admin/settings")}
                  className="w-full flex items-center gap-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Shield className="w-5 h-5 text-green-500" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
