import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MatchCelebration } from "@/components/match/MatchCelebration";
import type { User } from "@/services/matchService";

// Reduced motion → skip particles/fly-in for fast, stable assertions.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

const matched: User = {
  id: "u2",
  name: "Bob",
  age: 28,
  bio: "Hi",
  distance: "5 km away",
  interests: ["Music"],
  photos: ["/bob.jpg"],
};

const currentUser = { name: "Alice", avatar: "/alice.jpg" };

function setup(open = true) {
  const onClose = vi.fn();
  const onSendMessage = vi.fn();
  render(
    <MatchCelebration
      open={open}
      currentUser={currentUser}
      matchedUser={open ? matched : null}
      onClose={onClose}
      onSendMessage={onSendMessage}
    />
  );
  return { onClose, onSendMessage };
}

describe("MatchCelebration", () => {
  it("renders nothing when closed", () => {
    setup(false);
    expect(screen.queryByText("It's a Match!")).not.toBeInTheDocument();
  });

  it("shows the headline and the matched user's name when open", () => {
    setup();
    expect(screen.getByText("It's a Match!")).toBeInTheDocument();
    expect(screen.getByText(/You and Bob liked each other/i)).toBeInTheDocument();
    // Both avatars rendered with descriptive alt text.
    expect(screen.getByAltText("Alice's photo")).toBeInTheDocument();
    expect(screen.getByAltText("Bob's photo")).toBeInTheDocument();
  });

  it("fires onSendMessage from the primary CTA", () => {
    const { onSendMessage } = setup();
    fireEvent.click(screen.getByRole("button", { name: /send a message/i }));
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it("fires onClose from 'Keep swiping'", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: /keep swiping/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const { onClose } = setup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("falls back to an initial when no avatar is provided", () => {
    render(
      <MatchCelebration
        open
        currentUser={{ name: "Zoe", avatar: null }}
        matchedUser={matched}
        onClose={vi.fn()}
        onSendMessage={vi.fn()}
      />
    );
    expect(screen.getByText("Z")).toBeInTheDocument();
  });
});
