import mongoose, { type Model, type Types } from "mongoose";

export const ADDRESS_TYPES = ["HOME", "WORK", "OTHER"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export interface IAddress {
  _id: Types.ObjectId;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  type: AddressType;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new mongoose.Schema<IAddress>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      ref: "User",
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: /^[1-9]\d{5}$/,
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },
    type: {
      type: String,
      enum: ADDRESS_TYPES,
      default: "HOME",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AddressSchema.index({ userId: 1, isDefault: 1 });

const Address: Model<IAddress> =
  mongoose.models.Address || mongoose.model<IAddress>("Address", AddressSchema);

export default Address;
