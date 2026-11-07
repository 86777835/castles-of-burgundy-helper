// Copies the tutorial script and FAQ (the rules assistant's sources in tools/) to public/ for the guide page.
// Run after editing either file: node tools/sync.mjs
import {copyFileSync, readFileSync} from 'node:fs';
JSON.parse(readFileSync('tools/faq.json', 'utf8'));   // fail loudly on broken JSON
copyFileSync('tools/faq.json', 'public/faq.json');
copyFileSync('tools/讲解稿.md', 'public/guide.md');
console.log('synced tools/faq.json and tools/讲解稿.md to public/');
