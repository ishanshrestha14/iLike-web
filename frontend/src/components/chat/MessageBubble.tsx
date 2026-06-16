import React, { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Ban, Check, CheckCheck, Trash2 } from "lucide-react";

import type { ChatMessage } from "@/services/chatService";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  formatTime: (date: string | Date) => string;
  onDelete?: (messageId: string) => void;
}

/**
 * A single chat message. Own messages use the brand gradient; received
 * messages use the card surface. Animates in on mount; supports the deleted
 * state, read-receipt ticks, and a hover/long-press delete affordance.
 */
export const MessageBubble = React.memo(
  ({ message, formatTime, onDelete }: MessageBubbleProps) => {
    const reduce = useReducedMotion();
    const [showDelete, setShowDelete] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isDeleted = !!message.deletedAt;
    const isMine = message.isFromMe;
    const canDelete = isMine && !isDeleted && !!onDelete;

    const handleTouchStart = () => {
      if (canDelete) {
        longPressTimer.current = setTimeout(() => setShowDelete(true), 500);
      }
    };
    const handleTouchEnd = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    return (
      <motion.div
        className={cn("group flex", isMine ? "justify-end" : "justify-start")}
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onMouseEnter={() => canDelete && setShowDelete(true)}
        onMouseLeave={() => setShowDelete(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isMine && showDelete && (
          <button
            onClick={() => onDelete?.(message.messageId)}
            className="mr-2 cursor-pointer self-center rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete message"
            aria-label="Delete message"
          >
            <Trash2 className="size-4" />
          </button>
        )}

        <div
          className={cn(
            "max-w-[78%] rounded-2xl px-4 py-2",
            isDeleted
              ? "border border-border bg-muted text-muted-foreground"
              : isMine
                ? "rounded-br-md bg-gradient-brand text-white shadow-sm"
                : "rounded-bl-md bg-card text-card-foreground shadow-sm"
          )}
        >
          {isDeleted ? (
            <p className="flex items-center gap-1.5 text-sm italic">
              <Ban className="size-3.5" />
              This message was deleted
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.content}
            </p>
          )}

          <span
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-xs nums-tabular",
              isDeleted
                ? "text-muted-foreground"
                : isMine
                  ? "text-white/75"
                  : "text-muted-foreground"
            )}
          >
            {formatTime(message.timestamp)}
            {isMine &&
              !isDeleted &&
              (message.status === "read" ? (
                <CheckCheck className="size-3.5 text-super" />
              ) : message.status === "delivered" ? (
                <CheckCheck className="size-3.5" />
              ) : (
                <Check className="size-3.5" />
              ))}
          </span>
        </div>
      </motion.div>
    );
  }
);

MessageBubble.displayName = "MessageBubble";
