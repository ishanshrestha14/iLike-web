import React from "react";
import { motion } from "framer-motion";

import type { ChatSummary } from "@/services/chatService";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  chat: ChatSummary;
  isSelected: boolean;
  isOnline: boolean;
  onClick: () => void;
  getProfilePicUrl: (chat: ChatSummary) => string | undefined;
  formatConversationTime: (date: string | Date) => string;
}

/** A row in the conversation list: avatar (+online dot), name, last message,
 *  timestamp, and an unread badge. */
export const ConversationItem = React.memo(
  ({
    chat,
    isSelected,
    isOnline,
    onClick,
    getProfilePicUrl,
    formatConversationTime,
  }: ConversationItemProps) => {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 border-b border-border p-4 text-left transition-colors",
          isSelected ? "bg-accent" : "hover:bg-muted"
        )}
      >
        <Avatar
          src={getProfilePicUrl(chat)}
          name={chat.otherUserName}
          online={isOnline}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-sm font-semibold text-foreground">
              {chat.otherUserName}
            </h3>
            <span className="shrink-0 text-xs text-muted-foreground nums-tabular">
              {formatConversationTime(chat.lastMessageTime)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-sm",
                chat.unreadCount > 0
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {chat.isLastMessageFromMe && "You: "}
              {chat.lastMessage}
            </p>
            {chat.unreadCount > 0 && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-white nums-tabular">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </motion.button>
    );
  }
);

ConversationItem.displayName = "ConversationItem";
