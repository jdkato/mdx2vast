/**
 * Batch mode: many documents over one process.
 *
 * Starting this CLI costs about 160ms, almost all of it importing the MDX
 * toolchain, against roughly 20ms to convert an average document. A caller
 * with a few thousand files therefore spends most of its time on imports it
 * has already done. Batch mode reads documents until stdin closes and answers
 * each one, so that cost is paid once.
 *
 * Framing is length-prefixed rather than delimited because a document may
 * contain any byte sequence a delimiter could use, and MDX in particular is
 * full of braces, backticks and newlines.
 *
 *   request   <byteLength> LF <bytes>
 *   response  "ok " <byteLength> LF <bytes>
 *             "err " <byteLength> LF <message>
 *
 * Lengths count bytes, not characters, so multi-byte content frames correctly.
 * A document that fails to convert answers with `err` and the loop continues;
 * one bad file in a batch must not take the rest of the run with it.
 */

const LF = 10;

function writeFrame(out, status, body) {
  const payload = Buffer.from(body, 'utf8');
  out.write(`${status} ${payload.length}\n`);
  out.write(payload);
}

/**
 * @param {NodeJS.ReadableStream} input
 * @param {NodeJS.WritableStream} output
 * @param {(doc: string) => string} convert
 */
export function runBatch(input, output, convert) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    // Bytes still to arrive for the frame being read, or -1 between frames.
    let want = -1;

    const drain = () => {
      for (;;) {
        if (want < 0) {
          const nl = buf.indexOf(LF);
          if (nl < 0) return;

          const header = buf.subarray(0, nl).toString('utf8').trim();
          if (header === '') {
            // Tolerate a blank line between frames.
            buf = buf.subarray(nl + 1);
            continue;
          }

          const n = Number(header);
          if (!Number.isInteger(n) || n < 0) {
            reject(new Error(`bad frame header: ${JSON.stringify(header)}`));
            return;
          }
          want = n;
          buf = buf.subarray(nl + 1);
        }

        if (buf.length < want) return;

        const doc = buf.subarray(0, want).toString('utf8');
        buf = buf.subarray(want);
        want = -1;

        try {
          writeFrame(output, 'ok', convert(doc));
        } catch (err) {
          writeFrame(output, 'err', err && err.message ? err.message : String(err));
        }
      }
    };

    input.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      drain();
    });
    input.on('error', reject);
    input.on('end', () => {
      drain();
      resolve();
    });
  });
}
