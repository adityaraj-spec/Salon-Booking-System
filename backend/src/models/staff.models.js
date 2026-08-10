import mongoose from "mongoose";

const staffScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: true,
    },
    startTime: {
      type: String,
      default: "09:00",
    },
    endTime: {
      type: String,
      default: "18:00",
    },
    breakStart: {
      type: String,
      default: "13:00",
    },
    breakEnd: {
      type: String,
      default: "14:00",
    },
    isWorking: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const staffExceptionSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true, // "YYYY-MM-DD"
    },
    type: {
      type: String,
      enum: ["day_off", "holiday"],
      default: "day_off",
    },
    reason: String,
  },
  { timestamps: true }
);

const staffSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    role: String,
    experience: Number,
    skills: [String],
    profilePic: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    schedule: [staffScheduleSchema],
    exceptions: [staffExceptionSchema],
  },
  { timestamps: true }
);

staffSchema.index({ salon: 1, isActive: 1 });

export const Staff = mongoose.model("Staff", staffSchema);
