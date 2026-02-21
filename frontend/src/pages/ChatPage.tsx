import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Check,
  CheckCheck,
  Trash2,
  Ban,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import * as chatService from "@/services/chatService";
import type { ChatSummary, ChatMessage } from "@/services/chatService";
import * as socketService from "@/services/socketService";
import * as blockReportService from "@/services/blockReportService";
import type { ReportReason } from "@/services/blockReportService";
import { SERVER_BASE_URL } from "@/services/api";
import { toast } from "react-toastify";

const ConversationItem = React.memo(
  ({
    chat,
    isSelected,
    isOnline,
    onClick,
    getProfilePicUrl,
    formatConversationTime,
  }: {
    chat: ChatSummary;
    isSelected: boolean;
    isOnline: boolean;
    onClick: () => void;
    getProfilePicUrl: (chat: ChatSummary) => string | undefined;
    formatConversationTime: (date: string | Date) => string;
  }) => {
    const picUrl = getProfilePicUrl(chat);
    return (
      <div
        onClick={onClick}
        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 ${
          isSelected ? "bg-pink-50 border-pink-200" : ""
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            {picUrl ? (
              <img
                src={picUrl}
                alt={chat.otherUserName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-red-400 flex items-center justify-center text-white font-bold text-lg">
                {chat.otherUserName.charAt(0)}
              </div>
            )}
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 truncate">
                {chat.otherUserName}
              </h3>
              <span className="text-xs text-gray-500">
                {formatConversationTime(chat.lastMessageTime)}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate mt-1">
              {chat.isLastMessageFromMe && "You: "}
              {chat.lastMessage}
            </p>
          </div>

          {chat.unreadCount > 0 && (
            <div className="bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {chat.unreadCount}
            </div>
          )}
        </div>
      </div>
    );
  }
);

const MessageBubble = React.memo(
  ({
    message,
    formatTime,
    onDelete,
  }: {
    message: ChatMessage;
    formatTime: (date: string | Date) => string;
    onDelete?: (messageId: string) => void;
  }) => {
    const [showDelete, setShowDelete] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDeleted = !!message.deletedAt;
    const canDelete = message.isFromMe && !isDeleted && onDelete;

    const handleMouseEnter = () => {
      if (canDelete) setShowDelete(true);
    };
    const handleMouseLeave = () => {
      setShowDelete(false);
    };
    const handleTouchStart = () => {
      if (canDelete) {
        longPressTimer.current = setTimeout(() => setShowDelete(true), 500);
      }
    };
    const handleTouchEnd = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    return (
      <div
        className={`group flex ${message.isFromMe ? "justify-end" : "justify-start"}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Delete button (before bubble for own messages) */}
        {message.isFromMe && showDelete && (
          <button
            onClick={() => onDelete?.(message.messageId)}
            className="self-center mr-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Delete message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
            isDeleted
              ? "bg-gray-100 border border-gray-200"
              : message.isFromMe
                ? "bg-gradient-to-r from-pink-500 to-red-500 text-white"
                : "bg-white text-gray-800 shadow-sm"
          }`}
        >
          {isDeleted ? (
            <p className="text-sm italic text-gray-400 flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" />
              This message was deleted
            </p>
          ) : (
            <p className="text-sm">{message.content}</p>
          )}
          <span
            className={`flex items-center gap-1 text-xs mt-1 ${
              isDeleted
                ? "text-gray-400"
                : message.isFromMe
                  ? "text-pink-100"
                  : "text-gray-500"
            }`}
          >
            {formatTime(message.timestamp)}
            {message.isFromMe &&
              !isDeleted &&
              (message.status === "read" ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
              ) : message.status === "delivered" ? (
                <CheckCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              ))}
          </span>
        </div>
      </div>
    );
  }
);

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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-red-50">
        <Navbar onLogout={() => {}} />
        <main className="h-[calc(100vh-80px)] p-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading conversations...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-red-50">
      <Navbar onLogout={() => {}} />
      <main className="h-[calc(100vh-80px)] p-0">
        <div className="h-full bg-gray-50">
          <div className="flex h-full bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Sidebar - Conversations List */}
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-800">Messages</h1>
              </div>

              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery
                      ? "No conversations found"
                      : "No conversations yet. Match with someone to start chatting!"}
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
                  <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {getProfilePicUrl(selectedChat) ? (
                          <img
                            src={getProfilePicUrl(selectedChat)}
                            alt={selectedChat.otherUserName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-red-400 flex items-center justify-center text-white font-bold">
                            {selectedChat.otherUserName.charAt(0)}
                          </div>
                        )}
                        {isOtherUserOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h2 className="font-semibold text-gray-800">
                          {selectedChat.otherUserName}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {isOtherUserTyping
                            ? "Typing..."
                            : isOtherUserOnline
                              ? "Online"
                              : "Offline"}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                          <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                          <Video className="w-5 h-5" />
                        </button>
                        <div className="relative" ref={menuRef}>
                          <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
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
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                  >
                    {hasMoreMessages && (
                      <div className="text-center py-2">
                        <button
                          onClick={loadOlderMessages}
                          disabled={loadingOlder}
                          className="text-sm text-pink-500 hover:text-pink-600 font-medium disabled:opacity-50"
                        >
                          {loadingOlder ? "Loading..." : "Load older messages"}
                        </button>
                      </div>
                    )}
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400">
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
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="bg-white border-t border-gray-200 p-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                        <ImageIcon className="w-5 h-5" />
                      </button>

                      <div className="flex-1 relative">
                        <textarea
                          value={newMessage}
                          onChange={handleTyping}
                          onKeyDown={handleKeyPress}
                          placeholder="Type a message..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          rows={1}
                          style={{ minHeight: "44px", maxHeight: "120px" }}
                        />
                      </div>

                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full hover:from-pink-600 hover:to-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-gray-600">
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
