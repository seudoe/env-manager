import mongoose, { Schema, Document } from "mongoose";

export interface IContributor {
  userId: string;
  username: string;
  role: "editor" | "viewer";
}

export interface ICommit {
  id: string;
  committedBy: string | null;
  committedAt: Date | null;
  data: string;
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  data?: string; // Legacy field, to be migrated
  commits: ICommit[];
  tokenHash: string;
  token: string;
  ownerId: string;
  ownerUsername: string;
  contributors: IContributor[];
  createdAt: Date;
  updatedAt: Date;
}

const ContributorSchema = new Schema<IContributor>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ["editor", "viewer"], required: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProject>(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    data: {
      type: String,
      required: false,
    },
    commits: {
      type: [
        new Schema<ICommit>(
          {
            id: { type: String, required: true },
            committedBy: { type: String, default: null },
            committedAt: { type: Date, default: null },
            data: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    tokenHash: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    ownerUsername: {
      type: String,
      required: true,
    },
    contributors: {
      type: [ContributorSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding projects a user contributes to
ProjectSchema.index({ "contributors.userId": 1 });

export default mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
