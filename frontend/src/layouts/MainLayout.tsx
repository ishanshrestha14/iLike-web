import React from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar onLogout={handleLogout} />
      {/* pb-24 clears the fixed mobile bottom-tab bar; md+ has no bar. */}
      <main className="pb-24 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
