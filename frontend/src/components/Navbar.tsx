import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Heart,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  Search,
  Users,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUnreadCount } from "@/services/notificationService";
import { connect, onNotificationCount } from "@/services/socketService";

interface NavbarProps {
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const location = useLocation();
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch real unread count + keep it live via socket
  useEffect(() => {
    getUnreadCount()
      .then(setNotificationCount)
      .catch(() => {});

    try {
      connect();
    } catch {
      return;
    }

    const unsub = onNotificationCount(({ count }) => setNotificationCount(count));
    return () => unsub();
  }, []);

  const navLinks = [
    { name: "Home", path: "/home", icon: Home },
    { name: "Explore", path: "/explore", icon: Search },
    { name: "Matches", path: "/matches", icon: Users },
    { name: "Chat", path: "/chat", icon: MessageCircle },
  ];

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    onLogout();
  };

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-pink-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-current" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
              iLike
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    isActiveLink(link.path)
                      ? "text-pink-600 bg-pink-50"
                      : "text-gray-600 hover:text-pink-600 hover:bg-pink-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <Link
                to="/notifications"
                className="inline-block p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleProfileClick}
                className="flex items-center space-x-2 p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block font-medium">
                  {user?.name || "User"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-pink-50 transition-colors"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>View Profile</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-pink-50 transition-colors"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  <hr className="my-2 border-gray-100" />
                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-pink-100">
        <nav className="flex justify-around py-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all ${
                  isActiveLink(link.path)
                    ? "text-pink-600 bg-pink-50"
                    : "text-gray-600 hover:text-pink-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
