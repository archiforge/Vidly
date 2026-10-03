import { model, Schema, type InferSchemaType } from 'mongoose';

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    isGold: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

customerSchema.index({ phone: 1 }, { unique: true });
customerSchema.index({ name: 1 });

export type CustomerDocument = InferSchemaType<typeof customerSchema>;
export const Customer = model('Customer', customerSchema);
