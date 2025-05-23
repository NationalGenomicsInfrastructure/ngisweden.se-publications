![ngi-publications](https://raw.githubusercontent.com/NationalGenomicsInfrastructure/ngi-firn/refs/heads/main/docs/images/repoheader.svg)

# GitHub Action for fetching NGI publications

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)

## Usage

To include the action in a workflow in another repository, you can use the
`uses` syntax with the `@` symbol to reference a specific branch, tag, or commit
hash.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 'lts/*'
      cache: 'pnpm'
  - name: Install dependencies
    run: pnpm install
  - uses: @NationalGenomicsInfrastructure/ngisweden.se-publications
      with:
        # Maximum number of publications to fetch per facility
        download-limit: '10'
        # Number of publications to display
        num-publications: '25'
        # Whether to show the "User Publications" title
        show-title: 'true'
        # Whether to show the footer with link to publications.scilifelab.se
        show-footer: 'true'
        # Whether to randomize the order of publications
        randomise: 'true'
        # Maximum number of collaborative publications to show (-1 for no limit)
        max-collabs: '-1'
        # Whether to treat technology development publications as collaborations
        tech-dev-is-collab: 'true'
        # Whether to commit the generated files to a repository
        commit: 'false'
        # Commit message to use when committing files
        commit-message: 'Update publications'
        # Repository to commit the files to (defaults to current repository)
        commit-repo: '${{ github.repository }}'
        # Token to use when committing files (defaults to GITHUB_TOKEN)
        commit-token: '${{ secrets.GITHUB_TOKEN }}'
        # Path where to save the HTML file in the repository
        html-path: 'publications.html'
        # Path where to save the JSON file in the repository
        json-path: 'publications.json'
```

## Development

### Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy (20.x or later should work!). If you are
> using a version manager like [`nodenv`](https://github.com/nodenv/nodenv) or
> [`fnm`](https://github.com/Schniz/fnm), this template has a `.node-version`
> file at the root of the repository that can be used to automatically switch to
> the correct version when you `cd` into the repository. Additionally, this
> `.node-version` file is used by GitHub Actions in any `actions/setup-node`
> actions.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   pnpm install
   ```

1. :building_construction: Package the TypeScript for distribution

   ```bash
   pnpm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   $ pnpm test

   PASS  ./index.test.js
     ✓ throws invalid number (3ms)
     ✓ wait 500 ms (504ms)
     ✓ test runs (95ms)

   ...
   ```

### Update the Action Metadata

The [`action.yml`](action.yml) file defines metadata about your action, such as
input(s) and output(s). For details about this file, see
[Metadata syntax for GitHub Actions](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions).

When you copy this repository, update `action.yml` with the name, description,
inputs, and outputs for your action.

### Update the Action Code

The [`src/`](./src/) directory is the heart of your action! This contains the
source code that will be run when your action is invoked. You can replace the
contents of this directory with your own code.

There are a few things to keep in mind when writing your action code:

- Most GitHub Actions toolkit and CI/CD operations are processed asynchronously.
  In `main.ts`, you will see that the action is run in an `async` function.

  ```javascript
  import * as core from '@actions/core'
  //...

  async function run() {
    try {
      //...
    } catch (error) {
      core.setFailed(error.message)
    }
  }
  ```

  For more information about the GitHub Actions toolkit, see the
  [documentation](https://github.com/actions/toolkit/blob/master/README.md).

1. Create a new branch

   ```bash
   git checkout -b releases/v1
   ```

1. Replace the contents of `src/` with your action code
1. Add tests to `__tests__/` for your source code
1. Format, test, and build the action

   ```bash
   pnpm run all
   ```

   > This step is important! It will run [`rollup`](https://rollupjs.org/) to
   > build the final JavaScript action code with all dependencies included. If
   > you do not run this step, your action will not work correctly when it is
   > used in a workflow.

1. Commit your changes

   ```bash
   git add .
   git commit -m "My first action is ready!"
   ```

1. Push them to your repository

   ```bash
   git push -u origin releases/v1
   ```

1. Create a pull request and get feedback on your action
1. Merge the pull request into the `main` branch

Your action is now published! :rocket:

### Validate the Action

You can now validate the action by referencing it in a workflow file. For
example, [`ci.yml`](./.github/workflows/ci.yml) demonstrates how to reference an
action in the same repository.

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
  with:
    version: 10
    run_install: false

- uses: actions/cache@v4
  with:
    path: |
      ~/.pnpm-store
      node_modules
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-

- name: Install dependencies
  run: pnpm install --frozen-lockfile
- name: Test Local Action
  id: test-action
  uses: ./
  with:
    download-limit: '10'
    num-publications: '2'
    commit: 'false'

- name: Write outputs to files
  run: |
    node -e "
      const fs = require('fs');
      fs.writeFileSync('publications.html', process.env.HTML_OUTPUT);
      fs.writeFileSync('publications.json', process.env.JSON_OUTPUT);
    "
  env:
    HTML_OUTPUT: ${{ steps.test-action.outputs.html }}
    JSON_OUTPUT: ${{ steps.test-action.outputs.json }}

- name: Upload outputs for inspection
  uses: actions/upload-artifact@4cec3d8aa04e39d1a68397de0c4cd6fb9dce8ec1 # v4
  with:
    name: publications
    path: publications*
```

For example workflow runs, check out the
[Actions tab](https://github.com/NationalGenomicsInfrastructure/ngisweden.se-publications/actions)!
:rocket:
