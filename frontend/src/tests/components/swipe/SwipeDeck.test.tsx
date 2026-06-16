import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SwipeDeck } from "@/components/swipe/SwipeDeck";
import type { User } from "@/services/matchService";

// Force prefers-reduced-motion so card flings resolve synchronously (no async
// Framer animation) — lets us assert the swipe callbacks deterministically.
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

const users: User[] = [
  {
    id: "u1",
    name: "Alice",
    age: 25,
    bio: "Hello there",
    distance: "2 km away",
    interests: ["Art", "Coffee"],
    photos: ["/a.jpg"],
  },
  {
    id: "u2",
    name: "Bob",
    age: 28,
    bio: "Hi",
    distance: "5 km away",
    interests: ["Music"],
    photos: ["/b.jpg"],
  },
];

describe("SwipeDeck", () => {
  it("renders the top card", () => {
    render(<SwipeDeck users={users} onSwipe={vi.fn()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("calls onSwipe('right') with the top user when Like is clicked", () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck users={users} onSwipe={onSwipe} />);
    fireEvent.click(screen.getByLabelText("Like"));
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1" }),
      "right"
    );
  });

  it("calls onSwipe('left') when Nope is clicked", () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck users={users} onSwipe={onSwipe} />);
    fireEvent.click(screen.getByLabelText("Nope"));
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1" }),
      "left"
    );
  });

  it("swipes via ArrowRight / ArrowLeft keys", () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck users={users} onSwipe={onSwipe} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onSwipe).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "u1" }),
      "right"
    );
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onSwipe).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "u1" }),
      "left"
    );
  });

  it("disables Rewind when rewindDisabled and fires onRewind otherwise", () => {
    const onRewind = vi.fn();
    const { rerender } = render(
      <SwipeDeck users={users} onSwipe={vi.fn()} onRewind={onRewind} rewindDisabled />
    );
    expect(screen.getByLabelText("Rewind last swipe")).toBeDisabled();

    rerender(
      <SwipeDeck
        users={users}
        onSwipe={vi.fn()}
        onRewind={onRewind}
        rewindDisabled={false}
      />
    );
    fireEvent.click(screen.getByLabelText("Rewind last swipe"));
    expect(onRewind).toHaveBeenCalledTimes(1);
  });

  it("handles an empty deck without crashing", () => {
    const { container } = render(<SwipeDeck users={[]} onSwipe={vi.fn()} />);
    // Action bar still renders; no card present.
    expect(screen.getByLabelText("Like")).toBeInTheDocument();
    expect(container.querySelector('[role="group"]')).toBeNull();
  });
});
