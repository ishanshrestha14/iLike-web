import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/user.js";
import Profile from "../models/Profile.js";
import Match from "../models/Match.js";
import { isValidObjectId } from "../utils/validate.js";

// Get all chats for the current user
export const getChats = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all chats where the current user is a participant
    const chats = await Chat.find({
      participants: userId,
      isActive: true,
    }).populate("participants", "name");

    // Collect other participant IDs and batch-fetch their profiles (1 query instead of N)
    const otherParticipantIds = chats
      .map((chat) => chat.participants.find((p) => p._id.toString() !== userId)?._id)
      .filter(Boolean);

    const profiles = await Profile.find({ userId: { $in: otherParticipantIds } });
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // Build chat details using the pre-fetched profile map
    const chatDetails = chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== userId
      );

      if (!otherParticipant) return null;

      const profile = profileMap.get(otherParticipant._id.toString());

      return {
        chatId: chat._id,
        otherUserId: otherParticipant._id,
        otherUserName: otherParticipant.name,
        otherUserProfilePicture: profile?.profilePictureUrl || null,
        otherUserPhotoUrls: profile?.photoUrls || [],
        lastMessageTime: chat.lastMessage?.timestamp || chat.updatedAt,
        lastMessage: chat.lastMessage?.content || "No messages yet",
        isLastMessageFromMe:
          chat.lastMessage?.senderId?.toString() === userId,
        unreadCount: chat.unreadCounts.get(userId) || 0,
      };
    });

    // Filter out null values and sort by last message time
    const validChats = chatDetails
      .filter((chat) => chat !== null)
      .sort(
        (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );

    res.json(validChats);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get chats" });
  }
};

// Get messages for a specific chat
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat ID" });
    }

    // Verify the user is a participant in this chat
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    // Pagination: load newest messages first, optionally before a cursor timestamp
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const filter = { chatId };
    if (req.query.before) {
      filter.timestamp = { $lt: new Date(req.query.before) };
    }

    // Fetch limit+1 to know if there are older messages
    const messages = await Message.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit + 1)
      .populate("senderId", "name");

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Reverse back to chronological order
    messages.reverse();

    // Format messages for frontend
    const formattedMessages = messages.map((message) => ({
      messageId: message.messageId,
      chatId: message.chatId,
      senderId: message.senderId._id,
      content: message.content,
      type: message.type,
      status: message.status,
      timestamp: message.timestamp,
      isFromMe: message.senderId._id.toString() === userId,
    }));

    // Mark messages as read for the current user
    await markMessagesAsReadHelper(chatId, userId);

    res.json({ messages: formattedMessages, hasMore });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get messages" });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = "text" } = req.body;
    const userId = req.userId;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat ID" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Message content is required" });
    }

    // Verify the user is a participant in this chat
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    // Create the message
    const message = new Message({
      chatId,
      senderId: userId,
      content: content.trim(),
      type,
      status: "sent",
    });

    await message.save();

    // Update chat's last message
    chat.lastMessage = {
      content: content.trim(),
      senderId: userId,
      timestamp: new Date(),
    };

    // Increment unread count for other participants
    chat.participants.forEach((participantId) => {
      if (participantId.toString() !== userId) {
        const currentCount =
          chat.unreadCounts.get(participantId.toString()) || 0;
        chat.unreadCounts.set(participantId.toString(), currentCount + 1);
      }
    });

    await chat.save();

    // Return the formatted message
    const formattedMessage = {
      messageId: message.messageId,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      status: message.status,
      timestamp: message.timestamp,
      isFromMe: true,
    };

    res.status(201).json(formattedMessage);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// Shared helper: mark messages as read for a user in a chat
