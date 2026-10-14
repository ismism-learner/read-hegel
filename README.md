# 读黑学 · 德文《黑格尔全集》阅读站

一个本地运行的静态阅读网站：**G. W. F. Hegel — Werke in zwanzig Bänden**（Suhrkamp 二十卷本）德文原版全文，
按原书卷次、章节层级与页码编排，支持全文检索、目录导航、卷内检索、书签、深链引用与三种配色。

## 文档（换机器 / 新会话请先读这三份）

| 文档 | 作用 |
|---|---|
| [术语政策](docs/术语政策-TERMINOLOGY-POLICY.md) | **译名最高权威**：权威顺序、词族表、严禁译名、新增政策的流程 |
| [交接说明](docs/交接说明-HANDOVER.md) | 环境准备、目录地图、继续翻译的完整命令链、验收清单、易踩的坑 |
| [项目日志](docs/项目日志-PROJECT-LOG.md) | 历史与决策，含**我自己犯过的测量错误与纠正**（避免重犯） |
| [豆瓣译本批评摘要](data/_research/豆瓣-黑格尔译本批评摘要.md) | 已出版中译本的缺陷catalogue（仅供参考，不得推翻政策） |

## 快速开始

```powershell
# 方式一：双击 start.cmd
# 方式二：
node scripts\serve.mjs --port 8788 --open    # 自动打开 http://127.0.0.1:8788/
```

只依赖 Node.js（≥18），无第三方包。静态文件在 `web/`，也可以用任何静态服务器托管。

## 功能

**书架页 `web/index.html`**
- 12 卷书目卡片：卷次、德文/中文标题、年代、篇幅、词条数、阅读进度
- 全文检索：跨全部 12 卷（约 2023 万字符德文正文），多词空格分隔（默认须同时命中），
  结果按相关度排序，标题命中与正文命中分组显示，并给出高亮摘录
- 展开式目录、公版初版对照链接（Deutsches Textarchiv）
- 三套配色：明亮 / 暖褐 / 夜间；设置随浏览器保存

**阅读器 `web/reader.html`**
- **三栏对照**：左德文原文 / 中英文 / 右中文（`原文`、`德·中`、`德·英·中` 三档切换，英文栏可一键隐去）
- **句级联动**：鼠标移到左侧某一句，该句（以及英、中两栏对应的同一句）整句下方浮现下划线并轻微下沉，移开即消失
- 左侧完整目录树（按原书层级逐级折叠），自动定位并展开当前章节
- 上一节 / 下一节、卷次切换、阅读进度条与断点续读
- 卷内检索：结果点击即跳转到对应段落并高亮
- 书签（`b`）、复制引用（`c`，含卷次与 Suhrkamp 原书页码）
- 原书页码边注（悬停显示 `Werke 8, S. 192`），可开关
- 选词后浮动工具条：复制 / DWDS / Wiktionary / dict.cc / Leo
- 字号、行高、栏宽调节；德文断词排版；打印样式
- 深链：`reader.html?v=w5&c=12&a=f12-h100-3&p=8&q=Begriff`（卷 / 节 / 标题锚点 / 段落 / 检索词）

快捷键：`←/→` 或 `p/n` 换节 · `j/k` 或空格滚动 · `b` 书签 · `c` 引用 · `m` 目录 · `e` 显示/隐藏英文栏 · `/` 检索（书架页）

## 双语对照与译文

译文由本 agent **自己生成**（未采用任何已出版译本），流程固定为两步：**德文 → 英文 → 中文**。
英文是先行的逐句工作译本，中文再从英文转写，力求**平实白话、贴近原文语气**，不取学术论文腔；
术语仍沿用学界通行译名（精神现象学、知性、扬弃、自在自为、定在等）。

- 句级对齐：构建时用同一套德语分句器把每段切成句子，德语原句与英、中译文共享同一个
  `data-sid`（如 `b2s0`），因此鼠标悬停时三栏能精确联动。切分规则、分句结果对所有语言一致。
- 译文数据：`web/data/trans/<卷>/<节>.json`，每段记录德文原文哈希（用于检测底本变动导致的错位）、
  英文句数组与中文句数组；覆盖率汇总写入 `web/data/trans/index.json`（书架卡片与阅读器顶部的
  「已译 N 段」即来自此文件）。
