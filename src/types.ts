import { Author, Journal, Publication } from './schemas.js'

export type { Author, Journal, Publication }

export interface PublicationOptions {
  title?: boolean
  footer?: boolean
  randomise?: boolean
  num?: number
  collabs?: number
  max_collabs?: number
  tech_dev_is_collab?: boolean
}

export interface PublicationOutput {
  html: string
  json: string
  warnings: string[]
}
