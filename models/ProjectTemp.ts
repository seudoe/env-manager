import mongoose, { Schema, Document } from "mongoose";

export interface ICommit {
  id: string;
  committedBy: string | null;
  committedAt: Date | null;
  data: string;
}

export interface IProjectTemp extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  commits: ICommit[];
  tokenHash: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTempSchema = new Schema<IProjectTemp>(
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ProjectTemp ||
  mongoose.model<IProjectTemp>("ProjectTemp", ProjectTempSchema, "projects-temp");
