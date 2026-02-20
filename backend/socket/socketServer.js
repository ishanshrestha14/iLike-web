import { Server } from "socket.io";
import { authenticateSocket } from "../utils/authUtils.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/user.js";

class SocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Use shared authentication middleware
    this.io.use(authenticateSocket);
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.userId}`);

      // Store user-socket mapping
      this.userSockets.set(socket.userId, socket.id);
      this.socketUsers.set(socket.id, socket.userId);

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);

      // Emit online status to all connected users
      this.io.emit("user_online", { userId: socket.userId });

      // Handle joining chat rooms
      socket.on("join_chat", async (chatId) => {
        try {
          const chat = await Chat.findOne({
            _id: chatId,
            participants: socket.userId,
          });

          if (chat) {
            socket.join(`chat_${chatId}`);
            console.log(`User ${socket.userId} joined chat ${chatId}`);
          }
        } catch (error) {
          console.error("Error joining chat:", error);
        }
      });

      // Handle leaving chat rooms
      socket.on("leave_chat", (chatId) => {
        socket.leave(`chat_${chatId}`);
        console.log(`User ${socket.userId} left chat ${chatId}`);
      });

      // Handle typing indicators
      socket.on("typing_start", (data) => {
        const { chatId } = data;
        socket.to(`chat_${chatId}`).emit("user_typing", {
          userId: socket.userId,
          chatId,
          isTyping: true,
        });
      });

      socket.on("typing_stop", (data) => {
        const { chatId } = data;
        socket.to(`chat_${chatId}`).emit("user_typing", {
          userId: socket.userId,
          chatId,
          isTyping: false,
        });
      });

      // Handle new messages
      socket.on("send_message", async (data) => {
        try {
          const { chatId, content, type = "text" } = data;

          // Verify user is participant in chat
          const chat = await Chat.findOne({
            _id: chatId,
            participants: socket.userId,
          });

          if (!chat) {
            socket.emit("message_error", { message: "Chat not found" });
            return;
          }

          // Create and save message
          const message = new Message({
            chatId,
            senderId: socket.userId,
            content: content.trim(),
            type,
            status: "sent",
          });

          await message.save();

          // Update chat's last message
          chat.lastMessage = {
            content: content.trim(),
            senderId: socket.userId,
            timestamp: new Date(),
          };

          // Increment unread count for other participants
          chat.participants.forEach((participantId) => {
            if (participantId.toString() !== socket.userId) {
              const currentCount =
                chat.unreadCounts.get(participantId.toString()) || 0;
              chat.unreadCounts.set(participantId.toString(), currentCount + 1);
            }
          });

          await chat.save();

          // Emit message to all participants in the chat
          const messageData = {
            messageId: message.messageId,
            chatId: message.chatId,
            senderId: message.senderId,
            content: message.content,
            type: message.type,
            status: message.status,
            timestamp: message.timestamp,
            isFromMe: false, // Will be set to true for sender
          };

          // Emit to all participants except sender
          socket.to(`chat_${chatId}`).emit("new_message", messageData);

          // Emit confirmation to sender
          socket.emit("message_sent", {
            ...messageData,
            isFromMe: true,
          });

          // Emit chat update to all participants
          const chatUpdate = {
            chatId,
            lastMessage: content.trim(),
            lastMessageTime: new Date(),
            unreadCount: chat.unreadCounts.get(socket.userId) || 0,
          };

          this.io.to(`chat_${chatId}`).emit("chat_updated", chatUpdate);
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("message_error", { message: "Failed to send message" });
        }
      });

      // Handle read receipts
      socket.on("mark_read", async (data) => {
        try {
          const { chatId } = data;

          // Mark messages as read
          await Message.updateMany(
            {
              chatId,
              senderId: { $ne: socket.userId },
              "readBy.userId": { $ne: socket.userId },
            },
            {
              $push: {
                readBy: {
                  userId: socket.userId,
                  readAt: new Date(),
                },
              },
              $set: { status: "read" },
            }
          );

          // Update chat unread count
          const chat = await Chat.findOne({
            _id: chatId,
            participants: socket.userId,
          });
          if (chat) {
            chat.unreadCounts.set(socket.userId, 0);
            await chat.save();

            // Emit read receipt to message senders
            socket.to(`chat_${chatId}`).emit("messages_read", {
              chatId,
              readBy: socket.userId,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.userId}`);

        // Remove user-socket mappings
        this.userSockets.delete(socket.userId);
        this.socketUsers.delete(socket.id);

        // Emit offline status
        this.io.emit("user_offline", { userId: socket.userId });
      });
    });
  }

  // Utility methods
  getUserSocket(userId) {
    return this.userSockets.get(userId);
  }

  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send to all users except sender
  sendToAllExcept(socketId, event, data) {
    socketId.to(event, data);
  }
}

export default SocketServer;
