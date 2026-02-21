import { Routes, Route, Navigate, Outlet, useLocation, useNavigationType } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProfileCheck } from "@/components/auth/ProfileCheck";
import { useAuth } from "@/context/AuthContext";

// Scroll to top on forward navigation (not back/forward)
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
}
// Lazy load pages for better performance
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const MatchesPage = lazy(() => import("@/pages/MatchesPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const ProfileSetup = lazy(() => import("@/components/ProfileSetup"));
const AdminRoutes = lazy(() => import("@/routes/AdminRoutes"));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
  </div>
);

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route
          path="/auth"
          element={
            user ? (
              user.isAdmin ? (
                <Navigate to="/admin" replace />
              ) : user.hasCompletedProfile ? (
                <Navigate to="/home" replace />
              ) : (
                <Navigate to="/setup-profile" replace />
              )
            ) : (
              <AuthPage />
            )
          }
        />

        {/* Profile setup route (accessible only if profile is incomplete) */}
        <Route
          path="/setup-profile"
          element={
            <ProtectedRoute>
              {user?.isAdmin ? (
                <Navigate to="/admin" replace />
              ) : user?.hasCompletedProfile ? (
                <Navigate to="/home" replace />
              ) : (
                <ProfileSetup />
              )}
            </ProtectedRoute>
          }
        />

        {/* Protected routes that require profile completion */}
        <Route
          element={
            <ProtectedRoute>
              <ProfileCheck>
                <Outlet />
              </ProfileCheck>
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:matchId" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminRoutes />
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