export const markMessagesAsReadHelper = async (chatId, userId) => {
  const chat = await Chat.findOne({ _id: chatId, participants: userId });
  if (!chat) return;

  await Message.updateMany(
    {
      chatId,
      senderId: { $ne: userId },
      "readBy.userId": { $ne: userId },
    },
    {
      $push: {
        readBy: {
          userId,
          readAt: new Date(),
        },
      },
      $set: { status: "read" },
    }
  );

  chat.unreadCounts.set(userId, 0);
  await chat.save();
};

// Mark messages as read (HTTP handler)
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat ID" });
    }

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    await markMessagesAsReadHelper(chatId, userId);

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to mark messages as read" });
  }
};

// Create a new chat
export const createChat = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.userId;

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: "Other user ID is required" });
    }

    if (!isValidObjectId(otherUserId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // Check if other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if users are matched (isMatch: true in either direction)
    const match = await Match.findOne({
      $or: [
        { likerId: userId, likedId: otherUserId, isMatch: true },
        { likerId: otherUserId, likedId: userId, isMatch: true },
      ],
    });
    if (!match) {
      return res
        .status(403)
        .json({ success: false, message: "You must be matched to start a chat." });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (existingChat) {
      // Return the existing chat in the same format as new chat
      const profile = await Profile.findOne({ userId: otherUserId });
      return res.status(200).json({
        chatId: existingChat._id,
        otherUserId: otherUser._id,
        otherUserName: otherUser.name,
        otherUserProfilePicture: profile?.profilePictureUrl || null,
        otherUserPhotoUrls: profile?.photoUrls || [],
        lastMessageTime:
          existingChat.lastMessage?.timestamp || existingChat.updatedAt,
        lastMessage: existingChat.lastMessage?.content || "No messages yet",
        isLastMessageFromMe:
          existingChat.lastMessage?.senderId?.toString() === userId,
        unreadCount: existingChat.unreadCounts.get(userId) || 0,
      });
    }

    // Create new chat
    const chat = new Chat({
      participants: [userId, otherUserId],
      unreadCounts: new Map(),
    });

    await chat.save();

    // Get the other user's profile
    const profile = await Profile.findOne({ userId: otherUserId });

    const chatResponse = {
      chatId: chat._id,
      otherUserId: otherUser._id,
      otherUserName: otherUser.name,
      otherUserProfilePicture: profile?.profilePictureUrl || null,
      otherUserPhotoUrls: profile?.photoUrls || [],
      lastMessageTime: chat.createdAt,
      lastMessage: "Chat started",
      isLastMessageFromMe: false,
      unreadCount: 0,
    };

    res.status(201).json(chatResponse);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create chat" });
  }
};

// Get chat by ID
export const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat ID" });
    }

    // Verify the user is a participant in this chat
    const chat = await Chat.findOne({ _id: chatId, participants: userId }).populate(
      "participants",
      "name"
    );

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    // Find the other participant
    const otherParticipant = chat.participants.find(
      (p) => p._id.toString() !== userId
    );

    if (!otherParticipant) {
      return res.status(404).json({ success: false, message: "Other participant not found" });
    }

    // Get the other user's profile
    const profile = await Profile.findOne({ userId: otherParticipant._id });

    const chatResponse = {
      chatId: chat._id,
      otherUserId: otherParticipant._id,
      otherUserName: otherParticipant.name,
      otherUserProfilePicture: profile?.profilePictureUrl || null,
      otherUserPhotoUrls: profile?.photoUrls || [],
      lastMessageTime: chat.lastMessage?.timestamp || chat.updatedAt,
      lastMessage: chat.lastMessage?.content || "No messages yet",
      isLastMessageFromMe: chat.lastMessage?.senderId?.toString() === userId,
      unreadCount: chat.unreadCounts.get(userId) || 0,
    };

    res.json(chatResponse);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get chat" });
  }
};

// Delete a chat (soft delete)
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat ID" });
    }

    // Verify the user is a participant in this chat
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    // Soft delete by setting isActive to false
    chat.isActive = false;
    await chat.save();

    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete chat" });
  }
};
