import mongoose, { Schema, Document } from "mongoose";

export interface IProjectTemp extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  projectName: string;
  dataBlob: string;
  size?: number;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTempSchema = new Schema<IProjectTemp>(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    projectName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    dataBlob: { type: String, required: true },
    size: { type: Number, default: 0 },
    tokenHash: { type: String, required: true },
  },
  { timestamps: true }
);

ProjectTempSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

if (mongoose.models.ProjectTemp) {
  delete mongoose.models.ProjectTemp;
}
export default mongoose.model<IProjectTemp>("ProjectTemp", ProjectTempSchema, "projects-temp");
