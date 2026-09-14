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
  },
  {
    timestamps: true,
  }
);

// Temporary projects are, by design, un-owned and meant for short-lived
// use (e.g. trying the tool out before creating an account). Previously
// nothing ever expired them, so an unauthenticated caller could create an
// unbounded number of permanent rows via POST /api/projects/temp. Expire
// them a week after creation; the CLI/UI already warn that this is a
// temporary, un-owned project.
ProjectTempSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export default mongoose.models.ProjectTemp ||
  mongoose.model<IProjectTemp>("ProjectTemp", ProjectTempSchema, "projects-temp");
