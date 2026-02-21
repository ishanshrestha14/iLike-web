import { useState, useEffect, useCallback } from "react";
import MainLayout from "@/layouts/MainLayout";
import {
  User,
  Shield,
  Bell,
  Moon,
  Globe,
  Lock,
  Eye,
  Smartphone,
  Palette,
  LogOut,
  Trash2,
  Download,
  HelpCircle,
  Settings as SettingsIcon,
  ShieldBan,
  UserX,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import {
  getServerSettings,
  updateServerSettings,
  getAppSettings,
  saveAppSettings,
  type ServerSettings,
  type AppSettings,
} from "@/services/settingsService";
import { getProfile, updateProfile } from "@/services/profileService";
import {
  getBlockedUsers,
  unblockUser,
  type BlockedUser,
} from "@/services/blockReportService";
import { authService } from "@/services/userService";
import { SERVER_BASE_URL } from "@/services/api";

// Keys grouped by storage backend
const SERVER_KEYS = new Set([
  "emailNotifications",
  "pushNotifications",
  "smsNotifications",
  "profileVisibility",
  "showOnlineStatus",
  "showLastSeen",
  "allowMessagesFrom",
  "showMeTo",
]);

const APP_KEYS = new Set(["darkMode", "language", "autoPlayVideos", "soundEffects"]);

interface AllSettings extends ServerSettings, AppSettings {
  ageRange: { min: number; max: number };
  maxDistance: number;
}

const SettingsPage = () => {
  const { logout } = useAuth();
  const [settings, setSettings] = useState<AllSettings>({
    // Server: Notification
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    // Server: Privacy
    profileVisibility: "public",
    showOnlineStatus: true,
    showLastSeen: false,
    allowMessagesFrom: "matches",
    // Server: Discovery
    showMeTo: "everyone",
    // App (localStorage)
    darkMode: false,
    language: "English",
    autoPlayVideos: true,
    soundEffects: true,
    // Profile preferences
    ageRange: { min: 18, max: 50 },
    maxDistance: 50,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const users = await getBlockedUsers();
      setBlockedUsers(users);
    } catch {
      // Silently fail — section will show empty
    } finally {
      setLoadingBlocked(false);
    }
  }, []);

  const handleUnblock = async (userId: string, name: string) => {
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId));
      toast.success(`${name} has been unblocked`);
    } catch {
      toast.error("Failed to unblock user");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Please enter your password");
      return;
    }
    setDeleting(true);
    try {
      await authService.deleteAccount(deletePassword);
      logout();
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "response" in error
          ? ((error as { response: { data?: { message?: string } } }).response
              ?.data?.message ?? "Failed to delete account")
          : "Failed to delete account";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const [serverSettings, profileResponse] = await Promise.all([
        getServerSettings().catch(() => null),
        getProfile().catch(() => null),
      ]);
      const appSettings = getAppSettings();

      setSettings((prev) => ({
        ...prev,
        // Server settings
        ...(serverSettings && {
          emailNotifications: serverSettings.emailNotifications,
          pushNotifications: serverSettings.pushNotifications,
          smsNotifications: serverSettings.smsNotifications,
          profileVisibility: serverSettings.profileVisibility,
          showOnlineStatus: serverSettings.showOnlineStatus,
          showLastSeen: serverSettings.showLastSeen,
          allowMessagesFrom: serverSettings.allowMessagesFrom,
          showMeTo: serverSettings.showMeTo,
        }),
        // App settings
        ...appSettings,
        // Profile preferences
        ...(profileResponse?.success &&
          profileResponse.data?.preferences && {
            ageRange: {
              min: profileResponse.data.preferences.minAge ?? 18,
              max: profileResponse.data.preferences.maxAge ?? 50,
            },
            maxDistance: profileResponse.data.preferences.maxDistance ?? 50,
          }),
      }));
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadBlockedUsers();
  }, [loadSettings, loadBlockedUsers]);

  const handleSettingChange = async (
    key: string,
    value: string | number | boolean | object
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      if (SERVER_KEYS.has(key)) {
        await updateServerSettings({ [key]: value } as Partial<ServerSettings>);
      } else if (APP_KEYS.has(key)) {
        saveAppSettings({ [key]: value } as Partial<AppSettings>);
      }
      toast.success("Setting updated!");
    } catch {
      toast.error("Failed to save setting");
    }
  };

  const handleDiscoveryChange = async (
    field: "ageRange" | "maxDistance",
    value: { min: number; max: number } | number
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveDiscoverySettings = async () => {
    try {
      await updateProfile({
        preferences: {
          minAge: settings.ageRange.min,
          maxAge: settings.ageRange.max,
          maxDistance: settings.maxDistance,
        },
      } as Parameters<typeof updateProfile>[0]);
      toast.success("Discovery settings saved!");
    } catch {
      toast.error("Failed to save discovery settings");
    }
  };

  const handleLogout = () => {
    logout();
  };

  const SettingItem = ({
    icon: Icon,
    title,
    subtitle,
    children,
    danger = false,
  }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    danger?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border ${
        danger ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            danger ? "bg-red-100 text-red-600" : "bg-pink-100 text-pink-600"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3
            className={`font-medium ${
              danger ? "text-red-800" : "text-gray-800"
            }`}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className={`text-sm ${danger ? "text-red-600" : "text-gray-600"}`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
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
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-pink-500" />
            <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage your account preferences and privacy
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Account Settings
                </h2>
              </div>

              <div className="space-y-4">
                <SettingItem
                  icon={Bell}
                  title="Email Notifications"
                  subtitle="Receive updates via email"
                >
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) =>
                        handleSettingChange(
                          "emailNotifications",
                          e.target.checked
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </SettingItem>

                <SettingItem
                  icon={Smartphone}
                  title="Push Notifications"
                  subtitle="Get notified on your device"
                >
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={(e) =>
                        handleSettingChange(
                          "pushNotifications",
                          e.target.checked
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </SettingItem>

                <SettingItem
                  icon={Bell}
                  title="SMS Notifications"
                  subtitle="Receive text messages"
                >
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) =>
                        handleSettingChange(
                          "smsNotifications",
                          e.target.checked
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </SettingItem>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Privacy Settings
                </h2>
              </div>

              <div className="space-y-4">
                <SettingItem
                  icon={Eye}
                  title="Profile Visibility"
                  subtitle="Who can see your profile"
                >
                  <select
                    value={settings.profileVisibility}
                    onChange={(e) =>
                      handleSettingChange("profileVisibility", e.target.value)
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </SettingItem>

                <SettingItem
                  icon={Globe}
                  title="Show Online Status"
                  subtitle="Let others see when you're online"
                >
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showOnlineStatus}
                      onChange={(e) =>
                        handleSettingChange(
                          "showOnlineStatus",
                          e.target.checked
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </SettingItem>

                <SettingItem
                  icon={Lock}
                  title="Allow Messages From"
                  subtitle="Control who can message you"
                >
                  <select
                    value={settings.allowMessagesFrom}
                    onChange={(e) =>
                      handleSettingChange("allowMessagesFrom", e.target.value)
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="matches">Matches Only</option>
                    <option value="friends">Friends Only</option>
                  </select>
                </SettingItem>
              </div>
            </div>

            {/* Blocked Users */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <ShieldBan className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Blocked Users
                </h2>
              </div>

              {loadingBlocked ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : blockedUsers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  You haven't blocked anyone
                </p>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((blocked) => (
                    <div
                      key={blocked.userId}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="flex items-center gap-3">
                        {blocked.profilePicture ? (
                          <img
                            src={
                              blocked.profilePicture.startsWith("http")
                                ? blocked.profilePicture
                                : `${SERVER_BASE_URL}${blocked.profilePicture}`
                            }
                            alt={blocked.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            <UserX className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">
                            {blocked.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Blocked{" "}
                            {new Date(blocked.blockedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleUnblock(blocked.userId, blocked.name)
                        }
                        className="px-3 py-1.5 text-sm font-medium text-pink-600 border border-pink-200 rounded-lg hover:bg-pink-50 transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discovery Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Discovery Settings
                </h2>
              </div>

              <div className="space-y-4">
                <SettingItem
                  icon={User}
                  title="Show Me To"
                  subtitle="Who can discover your profile"
                >
                  <select
                    value={settings.showMeTo}
                    onChange={(e) =>
                      handleSettingChange("showMeTo", e.target.value)
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="women">Women Only</option>
                    <option value="men">Men Only</option>
                    <option value="matches">Matches Only</option>
                  </select>
                </SettingItem>

                <SettingItem
                  icon={User}
                  title="Age Range"
                  subtitle={`${settings.ageRange.min} - ${settings.ageRange.max} years`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="18"
                      max="80"
                      value={settings.ageRange.min}
                      onChange={(e) =>
                        handleDiscoveryChange("ageRange", {
                          ...settings.ageRange,
                          min: parseInt(e.target.value),
                        })
                      }
                      onMouseUp={saveDiscoverySettings}
                      onTouchEnd={saveDiscoverySettings}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">to</span>
                    <input
                      type="range"
                      min="18"
                      max="80"
                      value={settings.ageRange.max}
                      onChange={(e) =>
                        handleDiscoveryChange("ageRange", {
                          ...settings.ageRange,
                          max: parseInt(e.target.value),
                        })
                      }
                      onMouseUp={saveDiscoverySettings}
                      onTouchEnd={saveDiscoverySettings}
                      className="w-20"
                    />
                  </div>
                </SettingItem>

                <SettingItem
                  icon={Globe}
                  title="Maximum Distance"
                  subtitle={`${settings.maxDistance} km`}
                >
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.maxDistance}
                    onChange={(e) =>
                      handleDiscoveryChange(
                        "maxDistance",
                        parseInt(e.target.value)
                      )
                    }
                    onMouseUp={saveDiscoverySettings}
                    onTouchEnd={saveDiscoverySettings}
                    className="w-32"
                  />
                </SettingItem>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & App Settings */}
          <div className="space-y-6">
            {/* App Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Palette className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  App Settings
                </h2>
              </div>

              <div className="space-y-4">
                <SettingItem
                  icon={Moon}
                  title="Dark Mode"
                  subtitle="Switch to dark theme"
                >
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={(e) =>
                        handleSettingChange("darkMode", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </SettingItem>

                <SettingItem
                  icon={Globe}
                  title="Language"
                  subtitle="Choose your language"
                >
                  <select
                    value={settings.language}
                    onChange={(e) =>
                      handleSettingChange("language", e.target.value)
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </SettingItem>

                <SettingItem
                  icon={Smartphone}
                  title="Auto-play Videos"
                  subtitle="Play videos automatically"
                >
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoPlayVideos}
                      onChange={(e) =>
                        handleSettingChange("autoPlayVideos", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </SettingItem>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Quick Actions
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => toast.info("Help center coming soon!")}
                  className="w-full flex items-center gap-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  <span>Help & Support</span>
                </button>

                <button
                  onClick={() => toast.info("Data export coming soon!")}
                  className="w-full flex items-center gap-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5 text-green-500" />
                  <span>Export Data</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5 text-orange-500" />
                  <span>Logout</span>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center gap-3 p-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">
                Delete Account
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This action is permanent. All your matches, chats, and profile
              data will be removed. Your messages will be preserved anonymously
              for other users.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default SettingsPage;
