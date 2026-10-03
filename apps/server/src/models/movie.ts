import { MOVIE_LIMITS } from '@vidly/shared';
import { model, Schema, type InferSchemaType } from 'mongoose';
import { CASE_INSENSITIVE } from './genre';

/** Denormalised copy of the genre, kept in sync when a genre is renamed. */
const genreSnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
  },
  { versionKey: false },
);

const movieSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    genre: { type: genreSnapshotSchema, required: true },
    numberInStock: {
      type: Number,
      required: true,
      min: 0,
      max: MOVIE_LIMITS.maxStock,
      validate: { validator: Number.isInteger, message: 'numberInStock must be an integer' },
    },
    dailyRentalRate: { type: Number, required: true, min: 0, max: MOVIE_LIMITS.maxDailyRate },
  },
  { timestamps: true, versionKey: false },
);

movieSchema.index({ title: 1 }, { unique: true, collation: CASE_INSENSITIVE });
movieSchema.index({ 'genre._id': 1 });

export type MovieDocument = InferSchemaType<typeof movieSchema>;
export const Movie = model('Movie', movieSchema);
