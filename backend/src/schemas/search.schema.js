import { z } from "zod";

export const searchSalonsSchema = {
  query: z.object({
    longitude: z.string().optional(),
    latitude: z.string().optional(),
    maxDistanceMeters: z.string().optional(),
    city: z.string().optional(),
    category: z.string().optional(),
    rating: z.string().optional(),
    query: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
};
