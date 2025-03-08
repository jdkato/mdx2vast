# mdx-to-vast

`mdx-to-vast` is a CLI tool that converts MDX files to HTML while preserving
JSX syntax and components. This format (HTML that retains the structure of
the original file) is used by [Vale][1] to provide markup-aware linting.

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### Install via `npm`:

```sh
npm install -g mdx-to-vast
```

## Usage

Run the CLI tool with the following command:

```sh
mdx-to-vast input.mdx
```

[1]: https://vale.sh/
