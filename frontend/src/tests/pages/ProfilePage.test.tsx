import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ProfilePage from "@/pages/ProfilePage";
import { getProfile } from "@/services/profileService";

vi.mock("@/services/profileService", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));
// Navbar (via MainLayout) needs these.
vi.mock("@/services/notificationService", () => ({
  getUnreadCount: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/services/socketService", () => ({
  connect: vi.fn(),
  onNotificationCount: vi.fn(() => vi.fn()),
}));
// useAuth is globally mocked in src/tests/setup.ts.

const profile = {
  name: "Alice",
  gender: "Female",
  location: "NYC",
  intentions: ["Long-term"],
  age: 25,
  bio: "Hi there",
  interests: ["Art", "Music"],
  height: "5'6\"",
  photoUrls: ["/a.jpg"],
  profilePictureUrl: "/a.jpg",
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

beforeEach(() => vi.clearAllMocks());

describe("ProfilePage", () => {
  it("renders the profile after loading", async () => {
    vi.mocked(getProfile).mockResolvedValue({ success: true, data: profile });
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "Alice" })
    ).toBeInTheDocument();
    expect(screen.getByText("Art")).toBeInTheDocument();
    expect(screen.getByText("Music")).toBeInTheDocument();
  });

  it("shows the empty state when the profile can't be loaded", async () => {
    vi.mocked(getProfile).mockResolvedValue({ success: false, message: "x" });
    renderPage();
    expect(
      await screen.findByText(/couldn't load your profile/i)
    ).toBeInTheDocument();
  });

  it("reveals edit inputs when Edit Profile is clicked", async () => {
    vi.mocked(getProfile).mockResolvedValue({ success: true, data: profile });
    renderPage();
    await screen.findByRole("heading", { name: "Alice" });
    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    // Save mounts after the header's AnimatePresence (mode="wait") exit settles.
    expect(
      await screen.findByRole("button", { name: /save/i })
    ).toBeInTheDocument();
  });
});
