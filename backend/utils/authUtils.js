import jwt from "jsonwebtoken";
import User from "../models/user.js";

/**
 * Verify JWT token and return user data
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - User data if valid
 * @throws {Error} - If token is invalid or user not found
 */
export const verifyToken = async (token) => {
  if (!token) {
    throw new Error("No token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.deletedAccount) {
      throw new Error("User not found");
    }

    return {
      userId: decoded.id,
      user: user,
    };
  } catch (error) {
    throw new Error("Invalid token");
  }
};

/**
 * Extract token from different sources
 * @param {Object} source - Source object (req for Express, socket for Socket.IO)
 * @returns {string|null} - Extracted token
 */
export const extractToken = (source) => {
  // For Express requests
  if (source.headers) {
    const authHeader = source.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
  }

  // For Socket.IO connections
  if (source.handshake && source.handshake.auth) {
    return source.handshake.auth.token;
  }

  return null;
};

/**
 * Express middleware for authentication
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const { userId, user } = await verifyToken(token);

    req.userId = userId;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

/**
 * Socket.IO middleware for authentication
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const token = extractToken(socket);
    const { userId, user } = await verifyToken(token);

    socket.userId = userId;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
};
