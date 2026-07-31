import test from 'ava';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mdxFolder = path.join(__dirname, './mdx');

test('Convert MDX to HTML', async t => {
    const cases = fs.readdirSync(mdxFolder);

    for (const caseFolder of cases) {
        const casePath = path.join(mdxFolder, caseFolder);
        if (fs.statSync(casePath).isDirectory()) {
            const mdxFilePath = path.join(casePath, 'test.mdx');
            const htmlFilePath = path.join(casePath, 'test.html');

            const expectedHtmlContent = fs.readFileSync(htmlFilePath, 'utf8').replace(/\s+/g, '');;
            const { stdout: actualHtmlContent } = await execa('./bin/cli.js', [mdxFilePath]);

            t.is(actualHtmlContent.replace(/\s+/g, ''), expectedHtmlContent, `Failed for case: ${caseFolder}`);
        }
    }
});

// Batch mode has to answer exactly what single-document mode would, or callers
// get different results depending on how they invoked the same tool.
test('Batch mode matches single-document output', async t => {
    const cases = fs.readdirSync(mdxFolder)
        .map(c => path.join(mdxFolder, c))
        .filter(p => fs.statSync(p).isDirectory())
        .map(p => path.join(p, 'test.mdx'))
        .filter(p => fs.existsSync(p));

    t.true(cases.length > 0, 'expected fixtures to exist');

    const docs = cases.map(p => fs.readFileSync(p, 'utf8'));

    // One process, every document, framed.
    const frames = docs
        .map(d => `${Buffer.byteLength(d, 'utf8')}\n${d}`)
        .join('');
    const cli = path.join(__dirname, '../bin/cli.js');
    const { stdout } = await execa('node', [cli, '--batch'], {
        input: frames,
        encoding: 'buffer',
    });

    // Parse the replies back out.
    let buf = Buffer.from(stdout);
    const got = [];
    while (buf.length > 0) {
        const nl = buf.indexOf(10);
        const [status, len] = buf.subarray(0, nl).toString('utf8').split(' ');
        const n = Number(len);
        const body = buf.subarray(nl + 1, nl + 1 + n).toString('utf8');
        t.is(status, 'ok');
        got.push(body);
        buf = buf.subarray(nl + 1 + n);
    }

    t.is(got.length, docs.length);

    for (let i = 0; i < docs.length; i++) {
        const single = await execa('node', [cli, cases[i]]);
        t.is(got[i].replace(/\s+/g, ''), single.stdout.replace(/\s+/g, ''),
            `batch differs from single for ${cases[i]}`);
    }
});

// A document that cannot be converted must not take the rest of the batch down.
test('Batch mode reports one failure and continues', async t => {
    const good = '# Heading\n\nSome prose.\n';
    const bad = '<Foo\n';  // unterminated JSX
    const docs = [bad, good];

    const frames = docs
        .map(d => `${Buffer.byteLength(d, 'utf8')}\n${d}`)
        .join('');
    const cli = path.join(__dirname, '../bin/cli.js');
    const { stdout } = await execa('node', [cli, '--batch'], {
        input: frames,
        encoding: 'buffer',
    });

    let buf = Buffer.from(stdout);
    const statuses = [];
    while (buf.length > 0) {
        const nl = buf.indexOf(10);
        const [status, len] = buf.subarray(0, nl).toString('utf8').split(' ');
        statuses.push(status);
        buf = buf.subarray(nl + 1 + Number(len));
    }

    t.deepEqual(statuses, ['err', 'ok']);
});
