import { model, Schema, type InferSchemaType } from 'mongoose';

/**
 * Rentals embed snapshots (whose `_id` is the referenced document's id) of the customer and movie so that history stays readable
 * (and the agreed daily rate stays fixed) even if those records change later.
 */
const customerSnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    isGold: { type: Boolean, default: false },
  },
  { versionKey: false },
);

const movieSnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    dailyRentalRate: { type: Number, required: true, min: 0 },
  },
  { versionKey: false },
);

export const RENTAL_STATUSES = ['active', 'returned'] as const;

const rentalSchema = new Schema(
  {
    customer: { type: customerSnapshotSchema, required: true },
    movie: { type: movieSnapshotSchema, required: true },
    status: { type: String, enum: RENTAL_STATUSES, required: true, default: 'active' },
    dateOut: { type: Date, required: true, default: Date.now },
    dateReturned: { type: Date },
    rentalFee: { type: Number, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

/** A customer can hold at most one active rental of any given movie. */
export const ACTIVE_RENTAL_INDEX = 'unique_active_rental';
rentalSchema.index(
  { 'customer._id': 1, 'movie._id': 1 },
  { unique: true, name: ACTIVE_RENTAL_INDEX, partialFilterExpression: { status: 'active' } },
);
rentalSchema.index({ status: 1, dateOut: -1 });
rentalSchema.index({ 'movie._id': 1, status: 1 });

export type RentalDocument = InferSchemaType<typeof rentalSchema>;
export const Rental = model('Rental', rentalSchema);
