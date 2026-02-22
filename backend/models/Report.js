import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: ["inappropriate", "spam", "harassment", "fake_profile", "other"],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    adminNote: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reportSchema.index({ reporterId: 1, reportedId: 1 }, { unique: true });
reportSchema.index({ status: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
