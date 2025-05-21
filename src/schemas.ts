import { z } from 'zod'

// Base schemas for nested objects

export const LinksSchema = z.object({
  self: z.object({
    href: z.string().url()
  }),
  display: z.object({
    href: z.string().url()
  })
})

export const AuthorSchema = z.object({
  given: z.string(),
  family: z.string(),
  initials: z.string(),
  orcid: z.string().optional(),
  researcher: z
    .object({
      href: z.string().url()
    })
    .optional()
})

export const AccountSchema = z.object({
  entity: z.string(),
  iuid: z.string(),
  timestamp: z.string().datetime().or(z.string()),
  links: LinksSchema,
  email: z.string().email(),
  name: z.string(),
  orcid: z.string(),
  role: z.string(),
  status: z.string(),
  login: z.string().datetime().or(z.string()),
  created: z.string().datetime().or(z.string()),
  modified: z.string().datetime().or(z.string())
})

export const JournalSchema = z.object({
  title: z.string(),
  volume: z.string().nullable().optional(),
  issue: z.string().nullable().optional(),
  issn: z.string().nullable().optional(),
  'issn-l': z.string().nullable().optional(),
  pages: z.string().nullable().optional()
})

export const XrefSchema = z.object({
  db: z.string(),
  key: z.string()
})

// Define a more flexible label type that falls back to string if not in enum
export const LabelTypeSchema = z
  .enum(['Service', 'Collaborative', 'Technology development'])
  .or(z.string())
  .transform((val) => {
    // Normalize common variations
    if (typeof val === 'string') {
      const normalized = val.toLowerCase().trim()
      if (normalized.includes('service')) return 'Service'
      if (normalized.includes('collab')) return 'Collaborative'
      if (normalized.includes('tech')) return 'Technology development'
    }
    return val
  })

// Main publication schema
export const PublicationSchema = z.object({
  entity: z.string(),
  iuid: z.string(),
  timestamp: z.string().datetime().or(z.string()),
  doi: z.string(),
  pmid: z.string().nullable().optional(),
  title: z.string(),
  abstract: z.string().nullable().optional(),
  published: z
    .string()
    .datetime()
    .or(z.string())
    .transform((val) => {
      // Try to normalize dates
      try {
        if (typeof val === 'string') {
          // Handle YYYY-MM format
          if (/^\d{4}-\d{2}$/.test(val)) {
            return val + '-01' // Add day
          }
          // Handle YYYY format
          if (/^\d{4}$/.test(val)) {
            return val + '-01-01' // Add month and day
          }
          return val
        }
        return val
      } catch {
        return val
      }
    }),
  type: z.string(),
  authors: z.array(AuthorSchema),
  journal: JournalSchema,
  labels: z.record(z.string(), LabelTypeSchema),
  links: LinksSchema,
  xrefs: z.array(XrefSchema).optional(),
  notes: z.array(z.string()).optional(),
  created: z.string().datetime().or(z.string()),
  modified: z.string().datetime().or(z.string()),
  is_collab: z.boolean().optional(),
  is_tech_dev: z.boolean().optional()
})

// API response schema
export const ApiResponseSchema = z.object({
  entity: z.string(),
  iuid: z.string(),
  timestamp: z.string().datetime().or(z.string()),
  links: LinksSchema,
  value: z.string(),
  started: z.string(),
  ended: z.string(),
  created: z.string().datetime().or(z.string()),
  modified: z.string().datetime().or(z.string()),
  accounts: z.array(AccountSchema),
  publications_count: z.number(),
  publications: z.array(PublicationSchema)
})

// Type inference
export type Author = z.infer<typeof AuthorSchema>
export type Journal = z.infer<typeof JournalSchema>
export type Publication = z.infer<typeof PublicationSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
export type Xref = z.infer<typeof XrefSchema>
export type LabelType = z.infer<typeof LabelTypeSchema>
