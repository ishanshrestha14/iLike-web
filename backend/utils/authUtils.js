import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

    if (user.isBanned) {
      const err = new Error("Your account has been banned.");
      err.status = 403;
      throw err;
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const until = user.suspendedUntil.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const err = new Error(`Your account is suspended until ${until}.`);
      err.status = 403;
      throw err;
    }

    return {
      userId: decoded.id,
      user: user,
    };
  } catch (error) {
    if (error.status === 403) throw error;
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
    const status = error.status === 403 ? 403 : 401;
    return res.status(status).json({ success: false, message: error.message || "Unauthorized" });
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