- 术语对照表：**`glossary/hegel_glossar.csv`**（德 / 英 / 中 / 状态 / 备注，UTF-8 带 BOM，可直接用 Excel 打开）。
  这是翻译时参照并持续追加的核心术语表；凡德→英译法存疑者，状态标 `unsicher` 并在备注里写明
  备选与理由（例如 `Moment` 译 moment 有歧义、`Dasein` 与 `Existenz` 在英文里都成了 existence）。
  该 CSV 仅供翻译与校订使用，前端不读取、不展示。
- 当前进度：见 `node scripts/trans-index.mjs` 的输出；书架上已译的卷会出现「双语对照」入口。

重新生成覆盖率索引（每次新增译文后执行）：

```powershell
node scripts\trans-index.mjs     # 校验英/中句数与德文严格一致，并写出 index.json
```

### 翻译架构（v2）

v1 的代理各写各的、校验只查句数，有两个硬伤：**术语无全局权威**、**校检查不出质量**。
按 GitHub 上成熟实现的通行做法改造（调研记录见 `data/_research/`，提示词模板见 `scripts/agents/PROMPTS.md`）：

- **`aws-samples/bedrock-translation-agent`** —— AWS 官方对 andrewyng/translation-agent 的移植，
  实现 **reflective workflow**：翻译 → 反思（对译文提出具体改进意见）→ 改进；并引用了超长文学作品
  多代理协作的论文（Wu et al. 2024）。
- **`purecodework/bookllm`**（书籍翻译）—— 架构为 **术语提取 → 翻译 → 审校 → 润色**，
  且审校提示词明确写着「保守的 QA 校正，不是重译或自由改写」「没有明确缺陷就原样返回」
  「只做最小改动」「不要改得更文学化」，以及 `forbiddenTranslations`（禁止译法）表。
- **`hint-lab/deeptrans-studio`**、**`10div10/translation-agent-rag`** —— 专业本地化多代理平台与
  「翻译记忆 + 词表 + 风格检索」的 RAG 路线。

据此本项目落地为三阶段。质量结论以**受控 A/B**为准（同一批德文、两臂各译一遍、同一套规则评估，
6 单元 / 30 段 / 156 句）：

| 臂 | 架构 | 问题/百句 | 重大问题/百句 | 致命 |
|---|---|---|---|---|
| A | 上下文包 + 翻译 | 7.1 | 0 | 0 |
| B | 上下文包 + 翻译 + 保守审校 | **4.5** | 0 | 0 |

剩下的问题**全是轻微术语一致性问题**（`法律/环节/权利/精神/现象/扬弃/知性` 等，多义词按语境取义的噪声），
两臂都没有重大或致命缺陷。即：**审校能把轻微术语不一致再降约三分之一，代价是每单元多一个代理（约 2× 成本）**。
因此默认用 A（不审校），审校保留给高价值文本或质检报错的单元。

> 早期版本曾给出一张全库范围的"架构对照表"，因各组覆盖章节不同（原文本就不同）而**不可比**；
> 且当时质检报告曾因子进程被管道杀死而没写完，据此得出过错误结论。此处已用受控 A/B 取代。

流程要点：

1. **卷级上下文包（context package，每卷一次）**：一个代理产出该卷的 `styleGuide`、术语表
   （de/en/zh + 类型 + 说明）与 `forbidden` 禁止译法表，写 `data/_jobs/context-<vol>.json`。
   所有单元翻译前必须读它——**术语从此有唯一权威**。实测该卷产出 8 条风格规则、
   119 条术语、32 组禁译（如 `Volksreligion→民间宗教`，不作"人民宗教"）。
2. **翻译（draft）**：每单元一个代理，德→英→中逐句，遵守上下文包的术语与风格。
3. **保守审校（review）——默认关闭，按需触发**：基调是"没有明确缺陷就原样返回、只做最小改动、
   不许润色增补"。
4. **确定性质检（零成本）**：`scripts/qa-trans.mjs` 做 MQM 式的机器可查项——对齐、空值/占位、
   语言混杂、原文回声、长度比值离群、**术语符合性**、跨句重复译文；术语规则**按卷生效**
   （卷级上下文包优先，避免拿《逻辑学》术语表去要求 1795 年早期文稿）；并按符合率反向指出
   **可疑词表条目**（经验：600+ 条"错误"里有 158 条其实是一个烂词条 `werden→生成` 造成的误报）。
