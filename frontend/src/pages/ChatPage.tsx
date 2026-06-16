import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  Send,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Search,
  ShieldBan,
  Flag,
  MessageCircle,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import * as chatService from "@/services/chatService";
import type { ChatSummary, ChatMessage } from "@/services/chatService";
import { Avatar } from "@/components/ui/avatar";
import { ConversationItem } from "@/components/chat/ConversationItem";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import * as socketService from "@/services/socketService";
import * as blockReportService from "@/services/blockReportService";
import type { ReportReason } from "@/services/blockReportService";
import { SERVER_BASE_URL } from "@/services/api";
import { toast } from "react-toastify";

const ChatPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("inappropriate");
  const [reportDescription, setReportDescription] = useState("");
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Load conversations on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        const chats = await chatService.getChats();
        setConversations(chats);

        // If matchId is provided (came from MatchesPage), find or create chat
        if (matchId) {
          const existing = chats.find((c) => c.otherUserId === matchId);
          if (existing) {
            setSelectedChat(existing);
          } else {
            // Create a new chat with this match
            try {
              const newChat = await chatService.createChat(matchId);
              setConversations((prev) => [newChat, ...prev]);
              setSelectedChat(newChat);
            } catch {
              toast.error("Could not start chat — match may no longer exist");
            }
          }
        }
      } catch {
        // load failed — loading state cleared in finally
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [matchId]);

  // Connect socket on mount, disconnect on unmount
  useEffect(() => {
    try {
      socketService.connect();
    } catch {
      // socket connection failed
      return;
    }

    const unsubs = [
      socketService.onMessage((msg) => {
        // Add incoming message to the current chat if it matches
        setMessages((prev) => {
          if (prev.length > 0 && prev[0].chatId === msg.chatId) {
            return [...prev, { ...msg, isFromMe: false }];
          }
          return prev;
        });

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.chatId === msg.chatId
              ? {
                  ...c,
                  lastMessage: msg.content,
                  lastMessageTime: msg.timestamp,
                  isLastMessageFromMe: false,
                  unreadCount: c.unreadCount + 1,
                }
              : c
          )
        );
      }),

      socketService.onMessageSent((msg) => {
        // Replace optimistic message or add confirmed message
        setMessages((prev) => {
          // Check if we already have this message (optimistic update)
          const exists = prev.some((m) => m.messageId === msg.messageId);
          if (exists) return prev;
          return [...prev, { ...msg, isFromMe: true }];
        });
      }),

      socketService.onTyping((event) => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (event.isTyping) {
            next.add(event.userId);
          } else {
            next.delete(event.userId);
          }
          return next;
        });
      }),

      socketService.onUserOnline(({ userId }) => {
        setOnlineUsers((prev) => new Set(prev).add(userId));
      }),

      socketService.onUserOffline(({ userId }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }),

      socketService.onChatUpdated((event) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.chatId === event.chatId
              ? {
                  ...c,
                  lastMessage: event.lastMessage,
                  lastMessageTime: event.lastMessageTime,
                }
              : c
          )
        );
      }),

      socketService.onMessagesRead((event) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.chatId === event.chatId && m.isFromMe && m.status !== "read"
              ? { ...m, status: "read" }
              : m
          )
        );
      }),

      socketService.onMessageDeleted((event) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === event.messageId
              ? { ...m, deletedAt: new Date().toISOString(), content: "This message was deleted" }
              : m
          )
        );
        // Update conversation preview if the deleted message was the last one
        setConversations((prev) =>
          prev.map((c) =>
            c.chatId === event.chatId
              ? { ...c, lastMessage: "Message deleted" }
              : c
          )
        );
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
      socketService.disconnect();
    };
  }, []);

  // Load messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;

    let ignore = false;

    const loadMessages = async () => {
      try {
        const { messages: msgs, hasMore } = await chatService.getMessages(
          selectedChat.chatId
        );
        if (!ignore) {
          setMessages(msgs);
          setHasMoreMessages(hasMore);
        }
      } catch {
        // message load failed
        if (!ignore) {
          setMessages([]);
          setHasMoreMessages(false);
        }
      }
    };

    // Join socket room & mark as read
    socketService.joinChat(selectedChat.chatId);
    socketService.markRead(selectedChat.chatId);

    // Clear unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c.chatId === selectedChat.chatId ? { ...c, unreadCount: 0 } : c
      )
    );

    loadMessages();

    return () => {
      ignore = true;
      socketService.leaveChat(selectedChat.chatId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when chatId changes, not on every selectedChat reference update
  }, [selectedChat?.chatId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConversationTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return formatTime(date);
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString();
    }
  };

  const getProfilePicUrl = (chat: ChatSummary): string | undefined => {
    if (chat.otherUserProfilePicture) {
      return `${SERVER_BASE_URL}${chat.otherUserProfilePicture}`;
    }
    if (chat.otherUserPhotoUrls?.length > 0) {
      return `${SERVER_BASE_URL}${chat.otherUserPhotoUrls[0]}`;
    }
    return undefined;
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBlock = async () => {
    if (!selectedChat) return;
    try {
      await blockReportService.blockUser(selectedChat.otherUserId);
      // Remove from conversations list
      setConversations((prev) =>
        prev.filter((c) => c.otherUserId !== selectedChat.otherUserId)
      );
      setSelectedChat(null);
      setMessages([]);
      setShowMenu(false);
    } catch {
      // block failed
    }
  };

  const handleReport = async () => {
    if (!selectedChat) return;
    try {
      await blockReportService.reportUser(
        selectedChat.otherUserId,
        reportReason,
        reportDescription
      );
      setShowReportModal(false);
      setReportReason("inappropriate");
      setReportDescription("");
      setShowMenu(false);
    } catch {
      // report failed
    }
  };

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedChat) return;

    const content = newMessage.trim();
    setNewMessage("");

    // Stop typing indicator
    if (isTypingRef.current) {
      socketService.stopTyping(selectedChat.chatId);
      isTypingRef.current = false;
    }

    // Send via socket for real-time delivery
    socketService.sendMessage(selectedChat.chatId, content);

    // Optimistic update: add message locally
    const optimisticMsg: ChatMessage = {
      messageId: `temp_${Date.now()}`,
      chatId: selectedChat.chatId,
      senderId: user?.id || "",
      content,
      type: "text",
      status: "sending",
      timestamp: new Date().toISOString(),
      isFromMe: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Update conversation preview
    setConversations((prev) =>
      prev.map((c) =>
        c.chatId === selectedChat.chatId
          ? {
              ...c,
              lastMessage: content,
              lastMessageTime: new Date().toISOString(),
              isLastMessageFromMe: true,
            }
          : c
      )
    );
  }, [newMessage, selectedChat, user]);

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewMessage(e.target.value);

      if (!selectedChat) return;

      if (!isTypingRef.current) {
        socketService.startTyping(selectedChat.chatId);
        isTypingRef.current = true;
      }

      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedChat) {
          socketService.stopTyping(selectedChat.chatId);
          isTypingRef.current = false;
        }
      }, 2000);
    },
    [selectedChat]
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadOlderMessages = useCallback(async () => {
    if (!selectedChat || !hasMoreMessages || loadingOlder || messages.length === 0)
      return;
    setLoadingOlder(true);
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    try {
      const oldest = messages[0].timestamp;
      const { messages: older, hasMore } = await chatService.getMessages(
        selectedChat.chatId,
        oldest
      );
      setMessages((prev) => [...older, ...prev]);
      setHasMoreMessages(hasMore);
      // Preserve scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } catch {
      // older messages load failed
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedChat, hasMoreMessages, loadingOlder, messages]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedChat) return;
      try {
        // Emit socket event for real-time update
        socketService.deleteMessage(selectedChat.chatId, messageId);

        // Optimistic update
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === messageId
              ? { ...m, deletedAt: new Date().toISOString(), content: "This message was deleted" }
              : m
          )
        );
      } catch {
        toast.error("Failed to delete message");
      }
    },
    [selectedChat]
  );

  const selectConversation = (chat: ChatSummary) => {
    setSelectedChat(chat);
    navigate(`/chat/${chat.otherUserId}`);
  };

  const filteredConversations = useMemo(
    () =>
      conversations.filter((c) =>
        c.otherUserName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [conversations, searchQuery]
  );

  const isOtherUserOnline =
    selectedChat && onlineUsers.has(selectedChat.otherUserId);
  const isOtherUserTyping =
    selectedChat && typingUsers.has(selectedChat.otherUserId);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar onLogout={() => {}} />
        <main className="h-[calc(100vh-80px)] p-0">
          <div className="h-full w-80 space-y-1 border-r border-border bg-card p-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar onLogout={() => {}} />
      <main className="h-[calc(100vh-80px)] p-0">
        <div className="h-full bg-background">
          <div className="flex h-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {/* Sidebar - Conversations List */}
            <div className="flex w-80 flex-col border-r border-border bg-card">
              <div className="border-b border-border p-4">
                <h1 className="font-display text-xl font-bold text-foreground">
                  Messages
                </h1>
              </div>

              <div className="border-b border-border p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search conversations…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-12 text-center">
                    <div className="grid size-14 place-items-center rounded-full bg-accent">
                      <MessageCircle className="size-7 text-brand" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {searchQuery
                        ? "No conversations found"
                        : "No conversations yet. Match with someone to start chatting!"}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((chat) => (
                    <ConversationItem
                      key={chat.chatId}
                      chat={chat}
                      isSelected={selectedChat?.chatId === chat.chatId}
                      isOnline={onlineUsers.has(chat.otherUserId)}
                      onClick={() => selectConversation(chat)}
                      getProfilePicUrl={getProfilePicUrl}
                      formatConversationTime={formatConversationTime}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-border bg-card p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={getProfilePicUrl(selectedChat)}
                        name={selectedChat.otherUserName}
                        size="sm"
                        online={!!isOtherUserOnline}
                      />

                      <div className="flex-1">
                        <h2 className="font-display font-semibold text-foreground">
                          {selectedChat.otherUserName}
                        </h2>
                        <p
                          className={cn(
                            "text-sm",
                            isOtherUserTyping
                              ? "text-brand"
                              : isOtherUserOnline
                                ? "text-like"
                                : "text-muted-foreground"
                          )}
                        >
                          {isOtherUserTyping
                            ? "Typing…"
                            : isOtherUserOnline
                              ? "Online"
                              : "Offline"}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                          <Phone className="w-5 h-5" />
                        </button>
                        <button className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                          <Video className="w-5 h-5" />
                        </button>
                        <div className="relative" ref={menuRef}>
                          <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {showMenu && (
                            <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                              <button
                                onClick={() => {
                                  setShowReportModal(true);
                                  setShowMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Flag className="w-4 h-4" />
                                Report User
                              </button>
                              <button
                                onClick={handleBlock}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <ShieldBan className="w-4 h-4" />
                                Block User
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 space-y-4 overflow-y-auto bg-background p-4"
                  >
                    {hasMoreMessages && (
                      <div className="py-2 text-center">
                        <button
                          onClick={loadOlderMessages}
                          disabled={loadingOlder}
                          className="cursor-pointer text-sm font-medium text-brand hover:text-brand/80 disabled:opacity-50"
                        >
                          {loadingOlder ? "Loading..." : "Load older messages"}
                        </button>
                      </div>
                    )}
                    {messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <MessageBubble
                          key={message.messageId}
                          message={message}
                          formatTime={formatTime}
                          onDelete={handleDeleteMessage}
                        />
                      ))
                    )}
                    {isOtherUserTyping && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-border bg-card p-4">
                    <div className="flex items-center space-x-2">
                      <button
                        aria-label="Attach image"
                        className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>

                      <div className="relative flex-1">
                        <textarea
                          value={newMessage}
                          onChange={handleTyping}
                          onKeyDown={handleKeyPress}
                          placeholder="Type a message…"
                          className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                          rows={1}
                          style={{ minHeight: "44px", maxHeight: "120px" }}
                        />
                      </div>

                      <motion.button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Send message"
                        className="grid size-11 cursor-pointer place-items-center rounded-full bg-gradient-brand text-white shadow-brand transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-background">
                  <div className="px-6 text-center">
                    <div className="mx-auto grid size-20 place-items-center rounded-full bg-accent">
                      <MessageCircle className="size-10 text-brand" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                      Select a conversation
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      Choose a conversation from the sidebar to start chatting
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Modal */}
        {showReportModal && selectedChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Report {selectedChat.otherUserName}
              </h3>

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <select
                value={reportReason}
                onChange={(e) =>
                  setReportReason(e.target.value as ReportReason)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="inappropriate">Inappropriate content</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="fake_profile">Fake profile</option>
                <option value="other">Other</option>
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Details (optional)
              </label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows={3}
                maxLength={500}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportDescription("");
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  className="flex-1 bg-red-500 text-white py-2 px-4 rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
