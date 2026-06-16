import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Navbar from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";

// Service mocks (Navbar fetches an unread count + subscribes to socket updates).
vi.mock("@/services/notificationService", () => ({
  getUnreadCount: vi.fn().mockResolvedValue(5),
}));
vi.mock("@/services/socketService", () => ({
  connect: vi.fn(),
  onNotificationCount: vi.fn(() => vi.fn()),
}));
// useAuth is globally mocked in src/tests/setup.ts (user name "Test User").

function renderNavbar(path = "/explore", onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar onLogout={onLogout} />
    </MemoryRouter>
  );
  return { onLogout };
}

beforeEach(() => vi.clearAllMocks());

describe("Navbar", () => {
  it("renders the primary nav links", () => {
    renderNavbar();
    for (const name of ["Home", "Explore", "Matches", "Chat"]) {
      expect(
        screen.getAllByRole("link", { name: new RegExp(name, "i") }).length
      ).toBeGreaterThan(0);
    }
  });

  it("marks the current route with aria-current", () => {
    renderNavbar("/explore");
    const exploreLinks = screen.getAllByRole("link", { name: /explore/i });
    expect(exploreLinks.some((l) => l.getAttribute("aria-current") === "page")).toBe(
      true
    );
  });

  it("shows the unread notification count", async () => {
    renderNavbar();
    expect(await screen.findByText("5")).toBeInTheDocument();
  });

  it("opens the profile menu and fires logout", () => {
    const { onLogout } = renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /test user/i }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("View Profile")).toBeInTheDocument();
    fireEvent.click(within(menu).getByText("Logout"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

describe("BottomNav", () => {
  it("renders four tabs and marks the active one", () => {
    render(
      <MemoryRouter initialEntries={["/matches"]}>
        <BottomNav />
      </MemoryRouter>
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    const matches = screen.getByRole("link", { name: /matches/i });
    expect(matches).toHaveAttribute("aria-current", "page");
  });

  it("treats nested routes as active (e.g. /chat/123)", () => {
    render(
      <MemoryRouter initialEntries={["/chat/123"]}>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /chat/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
