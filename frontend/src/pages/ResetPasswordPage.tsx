import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "@/services/userService";
import { setAccessToken } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      const accessToken = await authService.resetPassword(token, password);
      setAccessToken(accessToken);
      toast.success("Password reset! Redirecting...");
      // Fetch fresh user profile then go to /home
      try {
        const user = await authService.getCurrentUser();
        setUser(user);
      } catch {
        // If profile fetch fails, just redirect — AuthProvider will rehydrate
      }
      navigate("/home", { replace: true });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response: { data?: { message?: string } } }).response
              ?.data?.message ?? "Invalid or expired reset link")
          : "Invalid or expired reset link";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Set new password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Choose a strong password of at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 px-4 rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
