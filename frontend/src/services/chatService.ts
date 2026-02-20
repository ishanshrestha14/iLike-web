import api from "./api";

export interface ChatSummary {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserProfilePicture: string | null;
  otherUserPhotoUrls: string[];
  lastMessageTime: string;
  lastMessage: string;
  isLastMessageFromMe: boolean;
  unreadCount: number;
}

export interface ChatMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "emoji";
  status: string;
  timestamp: string;
  isFromMe: boolean;
}

export const getChats = async (): Promise<ChatSummary[]> => {
  const { data } = await api.get("/chats");
  return data;
};

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

export const getMessages = async (
  chatId: string,
  before?: string,
  limit = 50
): Promise<MessagesResponse> => {
  const params: Record<string, string | number> = { limit };
  if (before) params.before = before;
  const { data } = await api.get(`/chats/${chatId}/messages`, { params });
  return data;
};

export const sendMessage = async (
  chatId: string,
  content: string,
  type = "text"
): Promise<ChatMessage> => {
  const { data } = await api.post(`/chats/${chatId}/messages`, {
    content,
    type,
  });
  return data;
};

export const createChat = async (otherUserId: string): Promise<ChatSummary> => {
  const { data } = await api.post("/chats", { otherUserId });
  return data;
};

export const getChatById = async (chatId: string): Promise<ChatSummary> => {
  const { data } = await api.get(`/chats/${chatId}`);
  return data;
};

export const markAsRead = async (chatId: string): Promise<void> => {
  await api.put(`/chats/${chatId}/read`);
};
