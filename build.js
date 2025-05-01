import fs from 'node:fs';

const source = fs.readFileSync( 'index.js', 'utf-8' );
const metadata = source.match( /^\/\/ ==UserScript==.+?\/\/ ==\/UserScript==$/sm )?.[0] || '';
const result = await Bun.build({
  entrypoints: ["index.js"],
  target: "browser"
});
fs.writeFileSync(
  'output.js',
  `${ metadata }\n\n${ await result.outputs?.[0].text() }`, {
  encoding: "utf-8"
});
