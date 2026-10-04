import mongoose, { Schema, Model } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: "CUSTOMER" | "ADMIN" ;
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED";
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["CUSTOMER",  "ADMIN", ],
      default: "CUSTOMER",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "BLOCKED"],
      default: "ACTIVE",
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;