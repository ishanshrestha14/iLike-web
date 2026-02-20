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
    bio: String,
    avatar: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hasCompletedProfile: {
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String,
      default: null,
    },
    previousRefreshToken: {
      type: String,
      default: null,
    }
  },
  { timestamps: true }
);

// Create and export the User model
export default mongoose.model('User', userSchema);
