import { Publication, PublicationOptions, Author } from './types.js'
import { ApiResponseSchema } from './schemas.js'

const FACILITY_LABELS = [
  'NGI Stockholm (Genomics Applications)',
  'NGI Stockholm (Genomics Production)',
  'NGI Uppsala (SNP&SEQ Technology Platform)',
  'NGI Uppsala (Uppsala Genome Center)',
  'National Genomics Infrastructure',
  'NGI Short read',
  'NGI Long read',
  'NGI Other',
  'NGI Proteomics',
  'NGI Single cell',
  'NGI SNP genotyping',
  'NGI Spatial omics'
]

async function fetchPublicationsFromAPI(
  facility: string,
  downloadLimit: number
): Promise<Publication[]> {
  const url = `https://publications.scilifelab.se/label/${encodeURIComponent(facility)}.json?limit=${downloadLimit}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `HTTP error from SciLifeLab Publications API: status: ${response.status}`
      )
    }
    const rawData = await response.json()
    // For debugging, you can limit the number of publications downloaded by using jq:
    // jq '.publications = (.publications | .[0:10])' publications_all.json > publications_subset.json
    const result = ApiResponseSchema.safeParse(rawData)

    if (!result.success) {
      console.error(`Validation error for ${facility}:`, result.error)
      return []
    }

    return result.data.publications
  } catch (error) {
    console.error(`Error fetching publications for ${facility}:`, error)
    return []
  }
}

function processPublications(
  publications: Publication[],
  options: PublicationOptions
): Publication[] {
  const processedPubs = publications.map((pub) => {
    // Check for collaborations
    const isCollab = FACILITY_LABELS.some(
      (fac) => pub.labels[fac] === 'Collaborative'
    )

    // Check for technology development
    const isTechDev = FACILITY_LABELS.some(
      (fac) => pub.labels[fac] === 'Technology development'
    )

    return {
      ...pub,
      is_collab: isCollab,
      is_tech_dev: isTechDev && (options.tech_dev_is_collab ? true : isCollab)
    }
  })

  // Remove duplicates
  const uniquePubs = processedPubs.filter(
    (pub, index, self) =>
      index === self.findIndex((p) => p.iuid === pub.iuid || p.doi === pub.doi)
  )

  // Sort by publication date
  return uniquePubs.sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
  )
}

function formatPublicationHTML(publication: Publication): string {
  const authors = publication.authors
    .map((author: Author) => {
      const given =
        author.given === author.given.toUpperCase()
          ? author.given
              .toLowerCase()
              .replace(/\b\w/g, (l: string) => l.toUpperCase())
          : author.given
      const family =
        author.family === author.family.toUpperCase()
          ? author.family
              .toLowerCase()
              .replace(/\b\w/g, (l: string) => l.toUpperCase())
          : author.family
      return `<span class="pub-author" title="${given} ${family}">${author.initials} ${family}</span>`
    })
    .join(', ')

  const collabBadge = publication.is_collab
    ? '<span class="float-right badge badge-primary" title="A publication where a facility member is in the authors list" data-toggle="tooltip">NGI Collaboration</span>'
    : ''

  const techDevBadge = publication.is_tech_dev
    ? '<span class="float-right badge badge-success" title="A publication with facility internal technology development" data-toggle="tooltip">NGI Technology development</span>'
    : ''

  return `
        <div class="modal ngisweden-publications-modal fade" id="pub_${publication.iuid}" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${publication.title}</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-sub-header">
                        <div class="font-weight-light pub-authors">${authors}</div>
                        <p class="mt-2 mb-0">${collabBadge}${techDevBadge}</p>
                    </div>
                    ${
                      publication.abstract
                        ? `<div class="modal-body small">${publication.abstract}</div>`
                        : '<div class="modal-body d-none"></div>'
                    }
                    <div class="modal-footer ${!publication.abstract ? 'border-0' : ''}">
                        <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Close</button>
                        <a href="https://www.ncbi.nlm.nih.gov/pubmed/${publication.pmid}" target="_blank" class="btn btn-sm btn-info">
                            Pubmed <i class="fas fa-external-link-alt fa-sm ml-2"></i>
                        </a>
                        <a href="https://dx.doi.org/${publication.doi}" target="_blank" class="btn btn-sm btn-primary">
                            DOI <i class="fas fa-external-link-alt fa-sm ml-2"></i>
                        </a>
                        <a href="${publication.links.display.href}" target="_blank" class="btn btn-sm btn-success">
                            SciLifeLab Pubs <i class="fas fa-external-link-alt fa-sm ml-2"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `
}

export interface PublicationOutput {
  html: string
  json: string
  warnings: string[]
}

export async function getPublications(
  options: PublicationOptions & { downloadLimit?: number } = {}
): Promise<PublicationOutput> {
  const warnings: string[] = []
  const defaultOptions: PublicationOptions & { downloadLimit: number } = {
    title: true,
    footer: true,
    randomise: true,
    num: 5,
    collabs: 0,
    max_collabs: -1,
    tech_dev_is_collab: true,
    downloadLimit: 50,
    ...options
  }

  try {
    // Fetch all publications
    const allPublications: Publication[] = []

    for (const facility of FACILITY_LABELS) {
      const facilityPubs = await fetchPublicationsFromAPI(
        facility,
        defaultOptions.downloadLimit
      )
      allPublications.push(...facilityPubs)
    }

    if (allPublications.length === 0) {
      warnings.push('No publications found when fetching')
      return {
        html: '<p class="text-muted"><em>Error: Publications could not be retrieved</em></p>',
        json: '[]',
        warnings
      }
    }

    // Process publications
    let publications = processPublications(allPublications, defaultOptions)

    // Apply collaboration filters
    let numCollabs = 0
    publications = publications.filter((pub) => {
      const maxCollabs = defaultOptions.max_collabs ?? -1
      if (maxCollabs >= 0 && numCollabs >= maxCollabs && pub.is_collab) {
        return false
      }
      if (pub.is_collab) {
        numCollabs++
      }
      return true
    })

    // Randomize the full set of publications
    if (defaultOptions.randomise) {
      publications = publications.sort(() => Math.random() - 0.5)
    }

    // Apply the num limit after randomization, to get n random or newest (if randomize is false) publications
    publications = publications.slice(0, defaultOptions.num)

    // Generate HTML
    const modals = publications.map(formatPublicationHTML).join('\n')
    const listItems = publications
      .map(
        (pub) => `
            <a data-toggle="modal" data-target="#pub_${pub.iuid}" href="${pub.links.display.href}" 
                target="_blank" class="list-group-item list-group-item-action${pub.is_collab ? ' list-pub-collab' : ''}${pub.is_tech_dev ? ' list-pub-techdev' : ''}">
                ${pub.title}<br>
                <small class="text-muted"><em>${pub.journal.title}</em> (${pub.published.split('-')[0]})</small>
                ${pub.is_collab || pub.is_tech_dev ? '<span class="float-right" style="display:inline-block">' : ''}
                ${pub.is_collab ? '<span class="badge badge-primary mt-3">NGI Collaboration</span>' : ''}
                ${pub.is_tech_dev ? '<span class="badge badge-success mt-3 mx-1">NGI Technology development</span>' : ''}
                ${pub.is_collab || pub.is_tech_dev ? '</span>' : ''}
            </a>
        `
      )
      .join('\n')

    let html = '<div class="ngisweden-publications mb-5">'
    if (defaultOptions.title) {
      html += '<h5>User Publications</h5>'
    }
    html += `<div class="list-group">${listItems}</div>`
    if (defaultOptions.footer) {
      html += `
                <p class="small text-muted mt-2">
                    See all publications at
                    <a href="https://publications.scilifelab.se/label/National%20Genomics%20Infrastructure" 
                        target="_blank" class="text-muted">
                        publications.scilifelab.se
                    </a>
                </p>
            `
    }
    html += '</div>'
    html += modals

    return {
      html,
      json: JSON.stringify(publications, null, 2),
      warnings
    }
  } catch (error) {
    warnings.push(
      `Error processing publications: ${error instanceof Error ? error.message : String(error)}`
    )
    return {
      html: '<p class="text-muted"><em>Error: Publications could not be retrieved</em></p>',
      json: '[]',
      warnings
    }
  }
}
