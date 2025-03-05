import { Command } from 'commander';
import fs from 'fs';
import { mdxjs } from 'micromark-extension-mdxjs'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { mdxFromMarkdown } from 'mdast-util-mdx'
import { toHast } from 'mdast-util-to-hast'
import { h } from 'hastscript'
import { toHtml } from 'hast-util-to-html'

const mdxNodes = [
    'mdxjsEsm',
    'mdxFlowExpression',
    'mdxJsxFlowElement',
    'mdxJsxTextElement',
    'mdxTextExpression'
]

const program = new Command();

program
    .version('1.0.0')
    .description('CLI to convert MDX to HTML while preserving JSX and expressions.')
    .argument('<file>', 'path to the MDX file to read')
    .action((file) => {
        if (fs.existsSync(file) && fs.statSync(file).isFile()) {
            fs.readFile(file, 'utf8', (err, doc) => {
                if (err) {
                    console.error("Error reading the file:", err.message);
                    process.exit(1);
                }
                const docString = doc.toString()

                function customHandler(state, node, parent) {
                    if (mdxNodes.includes(node.type)) {
                        const start = node.position.start.offset
                        const end = node.position.end.offset
                        const source = docString.slice(start, end)

                        if (source.includes('\n')) {
                            return h('pre', { className: 'mdx-node' }, source)
                        } else {
                            return h('code', { className: 'mdx-node' }, source)
                        }
                    }
                    return null
                }

                const mdast = fromMarkdown(doc, {
                    extensions: [mdxjs()],
                    mdastExtensions: [mdxFromMarkdown()]
                })

                const hast = toHast(mdast, {
                    allowDangerousHtml: true,
                    passThrough: mdxNodes,
                    handlers: {
                        mdxjsEsm: customHandler,
                        mdxFlowExpression: customHandler,
                        mdxJsxFlowElement: customHandler,
                        mdxJsxTextElement: customHandler,
                        mdxTextExpression: customHandler
                    }
                })

                const html = toHtml(hast)
                console.log(html)
            });
        } else {
            console.error('File does not exist or the path is incorrect.');
            process.exit(1);
        }
    });

program.parse(process.argv);
