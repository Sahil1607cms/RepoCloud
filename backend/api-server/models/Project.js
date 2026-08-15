import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      default: "Unnamed Project",
    },
    repoUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Building", "Success", "Failed"],
      default: "Building",
    },
    url: {
      type: String,
      required: true,
    },
    logs: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Transform schema for JSON response to map `projectId` to `id`
projectSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret.projectId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Project = mongoose.model("Project", projectSchema);
