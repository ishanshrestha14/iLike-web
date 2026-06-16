import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ConversationItem } from "@/components/chat/ConversationItem";
import type { ChatSummary } from "@/services/chatService";

const chat: ChatSummary = {
  chatId: "c1",
  otherUserId: "u2",
  otherUserName: "Bob",
  otherUserProfilePicture: null,
  otherUserPhotoUrls: [],
  lastMessageTime: new Date().toISOString(),
  lastMessage: "See you soon",
  isLastMessageFromMe: false,
  unreadCount: 3,
};

function setup(overrides: Partial<ChatSummary> = {}, props: Partial<{ isSelected: boolean; isOnline: boolean }> = {}) {
  const onClick = vi.fn();
  render(
    <ConversationItem
      chat={{ ...chat, ...overrides }}
      isSelected={props.isSelected ?? false}
      isOnline={props.isOnline ?? false}
      onClick={onClick}
      getProfilePicUrl={() => undefined}
      formatConversationTime={() => "2h"}
    />
  );
  return { onClick };
}

describe("ConversationItem", () => {
  it("renders name, last message, and time", () => {
    setup();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("See you soon")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("prefixes 'You: ' when the last message is mine", () => {
    setup({ isLastMessageFromMe: true });
    expect(screen.getByText(/You: See you soon/)).toBeInTheDocument();
  });

  it("shows the unread badge with the count", () => {
    setup({ unreadCount: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("hides the unread badge when there are none", () => {
    setup({ unreadCount: 0 });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the online indicator when online", () => {
    setup({}, { isOnline: true });
    expect(screen.getByLabelText("Online")).toBeInTheDocument();
  });

  it("fires onClick", () => {
    const { onClick } = setup();
    fireEvent.click(screen.getByText("Bob"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
