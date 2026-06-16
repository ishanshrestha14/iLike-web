import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { ChatMessage } from "@/services/chatService";

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

const base: ChatMessage = {
  messageId: "m1",
  chatId: "c1",
  senderId: "u1",
  content: "Hello there",
  type: "text",
  status: "sent",
  timestamp: new Date().toISOString(),
  isFromMe: true,
};
const fmt = () => "10:00";

describe("MessageBubble", () => {
  it("renders the message content", () => {
    render(<MessageBubble message={base} formatTime={fmt} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders the deleted state", () => {
    render(
      <MessageBubble
        message={{ ...base, deletedAt: new Date().toISOString() }}
        formatTime={fmt}
      />
    );
    expect(screen.getByText(/message was deleted/i)).toBeInTheDocument();
  });

  it("reveals and fires delete for own messages on hover", () => {
    const onDelete = vi.fn();
    render(<MessageBubble message={base} formatTime={fmt} onDelete={onDelete} />);
    const bubble = screen.getByText("Hello there").closest(".group")!;
    fireEvent.mouseEnter(bubble);
    fireEvent.click(screen.getByLabelText("Delete message"));
    expect(onDelete).toHaveBeenCalledWith("m1");
  });

  it("does not offer delete for received messages", () => {
    render(
      <MessageBubble
        message={{ ...base, isFromMe: false }}
        formatTime={fmt}
        onDelete={vi.fn()}
      />
    );
    const bubble = screen.getByText("Hello there").closest(".group")!;
    fireEvent.mouseEnter(bubble);
    expect(screen.queryByLabelText("Delete message")).not.toBeInTheDocument();
  });

  it("marks read receipts with the super-token color", () => {
    const { container } = render(
      <MessageBubble message={{ ...base, status: "read" }} formatTime={fmt} />
    );
    expect(container.querySelector(".text-super")).not.toBeNull();
  });
});

describe("TypingIndicator", () => {
  it("renders an accessible typing status", () => {
    render(<TypingIndicator />);
    expect(screen.getByRole("status", { name: /typing/i })).toBeInTheDocument();
  });
});
