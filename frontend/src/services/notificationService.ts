import api from "./api";

export interface Notification {
  id: string;
  type: "match" | "like" | "message" | "system" | "superlike";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  avatar?: string;
  actionUrl?: string;
}

interface RawNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  avatar?: string;
  actionUrl?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
}

const mapNotification = (n: RawNotification): Notification => ({
  id: n._id,
  type: n.type as Notification["type"],
  title: n.title,
  message: n.message,
  timestamp: n.createdAt,
  isRead: n.isRead,
  avatar: n.avatar,
  actionUrl: n.actionUrl,
});

export const getNotifications = async (
  before?: string,
  limit = 30,
  type?: string
): Promise<NotificationsResponse> => {
  const params: Record<string, string | number> = { limit };
  if (before) params.before = before;
  if (type) params.type = type;
  const { data } = await api.get("/notifications", { params });
  return {
    notifications: (data.data || []).map(mapNotification),
    hasMore: data.hasMore,
  };
};

export const getUnreadCount = async (): Promise<number> => {
  const { data } = await api.get("/notifications/unread-count");
  return data.data.count;
};

export const markAsRead = async (id: string): Promise<void> => {
  await api.put(`/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await api.put("/notifications/read-all");
};

export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};
