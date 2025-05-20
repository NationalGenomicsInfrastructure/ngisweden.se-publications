export interface Author {
  given: string;
  family: string;
  initials: string;
}

export interface Journal {
  title: string;
  volume?: string;
  issue?: string;
  issn?: string;
}

export interface Publication {
  iuid: string;
  doi: string;
  pmid: string;
  title: string;
  abstract?: string;
  published: string;
  authors: Author[];
  journal: Journal;
  labels: Record<string, string>;
  links: {
    display: {
      href: string;
    };
  };
  is_collab?: boolean;
  is_tech_dev?: boolean;
}

export interface PublicationOptions {
  title?: boolean;
  footer?: boolean;
  randomise?: boolean;
  num?: number;
  collabs?: number;
  max_collabs?: number;
  tech_dev_is_collab?: boolean;
}

export interface PublicationOutput {
  html: string;
  warnings: string[];
} 