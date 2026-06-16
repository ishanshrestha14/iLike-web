import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },
    banReason: {
      type: String,
      default: null,
    },
    bio: String,
    avatar: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hasCompletedProfile: {
      type: Boolean,
      default: false
    },
    deletedAccount: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    previousRefreshToken: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    }
  },
  { timestamps: true }
);

// Create and export the User model.
// Guard against double-registration: the codebase imports this file under two
// casings ("user.js" / "User.js") which ESM loads twice on case-insensitive
// filesystems, otherwise throwing OverwriteModelError.
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
