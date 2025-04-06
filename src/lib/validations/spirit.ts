import { z } from 'zod';
import spiritCategories from '../spiritCategories';

// Get all categories and subcategories for validation
const allCategories = spiritCategories.map(category => category.id);
const allSubcategories = spiritCategories.flatMap(category => 
  category.subcategories.map(sub => sub.toLowerCase())
);

export const SpiritSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  brand: z.string()
    .min(1, 'Brand is required')
    .max(100, 'Brand must be less than 100 characters'),
  category: z.string()
    .refine(val => allCategories.includes(val), {
      message: "Invalid category selected"
    })
    .default('whiskey'),
  type: z.string()
    .refine(val => allSubcategories.includes(val.toLowerCase()) || val === '', {
      message: "Invalid type selected"
    }),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  proof: z.coerce.number()
    .positive('Proof must be positive')
    .max(200, 'Proof must be at most 200')
    .nullable()
    .optional(),
  price: z.coerce.number()
    .nonnegative('Price must be nonnegative')
    .nullable()
    .optional(),
  rating: z.coerce.number()
    .min(1, 'Rating must be at least 1')
    .max(10, 'Rating must be at most 10')
    .nullable()
    .optional(),
  isFavorite: z.boolean()
    .default(false)
    .optional(),
  dateAcquired: z.string()
    .nullable()
    .optional(),
  bottleSize: z.string()
    .nullable()
    .optional(),
  distillery: z.string()
    .nullable()
    .optional(),
  bottleLevel: z.coerce.number()
    .min(0, 'Bottle level must be at least 0')
    .max(100, 'Bottle level must be at most 100')
    .nullable()
    .optional(),
  imageUrl: z.string()
    .refine(val => val.startsWith('/') || val.startsWith('http'), {
      message: "Image URL must start with '/' or 'http'"
    })
    .nullable()
    .optional(),
  nose: z.string()
    .max(500, 'Nose description must be less than 500 characters')
    .nullable()
    .optional(),
  palate: z.string()
    .max(500, 'Palate description must be less than 500 characters')
    .nullable()
    .optional(),
  finish: z.string()
    .max(500, 'Finish description must be less than 500 characters')
    .nullable()
    .optional(),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .nullable()
    .optional(),
});

export type SpiritFormData = z.infer<typeof SpiritSchema>; 