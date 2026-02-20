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
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

reportSchema.index({ reporterId: 1, reportedId: 1 });
reportSchema.index({ status: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
