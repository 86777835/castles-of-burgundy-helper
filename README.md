# 勃艮第城堡助手

线下对局《勃艮第城堡》的中文手机助手，重点是开局准备：按版本和人数告诉玩家怎么摆、每个阶段补什么。纯原生 JavaScript，Cloudflare Workers + 静态资源 + Durable Objects，没有构建步骤。

- 线上：https://burgundy.leisurecat.cloud（2026-11-08 上线），仓库 86777835/castles-of-burgundy-helper
- Worker 名：`castles-of-burgundy-helper`
- rate limit `namespace_id`：1111
- 结算评价 game key：`castles-of-burgundy`（已加进总入口 `games.json`）

做什么、不做什么，以及用户的确认结果，见 [docs/调研清单.md](docs/调研清单.md)。规则依据和没核实的地方见 [docs/规则核验.md](docs/规则核验.md)。

## 功能

- **本局配置**：版本（特别典藏版 / 2019 红盒 / 2011 原版），人数（典藏版和 2019 版有官方单人；4 人可选团队游戏；典藏版可加自动机），扩展（只列出该版本有的），公国版图（全员 1 号、全员 2 号、各自随机；典藏版可以让手机按所选版图组抽号）。
- **开局清单**：只列出本局用得到的步骤，每条附所选版本规则书的页码。全桌同步勾选。
- **阶段清单**：一个阶段一屏。阶段开始的补货清单（按人数，3 人局 B、D 阶段特别提醒），每轮流程，本局速算（区域分表、卖货分、奖励分），阶段结束清单。主持人每阶段点一次进入下一阶段。
- **终局计分**：每人录分数轨上的分、剩余货物、银币、工人、计分类修道院（可用小工具算），有扩展时加盾徽、葡萄园。同分时才要求填空格数和回合顺位，按所选版本的规则判定。团队游戏按队计分，自动机录一个总分，官方单人只记成功与否。
- **结算**：排名、长图、修改分数、自动存档，系列统一评价卡。
- **新手教程 / 常见问题 / 易错规则**（`guide.html`）、**板块速查**（`tiles.html`，按版本、种类、编号查），**往期对局**（`history.html`）。
- **规则助手**（右下角“规则”）：`/api/chat`，只依据 `tools/讲解稿.md`、`tools/faq.json` 和 `public/tiles-data.js` 回答。模型顺序、超时切换和系列一致；本站不设 cron，`CHAT_STATE` 绑定匹兹堡的 KV，只读它写的 `deepseek-down`。回答下方不显示模型名。

## 文件

- `public/logic.js`：前后端共用的规则逻辑，服务端 `reduce()` 权威校验：配置校验、计分单位（个人 / 队伍 / 自动机）、总分、平局判定、阶段推进、撤销。
- `public/steps.js`：开局清单、阶段开始/结束清单、每轮提示，每条带规则书页码。
- `public/tiles-data.js`：板块效果（自己的话概括）和版本差异。
- `public/app.js`：房间页面，`morph()` 增量渲染；草稿、展开状态放在 `ui` 里。
- `src/worker.js`：Room / Lobby / Archive 三个 Durable Object；主持人凭据不发给手机。
- `src/chat.js`、`src/sse.js`、`public/chat.js`：规则助手。
- `tools/讲解稿.md`、`tools/faq.json`：教程和常见问题的源文件。改完运行 `node tools/sync.mjs`，复制到 `public/guide.md`、`public/faq.json`。

## 本地运行与测试

```sh
ln -s /tmp/claude-501/pgh2/node_modules node_modules   # playwright-core
wrangler dev --port 8951                               # 不设 DeepSeek 密钥
node tests/run.mjs                                     # 另开终端
```

`tests/run.mjs` 依次跑 9 个测试，结果写进 `tests/测试结果.md`，截图在 `/tmp/claude-501/burgundy_shots/`。完整对局测试只能对 localhost 跑；评价接口全部用 `page.route` 拦截，不往线上写数据。规则助手测试用无密钥模式和拦截的流式回答，不调用真实模型。

## 部署

```sh
wrangler deploy
wrangler secret put DEEPSEEK_API_KEY --name castles-of-burgundy-helper   # 由用户自己运行
```

已接入总入口：`games.json`（box 27×37×16.4，排在阿瓦隆和散樱乱武之间）、转盘封面、`/api/ask` 绑定 `ASK_BURGUNDY`、问答专属词和 `tests/mock/burgundy.jsonc`。

## 版权

游戏、规则与官方盒封面版权归原权利方。本站讲解是自己概括的非官方辅助说明。插画为 Codex CLI 生成的原创图，见 [docs/素材来源.md](docs/素材来源.md)。
