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
- **4 分钟讲规则**（`teach.html`，地址 `/teach`，2026-11-13 照匹兹堡移植）：首页“建一个房间”下面的入口卡片进入。讲的人照着念主流程（6 段，约 1200 字），再一条条过 19 条注意事项（写好答案，默认收起）。按简中特别典藏版讲，老版本的差别（平局判定相反、6/15/26 号修道院）放在最后两条注意事项里，不做版本开关。带下划线的词点开看规则书原图和注释；「问」按钮和注释里的按钮直接问规则助手（`chat.js` 的 `window.askRules`）。页底有图标速查（31 张图）。
- **新手教程 / 常见问题 / 易错规则**（`guide.html`）、**板块速查**（`tiles.html`，按版本、种类、编号查），**往期对局**（`history.html`）。
- **规则助手**（右下角“规则”）：`/api/chat`，只依据 `tools/讲解稿.md`、`tools/faq.json` 和 `public/tiles-data.js` 回答。模型顺序、超时切换和系列一致；本站不设 cron，`CHAT_STATE` 绑定匹兹堡的 KV，只读它写的 `deepseek-down`。回答下方不显示模型名。
  - **联网查找**（2026-11-12，照匹兹堡移植，用户批准的兜底）：本站资料答不了、又确实是勃艮第城堡的规则问题时，模型只回一行 `【需联网】` 加英文搜索词（以 Castles of Burgundy 开头，涉及典藏版时写 Castles of Burgundy Special Edition）。服务器调 DeepSeek 搜索接口 `/v1/tools/search`：先搜 BGG，不到 3 条再搜全网，最多 6 条，每次 6 秒超时；再让模型只依据这些摘要回答，用 [1] [2] 标出处。因为三个版本规则不同，要求模型写明说法属于哪个版本，看不出版本就提醒玩家按自己手里的版本核对。
  - 页面先显示“本站资料里没有，正在联网查找…”，回答上方固定标“以下来自网上讨论，本站未核对”，下面列来源链接。没搜到或搜索失败时给固定说明，不编答案。发回服务器的历史只带回答正文。
  - 日志 `chat web search` 记下搜索词和结果条数，核对后可以补进常见问题。实测联网回答大约 4–5 秒出完。

## 文件

- `public/logic.js`：前后端共用的规则逻辑，服务端 `reduce()` 权威校验：配置校验、计分单位（个人 / 队伍 / 自动机）、总分、平局判定、阶段推进、撤销。
- `public/steps.js`：开局清单、阶段开始/结束清单、每轮提示，每条带规则书页码。
- `public/tiles-data.js`：板块效果（自己的话概括）和版本差异。
- `public/app.js`：房间页面，`morph()` 增量渲染；草稿、展开状态放在 `ui` 里。
- `src/worker.js`：Room / Lobby / Archive 三个 Durable Object；主持人凭据不发给手机。
- `src/chat.js`、`src/sse.js`、`public/chat.js`：规则助手。
- `public/teach.js`：讲规则页的全部内容（TERMS 术语、PARTS 讲稿、NOTES 注意事项、GROUPS 图标速查），用词和讲解稿一致。图片在 `public/img/teach/*.webp`。
- `tools/讲解稿.md`、`tools/faq.json`：教程和常见问题的源文件。改完运行 `node tools/sync.mjs`，复制到 `public/guide.md`、`public/faq.json`。

## 本地运行与测试

```sh
ln -s /tmp/claude-501/pgh2/node_modules node_modules   # playwright-core
wrangler dev --port 8951                               # 不设 DeepSeek 密钥
node tests/run.mjs                                     # 另开终端
```

讲规则页另跑 `node tests/test_teach.mjs <地址> <截图目录>`：只拦截 `/api/chat`、不写数据，本地和线上都能跑（2026-11-13 线上全部通过）。

`tests/run.mjs` 依次跑 9 个测试，结果写进 `tests/测试结果.md`，截图在 `/tmp/claude-501/burgundy_shots/`。完整对局测试只能对 localhost 跑；评价接口全部用 `page.route` 拦截，不往线上写数据。规则助手测试用无密钥模式和拦截的流式回答，不调用真实模型。

联网查找另跑一组（本地假 DeepSeek，在 8790 端口模拟对话和搜索接口；和别的规则助手测试之间隔 1 分钟以上，免得撞上每分钟 8 问的限流）：

```sh
wrangler dev --port 8951 --var DEEPSEEK_API_KEY:fake --var DEEPSEEK_BASE:http://127.0.0.1:8790 --var CHAT_CF_MODEL:@cf/none/missing
node tests/test_chat.mjs http://localhost:8951/ /tmp/claude-501/burgundy_shots --mock-web
```

覆盖：资料能答不联网、标记拆在两个数据块里、先解释最后才给标记、没搜到、搜索接口出错、无关问题不联网、历史不带标签和来源。

如果 `/tmp/claude-501/pgh2/node_modules` 被清掉了，就新建这个目录，在里面运行 `npm i playwright-core`。

## 部署

```sh
wrangler deploy
wrangler secret put DEEPSEEK_API_KEY --name castles-of-burgundy-helper   # 由用户自己运行
```

已接入总入口：`games.json`（box 27×37×16.4，排在阿瓦隆和散樱乱武之间）、转盘封面、`/api/ask` 绑定 `ASK_BURGUNDY`、问答专属词和 `tests/mock/burgundy.jsonc`。

## 版权

游戏、规则与官方盒封面版权归原权利方。本站讲解是自己概括的非官方辅助说明。插画为 Codex CLI 生成的原创图，见 [docs/素材来源.md](docs/素材来源.md)。

例外：讲规则页的图片截自特别典藏版官方英文规则书（[Ravensburger 托管的 PDF](https://www.ravensburger.org/spielanleitungen/ecm/Spielanleitungen/CoB_Rulebook_285x210mm%20%5B28%20pages%5D.pdf)，28 页），页脚署名并链接原文，版权归 Ravensburger 与 Awaken Realms 所有。做法：`pdftoppm -r 300` 渲染，按坐标裁剪；六角片按六边形抠成透明背景，去掉规则书的底条；压成 webp（一般最长边 160 px，版图类 240 px），31 张共约 160 KB。
