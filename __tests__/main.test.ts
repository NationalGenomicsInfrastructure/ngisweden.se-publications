/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as github from '../__fixtures__/github.js'
import * as fs from 'fs/promises'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { ApiResponse } from '../src/schemas.js'

// Mock the core module
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Mock fetch for the publications API
const mockFetch = jest.fn() as jest.Mock<
  () => Promise<{ ok: boolean; json: () => Promise<ApiResponse> }>
>

// Override global fetch
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true
})

// The module being tested should be imported dynamically
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  let mockApiResponse: ApiResponse

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    // Clear environment variables
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_REPOSITORY

    // Set default input values
    core.getInput.mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        'download-limit': '50',
        'num-publications': '5',
        'show-title': 'true',
        'show-footer': 'true',
        randomise: 'true',
        'max-collabs': '-1',
        'tech-dev-is-collab': 'true',
        commit: 'false',
        'html-path': 'publications.html',
        'json-path': 'publications.json'
      }
      return defaults[name] || ''
    })

    // Load mock API response from file
    const mockFilePath = path.join(__dirname, 'publications_mock.json')
    const mockFileContent = await fs.readFile(mockFilePath, 'utf-8')
    mockApiResponse = JSON.parse(mockFileContent)

    // Mock fetch response
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(mockApiResponse)
    }
    mockFetch.mockResolvedValue(mockResponse)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should fetch and process publications with default options', async () => {
    await run()

    // Verify outputs were set
    expect(core.setOutput).toHaveBeenCalledWith('html', expect.any(String))
    expect(core.setOutput).toHaveBeenCalledWith('json', expect.any(String))
    expect(core.setOutput).toHaveBeenCalledWith(
      'html-path',
      'publications.html'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'json-path',
      'publications.json'
    )
    expect(core.setOutput).toHaveBeenCalledWith('warnings', expect.any(String))
  })

  it('should respect custom input parameters', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'num-publications') return '2'
      if (name === 'randomise') return 'false'
      if (name === 'max-collabs') return '1'
      return ''
    })

    await run()

    // Verify the outputs reflect the custom parameters
    const jsonOutput = JSON.parse(
      core.setOutput.mock.calls.find((call) => call[0] === 'json')![1]
    )
    expect(jsonOutput.length).toBeLessThanOrEqual(2)
  })

  it('should commit files when commit option is enabled', async () => {
    // Set up environment for commit
    process.env.GITHUB_REPOSITORY = 'owner/repo'
    process.env.GITHUB_TOKEN = 'test-token'

    // Reset mocks before test
    jest.clearAllMocks()
    
    // Re-setup the getOctokit mock after clearing
    const mockOctokitInstance = {
      rest: {
        repos: {
          get: jest.fn().mockResolvedValue({
            data: {
              default_branch: 'main',
              name: 'repo',
              owner: { login: 'owner' }
            }
          })
        },
        git: {
          getRef: jest.fn().mockResolvedValue({
            data: { object: { sha: 'abc123' } }
          }),
          createTree: jest.fn().mockResolvedValue({
            data: { sha: 'def456' }
          }),
          createCommit: jest.fn().mockResolvedValue({
            data: { sha: 'ghi789' }
          }),
          updateRef: jest.fn().mockResolvedValue({
            data: { sha: 'jkl012' }
          })
        }
      }
    }
    github.getOctokit.mockReturnValue(mockOctokitInstance)

    // Track input calls
    const inputCalls: string[] = []

    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'download-limit': '50',
        'num-publications': '5',
        'show-title': 'true',
        'show-footer': 'true',
        randomise: 'true',
        'max-collabs': '-1',
        'tech-dev-is-collab': 'true',
        commit: 'true',
        'commit-repo': 'owner/repo',
        'commit-token': 'test-token',
        'commit-message': 'Update publications',
        'html-path': 'publications.html',
        'json-path': 'publications.json'
      }
      const value = inputs[name] || ''
      inputCalls.push(`${name}=${value}`)
      return value
    })

    await run()

    // Log calls to console for debugging
    console.log('Input calls:', inputCalls)
    
    // Verify getOctokit was called
    expect(github.getOctokit).toHaveBeenCalledWith('test-token')
    
    // Verify Octokit was used to commit files
    expect(mockOctokitInstance.rest.repos.get).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo'
    })
    expect(mockOctokitInstance.rest.git.getRef).toHaveBeenCalled()
    expect(mockOctokitInstance.rest.git.createTree).toHaveBeenCalled()
    expect(mockOctokitInstance.rest.git.createCommit).toHaveBeenCalled()
    expect(mockOctokitInstance.rest.git.updateRef).toHaveBeenCalled()
  })

  it('should fail when commit is enabled but token is missing', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'commit') return 'true'
      return ''
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'GITHUB_TOKEN is required when commit is enabled'
    )
  })

  it('should handle invalid input parameters', async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'download-limit') return 'not-a-number'
      return ''
    })

    await run()

    // Should still run but with default values
    expect(core.setOutput).toHaveBeenCalledWith('html', expect.any(String))
    expect(core.setOutput).toHaveBeenCalledWith('json', expect.any(String))
  })
})
