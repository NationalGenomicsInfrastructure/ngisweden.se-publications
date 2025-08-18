import type * as github from '@actions/github'
import { jest } from '@jest/globals'

// Create mock functions for each Octokit method we need to test
const mockGet = jest.fn(async () =>
  Promise.resolve({
    data: {
      default_branch: 'main',
      name: 'repo',
      owner: { login: 'owner' }
    }
  })
)
const mockGetRef = jest.fn(async () =>
  Promise.resolve({
    data: { object: { sha: 'abc123' } }
  })
)
const mockCreateTree = jest.fn(async () =>
  Promise.resolve({
    data: { sha: 'def456' }
  })
)
const mockCreateCommit = jest.fn(async () =>
  Promise.resolve({
    data: { sha: 'ghi789' }
  })
)
const mockUpdateRef = jest.fn(async () =>
  Promise.resolve({
    data: { sha: 'jkl012' }
  })
)

export const getOctokit = jest.fn<typeof github.getOctokit>().mockReturnValue({
  rest: {
    repos: {
      get: mockGet
    },
    git: {
      getRef: mockGetRef,
      createTree: mockCreateTree,
      createCommit: mockCreateCommit,
      updateRef: mockUpdateRef
    }
  }
} as ReturnType<typeof github.getOctokit>)
export const context = {
  repo: {
    owner: 'test-owner',
    repo: 'test-repo'
  },
  sha: 'test-sha',
  ref: 'refs/heads/main'
}
