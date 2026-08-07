# mdx2vast

> [!NOTE]
> **Vale v3.18.0 and later parse MDX natively** and no longer use this tool.
> `mdx2vast` remains available for earlier Vale versions, but it gets no new
> features and can be uninstalled once you upgrade.

`mdx2vast` is a CLI tool that converts MDX files to HTML while preserving
JSX syntax and components. This format (HTML that retains the structure of
the original file) is used by [Vale][1] (before v3.18.0) to provide
markup-aware linting.

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### Install via `npm`:

```sh
npm install -g mdx2vast
```

## Usage

Run the CLI tool with the following command:

```sh
mdx2vast input.mdx
```

It also reads a single document from standard input:

```sh
mdx2vast < input.mdx
```

### Batch mode

Starting the process costs about 160 ms, nearly all of it importing the MDX
toolchain, against roughly 4 ms to convert an average document. A caller with
thousands of files spends most of its time on imports it has already done.

`--batch` reads documents until standard input closes and answers each one, so
that cost is paid once. On a 7,500-file corpus this is the difference between
about fifteen minutes and about thirty seconds.

```sh
mdx2vast --batch < frames
```

Documents are length-prefixed rather than delimited, because MDX may contain
any byte sequence a delimiter could use:

```
request   <byteLength> LF <bytes>
response  "ok " <byteLength> LF <bytes>
          "err " <byteLength> LF <message>
```

Lengths count bytes rather than characters, so multi-byte content frames
correctly. A document that fails to convert answers `err` and the run
continues; one unparseable file does not end the batch.

Output is identical to single-document mode — the test suite asserts this
per fixture.

[1]: https://vale.sh/
