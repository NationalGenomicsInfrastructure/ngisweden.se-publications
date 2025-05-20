import { z } from 'zod'

// Base schemas for nested objects
export const AuthorSchema = z.object({
  given: z.string(),
  family: z.string(),
  initials: z.string()
})

export const JournalSchema = z.object({
  title: z.string(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  issn: z.string().optional()
})

export const LinksSchema = z.object({
  display: z.object({
    href: z.string().url()
  })
})

// Main publication schema
export const PublicationSchema = z.object({
  iuid: z.string(),
  doi: z.string(),
  pmid: z.string(),
  title: z.string(),
  abstract: z.string().optional(),
  published: z.string().datetime(),
  authors: z.array(AuthorSchema),
  journal: JournalSchema,
  labels: z.record(z.string()),
  links: LinksSchema,
  is_collab: z.boolean().optional(),
  is_tech_dev: z.boolean().optional()
})

// API response schema
export const ApiResponseSchema = z.object({
  publications: z.array(PublicationSchema)
})

// Type inference
export type Author = z.infer<typeof AuthorSchema>
export type Journal = z.infer<typeof JournalSchema>
export type Publication = z.infer<typeof PublicationSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
