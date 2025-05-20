import * as core from '@actions/core'
import { getPublications } from './publications.js'

/**
 * The main function for the action.
 * This action fetches publications from publications.scilifelab.se and generates HTML output.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const downloadLimit = parseInt(core.getInput('download-limit') || '50', 10)
    const numPublications = parseInt(core.getInput('num-publications') || '5', 10)
    const showTitle = core.getInput('show-title') !== 'false'
    const showFooter = core.getInput('show-footer') !== 'false'
    const randomise = core.getInput('randomise') !== 'false'
    const maxCollabs = parseInt(core.getInput('max-collabs') || '-1', 10)
    const techDevIsCollab = core.getInput('tech-dev-is-collab') !== 'false'

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Fetching up to ${downloadLimit} publications per facility...`)

    // Get publications
    const result = await getPublications({
      downloadLimit,
      num: numPublications,
      title: showTitle,
      footer: showFooter,
      randomise,
      max_collabs: maxCollabs,
      tech_dev_is_collab: techDevIsCollab
    })

    // Set outputs for other workflow steps to use
    core.setOutput('html', result.html)
    core.setOutput('json', result.json)
    core.setOutput('warnings', result.warnings.join('\n'))

    // Log any warnings
    if (result.warnings.length > 0) {
      core.warning(`Warnings occurred:\n${result.warnings.join('\n')}`)
    }

  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
