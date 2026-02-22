import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { toast } from "react-toastify";

const Settings = () => {
  const [settings, setSettings] = useState({
    appName: "iLike Dating",
    appDescription: "Find your perfect match",
    maxDistance: 100,
    ageRange: [18, 80],
    emailNotifications: true,
    pushNotifications: true,
    maintenanceMode: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAgeRangeChange = (index: number, value: string) => {
    const newAgeRange = [...settings.ageRange] as [number, number];
    newAgeRange[index] = parseInt(value, 10) || 0;
    setSettings((prev) => ({
      ...prev,
      ageRange: newAgeRange,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Admin settings coming soon");
  };

  return (
    <AdminLayout
      title="Application Settings"
      subtitle="Configure your application settings"
    >
      <div className="bg-white rounded-2xl shadow-lg">
        <form onSubmit={handleSave} className="divide-y divide-gray-200">
          <div className="p-6 space-y-8 divide-y divide-gray-200">
            {/* Basic Settings */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Basic Settings
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure basic application settings.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label
                    htmlFor="appName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Application Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="appName"
                      id="appName"
                      value={settings.appName}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label
                    htmlFor="appDescription"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Application Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="appDescription"
                      name="appDescription"
                      rows={3}
                      className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border border-gray-300 rounded-lg"
                      value={settings.appDescription}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          appDescription: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="maxDistance"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Maximum Distance (miles)
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="maxDistance"
                      id="maxDistance"
                      min="1"
                      max="1000"
                      value={settings.maxDistance}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Range
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="w-24">
                      <input
                        type="number"
                        min="18"
                        max={settings.ageRange[1] - 1}
                        value={settings.ageRange[0]}
                        onChange={(e) =>
                          handleAgeRangeChange(0, e.target.value)
                        }
                        className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-lg"
                      />
                    </div>
                    <span className="text-gray-500">to</span>
                    <div className="w-24">
                      <input
                        type="number"
                        min={settings.ageRange[0] + 1}
                        max="100"
                        value={settings.ageRange[1]}
                        onChange={(e) =>
                          handleAgeRangeChange(1, e.target.value)
                        }
                        className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="pt-8 space-y-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Notifications
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure how users receive notifications.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Email Notifications
                    </h4>
                    <p className="text-sm text-gray-500">
                      Send email notifications for new matches and messages.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`${
                        settings.emailNotifications
                          ? "bg-pink-600"
                          : "bg-gray-200"
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500`}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          emailNotifications: !prev.emailNotifications,
                        }))
                      }
                    >
                      <span className="sr-only">Use setting</span>
                      <span
                        aria-hidden="true"
                        className={`${
                          settings.emailNotifications
                            ? "translate-x-5"
                            : "translate-x-0"
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Push Notifications
                    </h4>
                    <p className="text-sm text-gray-500">
                      Enable push notifications on mobile devices.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`${
                        settings.pushNotifications
                          ? "bg-pink-600"
                          : "bg-gray-200"
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500`}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          pushNotifications: !prev.pushNotifications,
                        }))
                      }
                    >
                      <span className="sr-only">Use setting</span>
                      <span
                        aria-hidden="true"
                        className={`${
                          settings.pushNotifications
                            ? "translate-x-5"
                            : "translate-x-0"
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="pt-8 space-y-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Maintenance Mode
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enable maintenance mode to take your application offline for
                  maintenance.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Maintenance Mode
                  </h4>
                  <p className="text-sm text-gray-500">
                    {settings.maintenanceMode
                      ? "Your application is currently in maintenance mode."
                      : "Your application is currently live."}
                  </p>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    className={`${
                      settings.maintenanceMode ? "bg-red-600" : "bg-gray-200"
                    } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                    onClick={() => {
                      const confirm = window.confirm(
                        settings.maintenanceMode
                          ? "Are you sure you want to take the application online?"
                          : "Are you sure you want to put the application in maintenance mode?"
                      );
                      if (confirm) {
                        setSettings((prev) => ({
                          ...prev,
                          maintenanceMode: !prev.maintenanceMode,
                        }));
                      }
                    }}
                  >
                    <span className="sr-only">Use setting</span>
                    <span
                      aria-hidden="true"
                      className={`${
                        settings.maintenanceMode
                          ? "translate-x-5"
                          : "translate-x-0"
                      } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default Settings;
