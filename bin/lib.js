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

function createCustomHandler(doc) {
    return function customHandler(state, node, parent) {
        if (mdxNodes.includes(node.type)) {
            const source = doc.slice(
                node.position.start.offset,
                node.position.end.offset)

            if (source.includes('\n')) {
                return h('pre', { className: 'mdx-node' }, source)
            } else {
                return h('code', { className: 'mdx-node' }, source)
            }
        }
        return null
    }
}

function toValeAST(doc) {
    const mdast = fromMarkdown(doc, {
        extensions: [mdxjs()],
        mdastExtensions: [mdxFromMarkdown()]
    })

    const customHandler = createCustomHandler(doc)

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

    return toHtml(hast)
}

export { toValeAST }
