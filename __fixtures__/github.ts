import type * as github from '@actions/github'
import { jest } from '@jest/globals'

export const getOctokit = jest.fn<typeof github.getOctokit>()
export const context = {
  repo: {
    owner: 'test-owner',
    repo: 'test-repo'
  },
  sha: 'test-sha',
  ref: 'refs/heads/main'
}
