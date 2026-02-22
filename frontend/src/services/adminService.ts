import api from "./api";

// --- Types ---

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  pendingReports: number;
  newUsersToday: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isBanned: boolean;
  suspendedUntil: string | null;
  banReason: string | null;
  deletedAccount: boolean;
  hasCompletedProfile: boolean;
  createdAt: string;
  reportCount: number;
}

export type UserStatus = "active" | "banned" | "suspended" | "deleted";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export interface AdminReport {
  id: string;
  reporter: { id: string; name: string; email: string } | null;
  reported: { id: string; name: string; email: string } | null;
  reason: string;
  description: string;
  status: ReportStatus;
  adminNote: string;
  resolvedBy: { id: string; name: string } | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface PaginatedUsers {
  data: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

export interface PaginatedReports {
  data: AdminReport[];
  total: number;
  page: number;
  pages: number;
}

// --- Helpers ---

export const getUserStatus = (user: AdminUser): UserStatus => {
  if (user.deletedAccount) return "deleted";
  if (user.isBanned) return "banned";
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date())
    return "suspended";
  return "active";
};

// --- API calls ---

export const getDashboardStats = async (): Promise<AdminStats> => {
  const { data } = await api.get("/admin/stats");
  return data.data;
};

export const getAdminUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedUsers> => {
  const { data } = await api.get("/admin/users", { params });
  return data.data;
};

export const getAdminUser = async (
  userId: string
): Promise<AdminUser & { profile: { bio: string; profilePictureUrl: string; age: number; gender: string } | null; reportCount: number; blockCount: number; matchCount: number }> => {
  const { data } = await api.get(`/admin/users/${userId}`);
  return data.data;
};

export const updateUserStatus = async (
  userId: string,
  payload: {
    action: "ban" | "suspend" | "activate";
    reason?: string;
    suspendUntil?: string;
  }
): Promise<void> => {
  await api.put(`/admin/users/${userId}/status`, payload);
};

export const getAdminReports = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedReports> => {
  const { data } = await api.get("/admin/reports", { params });
  return data.data;
};

export const updateReport = async (
  reportId: string,
  payload: { status?: ReportStatus; adminNote?: string }
): Promise<AdminReport> => {
  const { data } = await api.put(`/admin/reports/${reportId}`, payload);
  return data.data;
};