5. **失败回炉**：质检不达标的单元带具体 findings 重新入队。

**对齐契约**：块号（block key）才是对齐依据，哈希只是护栏——代理经常忘记照抄哈希，
因此 `merge-trans.mjs` 在块号有效且英/中数组长度与德文句数一致时**按当前数据重新盖章**接受，
不再静默丢弃译文（此前正是在这里丢过一批活儿）。

### 批量翻译流水线（整库推进用）

手工逐段翻译太慢，整库推进靠一条"切片 → 并行翻译 → 校验 → 合并"的流水线：

```powershell
# 1) 按时间顺序把未译部分切成工作单元（每单元约 25 句），并写出单元输入文件
node scripts\make-jobs.mjs --size 25 --limit 40 --prefix wave1
#    → data/_jobs/jobs-wave1.json（单元 id 列表）、data/_jobs/<id>.in.json（德语句子 + 哈希 + 输出路径）

# 2) 用 workflow 工具按批并行翻译（每批 ≤6 个，子代理上限为 8）
#    每个单元一个翻译代理（德→英→中），后面再跟一个对抗式校验代理：
#    核对块集合、哈希、英/中数组长度是否与德文句数严格相等，发现错位就地重译

# 3) 合并与校验
node scripts\merge-trans.mjs     # 把 *.p<起段>.json 合并进分节文件，句数/哈希不符者拒收并报错
node scripts\merge-glossar.mjs   # 合并各单元自带的术语表，新增词条与可疑译法会列出来
node scripts\trans-index.mjs     # 全库对齐校验 + 覆盖率
```

- 每个翻译代理只写自己的 `data/_jobs/<id>.glossar.csv`，**不直接改共享术语表**，避免并行写冲突；
  合并时已有的词条保留、新词条追加，标 `unsicher` 的会单独列出供复核。
- 单元是自包含的：输入文件里带德语原句、块哈希与输出路径，代理之间无共享状态，可安全并行。
- 单批实测（wave1，11 单元 / 178 段 / 413 句）：约 13 分钟、22 个代理、6 路并发，
  对齐校验零失败。按此速率，全库 91,113 句约需 **3,800 个单元、约 74 小时连续运行**。


## 收录范围

| 卷次 | 作品 | 节数 |
|---|---|---|
| Bd. 1 | Frühe Schriften 早期著作 | 22 |
| Bd. 2 | Jenaer Schriften 1801–1807 耶拿时期著作 | 15 |
| Bd. 3 | Phänomenologie des Geistes 精神现象学 | 17 |
| Bd. 4 | Nürnberger und Heidelberger Schriften 1808–1817 | 16 |
| Bd. 5–6 | Wissenschaft der Logik 逻辑学（大逻辑） | 38 |
| Bd. 7 | Grundlinien der Philosophie des Rechts 法哲学原理 | 13 |
| Bd. 8–10 | Enzyklopädie der philosophischen Wissenschaften 哲学科学全书纲要 | 59 |
| Bd. 11 | Berliner Schriften 1818–1831 柏林时期著作 | 16 |
| Bd. 12 | Vorlesungen über die Philosophie der Geschichte 历史哲学讲演录 | 17 |
| Bd. 13–15 | Vorlesungen über die Ästhetik 美学讲演录 | 58 |
| Bd. 16–17 | Vorlesungen über die Philosophie der Religion 宗教哲学讲演录 | 35 |
| Bd. 18–20 | Vorlesungen über die Geschichte der Philosophie 哲学史讲演录 | 54 |

合计 12 个书目条目、360 节、约 19.3 MB 德文正文（2023 万字符），覆盖原版第 1–20 卷。

## 目录结构

