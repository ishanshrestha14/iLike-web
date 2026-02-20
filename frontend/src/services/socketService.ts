import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ||
  "http://localhost:5000";

// Types matching backend socket events
export interface SocketMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "emoji";
  status: string;
  timestamp: string;
  isFromMe: boolean;
}

export interface TypingEvent {
  userId: string;
  chatId: string;
  isTyping: boolean;
}

export interface ChatUpdatedEvent {
  chatId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface MessagesReadEvent {
  chatId: string;
  readBy: string;
  timestamp: string;
}

export interface UserStatusEvent {
  userId: string;
}

let socket: Socket | null = null;

export const connect = (): Socket => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem("token");
  if (!token) throw new Error("No auth token found");

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

// Chat room actions
export const joinChat = (chatId: string) => {
  socket?.emit("join_chat", chatId);
};

export const leaveChat = (chatId: string) => {
  socket?.emit("leave_chat", chatId);
};

export const sendMessage = (chatId: string, content: string, type = "text") => {
  socket?.emit("send_message", { chatId, content, type });
};

export const startTyping = (chatId: string) => {
  socket?.emit("typing_start", { chatId });
};

export const stopTyping = (chatId: string) => {
  socket?.emit("typing_stop", { chatId });
};

export const markRead = (chatId: string) => {
  socket?.emit("mark_read", { chatId });
};

// Event listeners — return unsubscribe functions
export const onMessage = (cb: (msg: SocketMessage) => void) => {
  socket?.on("new_message", cb);
  return () => { socket?.off("new_message", cb); };
};

export const onMessageSent = (cb: (msg: SocketMessage) => void) => {
  socket?.on("message_sent", cb);
  return () => { socket?.off("message_sent", cb); };
};

export const onTyping = (cb: (event: TypingEvent) => void) => {
  socket?.on("user_typing", cb);
  return () => { socket?.off("user_typing", cb); };
};

export const onChatUpdated = (cb: (event: ChatUpdatedEvent) => void) => {
  socket?.on("chat_updated", cb);
  return () => { socket?.off("chat_updated", cb); };
};

export const onMessagesRead = (cb: (event: MessagesReadEvent) => void) => {
  socket?.on("messages_read", cb);
  return () => { socket?.off("messages_read", cb); };
};

export const onUserOnline = (cb: (event: UserStatusEvent) => void) => {
  socket?.on("user_online", cb);
  return () => { socket?.off("user_online", cb); };
};

export const onUserOffline = (cb: (event: UserStatusEvent) => void) => {
  socket?.on("user_offline", cb);
  return () => { socket?.off("user_offline", cb); };
};

export const onMessageError = (cb: (err: { message: string }) => void) => {
  socket?.on("message_error", cb);
  return () => { socket?.off("message_error", cb); };
};
