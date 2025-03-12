// TODO: Should we use `micromark-extension-mdx` instead? It's "non-JS aware,"
// which is what we want, but it doesn't seem to recognize non-expression
// syntax (such as import statements).
import { mdxjs } from "micromark-extension-mdxjs";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mathFromMarkdown } from "mdast-util-math";
import { math } from "micromark-extension-math";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { toHast } from "mdast-util-to-hast";
import { h } from "hastscript";
import { toHtml } from "hast-util-to-html";

const mdxNodes = [
  "mdxjsEsm",
  "mdxFlowExpression",
  "mdxJsxFlowElement",
  "mdxJsxTextElement",
  "mdxTextExpression",
];

function isComment(source) {
  return source.startsWith("{/*") && source.endsWith("*/}");
}

function createCustomHandler(doc) {
  return function customHandler(state, node, parent) {
    const start = node.position.start.offset;
    const end = node.position.end.offset;

    const source = doc.slice(start, end);
    if (node.type === "mdxFlowExpression" && isComment(source)) {
      return { type: "comment", value: source.slice(3, -3) };
    } else if (mdxNodes.includes(node.type)) {
      const className = `mdxNode ${node.type}`;
      if (source.includes("\n")) {
        return h("pre", h("code", { className }, source));
      } else {
        return h("code", { className }, source);
      }
    }

    return null;
  };
}

function toValeAST(doc) {
  const mdast = fromMarkdown(doc, {
    extensions: [mdxjs(), math()],
    mdastExtensions: [mdxFromMarkdown(), mathFromMarkdown()],
  });

  const customHandler = createCustomHandler(doc);

  const hast = toHast(mdast, {
    allowDangerousHtml: true,
    passThrough: mdxNodes,
    handlers: {
      mdxjsEsm: customHandler,
      mdxFlowExpression: customHandler,
      mdxJsxFlowElement: customHandler,
      mdxJsxTextElement: customHandler,
      mdxTextExpression: customHandler,
    },
  });

  return toHtml(hast);
}

export { toValeAST };
