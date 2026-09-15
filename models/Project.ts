import mongoose, { Schema, Document } from "mongoose";

export interface IContributor {
  userId: string;
  username: string;
  role: "editor" | "viewer";
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  dataBlob: string;
  size?: number;
  tokenHash: string;
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
    projectId: { type: String, required: true, unique: true, index: true },
    projectName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    dataBlob: { type: String, required: true },
    size: { type: Number, default: 0 },
    tokenHash: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    ownerUsername: { type: String, required: true },
    contributors: { type: [ContributorSchema], default: [] },
  },
  { timestamps: true }
);

ProjectSchema.index({ "contributors.userId": 1 });

if (mongoose.models.Project) {
  delete mongoose.models.Project;
}
export default mongoose.model<IProject>("Project", ProjectSchema);
