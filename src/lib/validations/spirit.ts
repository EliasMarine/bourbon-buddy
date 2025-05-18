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
  releaseYear: z.coerce.number()
    .positive('Release year must be a positive number')
    .min(1800, 'Release year seems too old')
    .max(new Date().getFullYear() + 5, 'Release year seems too far in the future')
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
    .max(100, 'Rating must be at most 100')
    .transform(val => {
      // If value is between 1-10, it's likely a decimal rating (e.g. 7.8)
      // Convert it to integer scale (10-100) by multiplying by 10
      if (val <= 10) {
        return Math.round(val * 10);
      }
      // If it's already an integer in the 10-100 range, keep it as is
      return Math.round(val);
    })
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
  webImageUrl: z.string()
    .refine(val => val.startsWith('http'), {
      message: "Web image URL must start with 'http'"
    })
    .nullable()
    .optional(),
  nose: z.union([
    z.string().max(500, 'Nose description must be less than 500 characters'),
    z.array(z.string())
  ])
    .nullable()
    .optional(),
  palate: z.union([
    z.string().max(500, 'Palate description must be less than 500 characters'),
    z.array(z.string())
  ])
    .nullable()
    .optional(),
  finish: z.union([
    z.string().max(500, 'Finish description must be less than 500 characters'),
    z.array(z.string())
  ])
    .nullable()
    .optional(),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .nullable()
    .optional(),
});

export type SpiritFormData = z.infer<typeof SpiritSchema>; 