```
web/                     站点（可直接托管）
  index.html             书架页
  reader.html            阅读器
  assets/                样式与前端脚本（原生 ES 模块，无依赖）
  data/manifest.json     书目与卷次元数据
  data/vol/<id>/
    nav.json             章节树（标题 / 层级 / 节号 / 锚点）
    <n>.json             正文分节（清洗后的 HTML，含脚注）
    idx.json             词条 → 节号 倒排索引（用于检索）
  data/img/<band>/       正文中的公式图片
scripts/
  fetch-hegel.mjs        抓取原始语料（可断点续传，多镜像回退）
  build.mjs              解析 → 清洗 → 分句标注 → 分节 → 建索引 → 输出站点数据
  lib/sentences.mjs      德语分句器 + 句级 span 标注 + 块哈希（构建与翻译共用，保证左右句号对齐）
  dump.mjs               导出某节的分块/分句文本（翻译时逐句比对用）
  trans-index.mjs        译文覆盖率索引 + 英/中/德句数一致性校验
  survey.mjs             语料结构普查（卷次、标题层级、标签/类名统计）
  validate.mjs           产物校验（分节大小、标签闭合、界面元素泄漏）
  serve.mjs              本地静态服务器（gzip，--open 自动打开浏览器）
  check.mjs              单页冒烟测试（无头 Edge/CDP：控制台报错 + 断言 + 截图）
  sweep.mjs              逐卷巡检（每个卷抽查若干节，汇总 JS 报错）
  verify-goal.mjs        端到端验收（渲染 / 进度记忆 / 全书检索 / 深链 / 设置持久化）
  integrity.mjs          产物完整性报告（卷次覆盖 / 分节齐全 / 目录与索引引用）
data/_raw/               原始抓取结果（40 MB，可删；重跑 fetch 即可恢复）
```

重新生成数据：

```powershell
node scripts\fetch-hegel.mjs     # 抓取（首次约 40 MB，断点续传）
node scripts\build.mjs           # 重建 web/data
node scripts\validate.mjs        # 产物校验（分节大小 / 标签闭合 / 界面元素泄漏）
node scripts\integrity.mjs       # 完整性报告（卷次覆盖 / 分节齐全 / 引用有效）
```

验收（需先启动站点）：

```powershell
node scripts\sweep.mjs                                       # 逐卷巡检，应输出 with-errors=0
node scripts\verify-goal.mjs http://127.0.0.1:8788           # 端到端验收，应输出 failed=0 errors=0
```

## 术语政策（词族一致）

### 权威顺序（不可颠倒）

1. **用户的词族／术语政策 —— 最高权威。** 任何其他依据都不得用来推翻它。
2. **卷级上下文包** —— 在政策框架内细化；与政策冲突时以政策为准。
3. **共享词表** `glossary/hegel_glossar.csv`。
4. **通行译名、学术惯例、其他中译本与读者评论 —— 仅供参考。** 只能用来把工作做得更好，
   绝不能作为改动政策译名的理由。特别提醒：通行译名（如"唯心主义""理念"）与政策冲突时，
   一律以政策为准。

这条顺序由 `scripts/check-policy.mjs` **机器守卫**：卷级上下文包首条规则必须是权威顺序、
词族政策规则必须在场、译文中不得出现加载译名、术语包条目与禁译项不得与词族表冲突，违反即退出码 1。
`push-authority-order.mjs` 负责下发，`normalize-context.mjs` 负责把与政策冲突的卷级条目归一化。

译名不只是"一个词对一个词"，还要**让中文读者看得见德文的词源关系**。据此确立六条规则：

1. **同源同根**：同一德文词根的不同书写形式，中文必须共用同一词根。
2. **按体系义选根**：共用哪个根，取决于该词在体系义上承担什么。既然 `Idealismus` 作「观念论」，
   该族的根就是**观念**。
3. **避免碰撞**：选定的根不能被别的术语占用——`Vorstellung` 一律作**表象**（不占「观念」），
   `Begriff` 作**概念**。
4. **对偶成对**：黑格尔的术语成对出现，中文也要成对：**观念性／实在性**、**观念论／实在论**、
   **观念物／实在物**。（"唯心主义"最大的问题正是切断了这组对偶。）
5. **例外须记录**：同一词的日常义可以另译（`ideal`＝理想的、`Ideal`＝理想、`realisieren`＝实现），
   但必须写进词表并注明理由，是有意识的取舍，不是随手乱译。
6. **全库落地**：原则同时写进**共享词表、卷级上下文包、质检规则、已译正文回改**四处，否则会衰减。

