/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock the core module
jest.unstable_mockModule('@actions/core', () => core)

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      get: jest
        .fn()
        .mockImplementation(async () => ({ data: { default_branch: 'main' } }))
    },
    git: {
      getRef: jest
        .fn()
        .mockImplementation(async () => ({
          data: { object: { sha: 'abc123' } }
        })),
      createTree: jest
        .fn()
        .mockImplementation(async () => ({ data: { sha: 'def456' } })),
      createCommit: jest
        .fn()
        .mockImplementation(async () => ({ data: { sha: 'ghi789' } })),
      updateRef: jest.fn().mockImplementation(async () => ({ data: {} }))
    }
  }
}

const mockOctokitConstructor = jest.fn().mockImplementation(() => mockOctokit)

jest.mock('@octokit/rest', () => ({
  Octokit: mockOctokitConstructor
}))

// Mock fetch for the publications API
const mockFetch = jest.fn() as jest.Mock<
  () => Promise<{ ok: boolean; json: () => Promise<any> }>
>

// Override global fetch
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true
})

// The module being tested should be imported dynamically
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
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

    // Mock successful API response
    const mockApiResponse = {
      entity: 'publication',
      iuid: 'vasa-1524-09-01',
      timestamp: new Date().toISOString(),
      links: {
        self: { href: 'https://example.com/self' },
        display: { href: 'https://example.com/display' }
      },
      value: 'test',
      started: new Date().toISOString(),
      ended: new Date().toISOString(),
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      accounts: [],
      publications_count: 1,
      publications: [
        {
          entity: 'publication',
          iuid: 'vasa-1524-09-01',
          doi: '211.18M/vasa-1524-09-01',
          title:
            'Musings on defeating King Christian II and forming a new dynasty',
          published: '1524-09-01',
          authors: [
            {
              given: 'Gustav',
              family: 'Vasa',
              initials: 'GV',
              orcid: null
            }
          ],
          journal: {
            name: 'Malmö recess',
            volume: '1',
            issue: '1',
            pages: '1521–23'
          },
          labels: {
            'NGI Stockholm (Genomics Applications)': 'Collaborative'
          },
          links: {
            self: { href: 'https://example.com/self' },
            display: { href: 'https://example.com/display' }
          },
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      ]
    }

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

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    await run()

    expect(core.setOutput).toHaveBeenCalledWith(
      'html',
      expect.stringContaining('Error: Publications could not be retrieved')
    )
    expect(core.setOutput).toHaveBeenCalledWith('json', '[]')
    expect(core.warning).toHaveBeenCalled()
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
    
    // Track input calls
    const inputCalls: string[] = []
    
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
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

    // Log what happened
    console.log('Input calls:', inputCalls)
    console.log('Octokit constructor calls:', mockOctokitConstructor.mock.calls)

    // Verify Octokit was used to commit files
    expect(mockOctokitConstructor).toHaveBeenCalledWith({ auth: 'test-token' })
    expect(mockOctokit.rest.git.createTree).toHaveBeenCalled()
    expect(mockOctokit.rest.git.createCommit).toHaveBeenCalled()
    expect(mockOctokit.rest.git.updateRef).toHaveBeenCalled()
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
