import mongoose, { Schema, Document } from "mongoose";
import Project from "./Project";
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  passwordHash: string;
  projects: string[];
  /**
   * Incremented whenever all previously issued sessions for this user
   * should be invalidated (password change, explicit "sign out
   * everywhere"). Session JWTs embed the tokenVersion they were issued
   * with; getSession() rejects any token whose version doesn't match
   * the current value here, even if the JWT signature is still valid.
   */
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    projects: {
      type: [String],
      default: [],
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
