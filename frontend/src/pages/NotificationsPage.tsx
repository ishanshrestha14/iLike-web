import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import {
  Bell,
  Heart,
  MessageCircle,
  Sparkles,
  Settings,
  Check,
  X,
  Clock,
  Star,
} from "lucide-react";
import { toast } from "react-toastify";
import * as notificationService from "@/services/notificationService";
import type { Notification } from "@/services/notificationService";
import { connect, onNewNotification } from "@/services/socketService";

const timeAgo = (date: string): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "unread" | "matches" | "likes" | "messages"
  >("all");

  // Load notifications on mount + subscribe to real-time events
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const { notifications: data, hasMore: more } =
          await notificationService.getNotifications();
        if (!ignore) {
          setNotifications(data);
          setHasMore(more);
        }
      } catch {
        toast.error("Failed to load notifications");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();

    try {
      connect();
    } catch {
      return;
    }

    const unsub = onNewNotification((event) => {
      setNotifications((prev) => [
        {
          id: event.id,
          type: event.type as Notification["type"],
          title: event.title,
          message: event.message,
          timestamp: event.timestamp,
          isRead: false,
          avatar: event.avatar,
          actionUrl: event.actionUrl,
        },
        ...prev,
      ]);
    });

    return () => {
      ignore = true;
      unsub();
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || notifications.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = notifications[notifications.length - 1].timestamp;
      const { notifications: older, hasMore: more } =
        await notificationService.getNotifications(oldest);
      setNotifications((prev) => [...prev, ...older]);
      setHasMore(more);
    } catch {
      toast.error("Failed to load more notifications");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "match":
        return <Sparkles className="w-5 h-5 text-pink-500" />;
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "superlike":
        return <Star className="w-5 h-5 text-yellow-500" />;
      case "message":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "system":
        return <Bell className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "match":
        return "bg-pink-50 border-pink-200";
      case "like":
        return "bg-red-50 border-red-200";
      case "superlike":
        return "bg-yellow-50 border-yellow-200";
      case "message":
        return "bg-blue-50 border-blue-200";
      case "system":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.isRead;
    if (filter === "matches") return notification.type === "match";
    if (filter === "likes")
      return notification.type === "like" || notification.type === "superlike";
    if (filter === "messages") return notification.type === "message";
    return true;
  });

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      toast.success("All notifications marked as read!");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-pink-500" />
              <h1 className="text-3xl font-bold text-gray-800">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="bg-pink-500 text-white text-sm px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Mark all read
              </button>
              <button
                onClick={() => toast.info("Settings coming soon!")}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            Stay updated with your latest matches and activities
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All", count: notifications.length },
              { key: "unread", label: "Unread", count: unreadCount },
              {
                key: "matches",
                label: "Matches",
                count: notifications.filter((n) => n.type === "match").length,
              },
              {
                key: "likes",
                label: "Likes",
                count: notifications.filter(
                  (n) => n.type === "like" || n.type === "superlike"
                ).length,
              },
              {
                key: "messages",
                label: "Messages",
                count: notifications.filter((n) => n.type === "message").length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {filter === "all"
                  ? "No notifications yet"
                  : `No ${filter} notifications`}
              </h3>
              <p className="text-gray-600">
                {filter === "all"
                  ? "Start swiping to get notifications about matches and likes!"
                  : `You're all caught up with ${filter}!`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  notification.isRead
                    ? "bg-white border-gray-200"
                    : `${getNotificationColor(
                        notification.type
                      )} border-l-4 border-l-pink-500`
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {notification.avatar ? (
                    <img
                      src={notification.avatar}
                      alt="User"
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-red-400 flex items-center justify-center text-white flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getNotificationIcon(notification.type)}
                          <h3 className="font-semibold text-gray-800">
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(notification.timestamp)}
                          </span>
                          {notification.actionUrl && (
                            <button
                              onClick={() =>
                                navigate(notification.actionUrl!)
                              }
                              className="text-pink-500 hover:text-pink-600 font-medium"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center py-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2 text-sm text-pink-500 hover:text-pink-600 font-medium disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more notifications"}
            </button>
          </div>
        )}

        {/* Quick Stats */}
        {notifications.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Notification Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {unreadCount}
                </div>
                <div className="text-sm text-gray-600">Unread</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {notifications.filter((n) => n.type === "match").length}
                </div>
                <div className="text-sm text-gray-600">Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {
                    notifications.filter(
                      (n) => n.type === "like" || n.type === "superlike"
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {notifications.filter((n) => n.type === "message").length}
                </div>
                <div className="text-sm text-gray-600">Messages</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;
