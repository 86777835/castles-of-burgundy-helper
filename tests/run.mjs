// Runs every test against a local `wrangler dev --port 8951` (no DeepSeek key) and writes tests/测试结果.md.
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const BASE = 'http://localhost:8951/', OUT = '/tmp/claude-501/burgundy_shots';
const tests = ['test_logic', 'test_stream', 'test_authority', 'test_room', 'test_edges', 'test_nav', 'test_review', 'test_chat', 'test_chat_ui'];
const results = [];
for (const name of tests) {
  const args = [`tests/${name}.mjs`, BASE, OUT];
  if (name === 'test_chat') args.push('--no-key');
  const r = spawnSync(process.execPath, args, {encoding: 'utf8', timeout: 240000});
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  results.push({name, status: r.status === 0 ? 'PASS' : 'FAIL', output: (r.stdout || '') + (r.stderr || '') + (r.error?.message || '')});
}
writeFileSync('tests/测试结果.md', `# 本地测试结果\n\n日期：${new Date().toISOString().slice(0, 10)}。只访问 localhost:8951；评价接口全部拦截，没有往线上写数据。截图在 ${OUT}。\n\n` +
  results.map(r => `- ${r.status} ${r.name}`).join('\n') + '\n\n' + results.map(r => `## ${r.name}\n\n\`\`\`text\n${r.output}\`\`\`\n`).join('\n'));
console.log(results.map(r => `${r.status} ${r.name}`).join('\n'));
if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
