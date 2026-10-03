import { model, Schema, type InferSchemaType } from 'mongoose';

export const CASE_INSENSITIVE = { locale: 'en', strength: 2 } as const;

const genreSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  },
  { timestamps: true, versionKey: false },
);

genreSchema.index({ name: 1 }, { unique: true, collation: CASE_INSENSITIVE });

export type GenreDocument = InferSchemaType<typeof genreSchema>;
export const Genre = model('Genre', genreSchema);
