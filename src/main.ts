import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
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
    const numPublications = parseInt(
      core.getInput('num-publications') || '5',
      10
    )
    const showTitle = core.getInput('show-title') !== 'false'
    const showFooter = core.getInput('show-footer') !== 'false'
    const randomise = core.getInput('randomise') !== 'false'
    const maxCollabs = parseInt(core.getInput('max-collabs') || '-1', 10)
    const techDevIsCollab = core.getInput('tech-dev-is-collab') !== 'false'
    const shouldCommit = core.getInput('commit') === 'true'
    const commitMessage = core.getInput('commit-message')
    const htmlPath = core.getInput('html-path')
    const jsonPath = core.getInput('json-path')

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

    // Commit files if requested
    if (shouldCommit) {
      const token = process.env.GITHUB_TOKEN
      if (!token) {
        throw new Error('GITHUB_TOKEN is required when commit is enabled')
      }

      const octokit = new Octokit({ auth: token })
      const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')
      if (!owner || !repo) {
        throw new Error('GITHUB_REPOSITORY is not set')
      }

      // Get the default branch
      const { data: repoData } = await octokit.rest.repos.get({
        owner,
        repo
      })
      const branch = repoData.default_branch

      // Get the current commit SHA
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
      })
      const commitSha = refData.object.sha

      // Create a tree with the new files
      const { data: treeData } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: commitSha,
        tree: [
          {
            path: htmlPath,
            mode: '100644',
            type: 'blob',
            content: result.html
          },
          {
            path: jsonPath,
            mode: '100644',
            type: 'blob',
            content: result.json
          }
        ]
      })

      // Create a new commit
      const { data: commitData } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: treeData.sha,
        parents: [commitSha]
      })

      // Update the branch reference
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commitData.sha
      })

      core.info(`Successfully committed files to ${branch}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
