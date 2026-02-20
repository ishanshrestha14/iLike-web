import api from "./api";

export interface ServerSettings {
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  // Privacy Settings
  profileVisibility: string;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowMessagesFrom: string;
  // Discovery Settings
  showMeTo: string;
}

export interface AppSettings {
  darkMode: boolean;
  language: string;
  autoPlayVideos: boolean;
  soundEffects: boolean;
}

const APP_SETTINGS_KEY = "ilike_app_settings";

const DEFAULT_APP_SETTINGS: AppSettings = {
  darkMode: false,
  language: "English",
  autoPlayVideos: true,
  soundEffects: true,
};

export const getServerSettings = async (): Promise<ServerSettings> => {
  const { data } = await api.get("/settings");
  return data.data;
};

export const updateServerSettings = async (
  settings: Partial<ServerSettings>
): Promise<ServerSettings> => {
  const { data } = await api.put("/settings", settings);
  return data.data;
};

export const getAppSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(APP_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_APP_SETTINGS;
};

export const saveAppSettings = (settings: Partial<AppSettings>): void => {
  const current = getAppSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updated));
};
