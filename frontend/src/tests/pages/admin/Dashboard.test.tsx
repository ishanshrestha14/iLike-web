import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AdminDashboard from "@/pages/admin/Dashboard";

// Admin Dashboard fetches stats + users and renders inside AdminLayout. These
// are resilient smoke tests with mocked data — full coverage lands with the
// admin-panel overhaul. Assertions target stable section headings (the inline
// StatCard remounts on each state update, which makes per-card queries flaky).
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", name: "Admin", email: "a@x.com", isAdmin: true },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/services/adminService", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    totalUsers: 10,
    activeUsers: 5,
    totalMatches: 3,
    pendingReports: 1,
    newUsersToday: 2,
  }),
  getAdminUsers: vi.fn().mockResolvedValue({ data: [] }),
  updateUserStatus: vi.fn().mockResolvedValue(undefined),
  getUserStatus: vi.fn(() => "active"),
}));

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("Admin Dashboard", () => {
  it("renders the title and key sections after loading", async () => {
    renderDashboard();
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    // Recent Users renders after the data load resolves.
    expect(await screen.findByText("Recent Users")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Platform Stats")).toBeInTheDocument();
  });
});