### 已建成的机制

- **`glossary/hegel_families.csv`** —— 词族表：`family,root_zh,member_de,member_zh,sense,status,note`。
  体系义成员（`systematic`）受强制约束，日常义例外（`exception`）显式登记。
  已登记 Idee／Realität／Begriff／Vorstellung／Geist／Wissen／Wahrheit／Wirklichkeit 八族。
- **`scripts/apply-families.mjs`** —— 把词族成员写入共享词表；扫描全库找出"德文含某族成员、中文却没带该族词根"的句子；
  可安全替换的（如 `理念→观念`、`唯心*→观念*`、`真正的→现实的`、`观念→表象`）就地回改，
  并用护栏避免误伤（`Wirklichkeit` 族的替换只在德文不含 `wahr` 时进行；`Vorstellung` 族的替换只在德文不含 `Idee` 时进行）。
- **`scripts/qa-trans.mjs`** —— 新增词族检查：德文出现体系义成员而中文缺该族词根 → 记为 **major**（政策违规，不是风格建议）。
- **`scripts/push-family-policy.mjs`** —— 把上述规则写进每个卷级上下文包的 `styleGuide`，新翻译自动遵守。

首次执行结果：回改 `理念→观念` 67 句、`真正的→现实的` 16 句、`观念→表象` 4 句；
全库"唯心"类加载译名归零。剩余 128 处词族断裂已列入待复核（多为 `wirklich`／`Geist` 的语境取义）。

## 文本来源与版权

- **版本**：G. W. F. Hegel: *Werke in 20 Bänden*. Hrsg. von Eva Moldenhauer und Karl Markus Michel.
  Frankfurt am Main: Suhrkamp, 1969 ff.
- **数字化**：Hegel-Institut Berlin / Talpa-Verlag（2012）德文 HTML 文本，经 MLCLASSIC 档案
  （`marx-ebooks.github.io`，GitHub 仓库 `MARX-EBOOKS/marx-ebooks.github.io`）镜像获得；
  部分卷次文本源自 zeno.org（Henricus Edition Deutsche Klassik）。
- **公版对照本**：*Phänomenologie des Geistes*（1807）、*Wissenschaft der Logik*（1812/1813/1816）
  初版全文可在 [Deutsches Textarchiv](https://www.deutschestextarchiv.de/) 查阅（公共领域，含 TEI 校勘本），
  书架页对应卡片已给出直达链接。

### 版权状态（分三层，不要混为一谈）

1. **黑格尔本人的文字 —— 公有领域。** 他 1831 年去世，德国版权为死后 70 年，**1901 年即已到期**
   （中国为死后 50 年，1881 年到期）。正文段落 17,948 块 / 92,117 句属于这一层，可自由使用。
2. **Suhrkamp 版作为"科学版本" —— 德国《著作权法》第 70 条，仅 25 年**，自出版起算：
   1969–1979 年出版的各卷约在 1994–2004 年陆续到期。它保护的是**编者的编纂成果**，
   而不是黑格尔的字。
3. **编者的个人著述与校注（`fn` 块）—— 这一层才需要谨慎。** 本语料中这类"Anmerkungen"
   （出处考订、版本说明）共 **263 块，占块数 1.44%，且不含句子**（句级流水线只标记正文段落）。
   正文中作为标题出现的 Hegel 自己的 "Anmerkung"（如《逻辑学》的 Anmerkung 1/2/3）属第 1 层。

因此：**正文可发布；若要公开发布，请排除 `fn` 块（编者校注）这一层**（`build.mjs` 的
`--drop-editorial` 开关或发布前过滤）。本项目当前为**本地个人研读**版本，公开部署前请按上表核对。
需要完全公版的底本时，请以 Deutsches Textarchiv 的初版为准。


## 说明

- 原文页码锚点（`S8-192` 之类）来自数字化底本，覆盖 Bd. 1、2、4、8–20；Bd. 3、5–7 底本未带页码锚点。
- 公式在底本中是图片，已一并收录，并保留底本的文字替代内容（小号等宽字）。
- 底本可能存在少量 OCR 讹字或分页残留（如孤立的 `seite` 标记、`</br>`），未作校勘改动；
  引用原文时建议与公版初版或纸本核对。
