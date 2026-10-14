# 交接说明（换一台电脑继续做）

> 先读这三份，再动手：`docs/术语政策-TERMINOLOGY-POLICY.md`（译名最高权威）、
> `docs/项目日志-PROJECT-LOG.md`（历史与踩过的坑）、本文件（怎么跑）。

## 一、环境准备

| 项目 | 要求 |
|---|---|
| Node.js | 18+（本项目**零依赖**，没有 npm install 这一步；实测 v24） |
| git | 任意近期版本 |
| SSH 密钥 | `~/.ssh/id_ed25519_ismism`（身份 `ismism-learner`）+ `id_ed25519_ismism.pub` |
| 浏览器 | 本地阅读器用；`scripts/check.mjs` 走 Edge/Chrome 的 CDP 做验收 |

**从 GitHub 取回**：

```bash
git clone git@github.com:ismism-learner/read-hegel.git
cd read-hegel
```

若 SSH 报错或推错地方，检查是否**明确指定了身份**（关键，容易踩）：

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_ismism -o IdentitiesOnly=yes' git push origin main
```

> 不加 `IdentitiesOnly=yes` 时，SSH 可能先用另一把 `id_ed25519`（那是 `UGcraft/UGcraft-hall-of-fame`
> 的部署密钥），于是推到一个毫不相干的仓库。

## 二、跑起来

```bash
node scripts/serve.mjs --port 8788      # 本地静态服务（gzip）
# 浏览器打开 http://127.0.0.1:8788/
```

页面：`/`（书架，12 卷）→ `reader.html?v=<卷>&c=<分片>&lay=tri|mono`。
阅读器内：`EN` 按钮或 `e` 键切换英文栏；布局按钮在三栏 / 德中 / 纯德之间切换。

## 三、目录地图

```
web/                      前端（原生 ES 模块，无构建步骤）
  index.html reader.html  书架 / 阅读器
  assets/                 base.css library.css reader.css util.js search.js library.js reader.js
  data/manifest.json      12 卷 360 分片索引
  data/vol/<vol>/<n>.json 分片：{v,i,t,cr,blocks:[{k:'h'|'p'|'fn', x, hash, ns, ...}]}
  data/trans/<vol>/<n>.json  译文：{blocks:{"<块号>":{h,en:[],zh:[]}}}   ← 你译的东西在这里
  data/trans/index.json   覆盖率索引
scripts/
  lib/sentences.mjs       ★ 分句器（build 与翻译共用，改它必须重跑 build + 全套验收）
  build.mjs fetch-hegel.mjs serve.mjs
  make-jobs.mjs merge-trans.mjs trans-index.mjs validate.mjs integrity.mjs
  qa-trans.mjs            ★ 零成本质检（对齐/漏否定/重复片段/术语符合性）
  check-policy.mjs        ★ 政策守卫（违反退出码 1）
  make-review-jobs.mjs apply-review-patches.mjs show-review-diff.mjs   ← 逐章审校
  make-family-jobs.mjs apply-family-patches.mjs apply-families.mjs normalize-context.mjs
  fix-term.mjs add-term.mjs push-family-policy.mjs push-authority-order.mjs push-reader-rules.mjs
  check.mjs sweep.mjs     CDP 验收（单页 / 全卷）
  verify-hover-sweep.mjs verify-paragraph-align.mjs verify-coverage.mjs audit-sentences.mjs
  agents/PROMPTS.md       各阶段提示词模板
  workflows/WORKFLOW-SCRIPTS.md  ★ workflow 工具的脚本模板（翻译/建包/审校/词族修复）
glossary/hegel_glossar.csv    共享词表（de,en,zh,status,note）
glossary/hegel_families.csv   ★ 词族表（政策机器可读版）
data/_jobs/                   任务载荷 + 卷级上下文包 context-<vol>.json（术语权威）
data/_research/               豆瓣批评摘要、架构调研记录
data/_raw/                    德文底本 HTML（52 MB，构建输入）
docs/                         本文件、术语政策、项目日志
```

## 四、继续翻译：完整循环

```bash
# 1) 切片（按时间顺序取未译部分；--vol 可限定某一卷）
node scripts/make-jobs.mjs --size 25 --limit 12 --prefix wave30
#    → data/_jobs/jobs-wave30.json 与 data/_jobs/<unit>.in.json

# 2) 在会话里用 workflow 工具并行翻译（子代理上限 8，故每批 6；提示词见 scripts/agents/PROMPTS.md）
#    每个单元一个代理，提示词要求：读 data/_jobs/context-<vol>.json，遵守政策与词族规则

# 3) 合并与校验（合并是幂等的；哈希不符会按块号重新盖章，不会静默丢活）
node scripts/merge-trans.mjs
node scripts/trans-index.mjs        # 必须 0 不一致

# 4) 零成本质检 + 政策守卫
node scripts/qa-trans.mjs > /tmp/qa.txt     # ⚠️ 不要用管道截断，会杀掉进程导致报告不完整
node scripts/check-policy.mjs               # 必须 exit 0

# 5) 逐章审校（一个代理约 30 句，只修明确缺陷）
node scripts/make-review-jobs.mjs --vol w3 --chunk 7 --size 30
#    → workflow 派发审校代理（提示词见 PROMPTS.md 的 review 段）
node scripts/apply-review-patches.mjs --apply
mv data/_jobs/rev-*.out.json data/_jobs/_applied/     # ★ 务必归档，否则会被重复套用
node scripts/show-review-diff.mjs --vol w3 --chunk 7  # 逐条回查德文后再决定是否保留
```

### 验收（每次改动数据或分句器后都跑）

```bash
node scripts/verify-coverage.mjs          # 覆盖率独立重算并与站内索引比对
node scripts/verify-hover-sweep.mjs       # 多章悬停联动（句数 de=zh=en、下划线、下沉）
node scripts/verify-paragraph-align.mjs   # 逐段对齐（段落+标题+脚注 每块一行）
node scripts/sweep.mjs --per 2            # 全卷浏览器普查，0 JS 错误
node scripts/audit-sentences.mjs          # 并句检查（真实并句应为 0）
```

## 五、当前状态（交接时）

| 卷 | 状态 |
|---|---|
| Bd. 1 早期著作 | ✅ 22/22 节 · 3,740 句 |
| Bd. 2 耶拿著作 | ✅ 15/15 节 · 3,270 句 |
| Bd. 3 精神现象学 | 10/17 节 · 3,088 句（序言→理性前半；w3/2–w3/6 已逐章审校） |
| 合计 | **10,098 / 92,117 句 = 10.96%**（另有第 29 波在跑，约 +500 句） |

覆盖率另有按段落的数字：2,553 / 17,948 = 14.22%。

### 下一步（按优先级）

1. **继续《精神现象学》**：`make-jobs` 会自动接着 w3/11 往后；每译完一章跑一次逐章审校。
2. **收尾第 3 卷后进入第 4 卷**（纽伦堡与海德堡时期著作）：**先为 w4 建上下文包**
   （`scripts/agents/PROMPTS.md` 的 build-context 提示词），否则术语失去权威。
3. **未审校章节**：w1（22 节）、w2（15 节）整卷尚未逐章审校——它们译于词族政策之前，
   可用 `make-review-jobs` 分批补审；也可用 `apply-families.mjs` 先做一次词族归一。
4. **遗留待复核**：约 17 处词族断裂、约 10 处背靠背重复（经核实多为原文复沓）、
   以及 `qa-trans.mjs` 末尾列出的可疑词条。

## 六、仓库里**没有**的东西（有意排除）

| 排除项 | 原因 | 需要时怎么办 |
|---|---|---|
| `data/_backup/`（35 MB） | 重建前的整库快照，仅为回滚保险；当前状态完整，无需随仓库迁移 | 换机器后不需要；要留档可自行压缩另存 |
| `data/_jobs/_applied/` | 已并入正文的补丁文件（留下会导致重复套用） | 无需恢复 |

其余一律在仓库里，包括：**第一代架构的旧译文**（`data/_archive/`，如 `w3-0-v1.json`）、
任务载荷与卷级上下文包（`data/_jobs/`）、调研与批评摘要（`data/_research/`）、
全部脚本与验收工具（`scripts/`）、词表与词族表（`glossary/`）、以及 `docs/` 下这三份文档。

## 七、容易踩的坑（都真实发生过）

1. **别用管道截断**看质检输出（`| Select-Object -First N`）：Node 进程会在写报告前被杀，
   拿到的是过期报告，曾据此得出错误结论。
2. **改分句器必须重跑全套验收**：`build.mjs` → `audit-sentences` → `validate` → `trans-index` →
   `verify-hover-sweep`。分句器曾因底本畸形嵌套标签把整段并成一句（659 块）。
3. **审校代理的改动不是权威**：逐条回查德文再决定；曾有一处把盐的 `scharf` 由"咸"改成"辛辣"。
   补丁应用后必须归档到 `data/_jobs/_applied/`。
4. **术语规则按卷生效**：不要拿《逻辑学》的术语表去要求 1795 年的早期文稿。
5. **政策 > 通行译名**：`唯心主义`、`理念` 这类通行译名与政策冲突时，一律以政策为准
   （`check-policy.mjs` 会拦）。
6. **版权**：黑格尔文字公有领域；编者校注（`fn` 块，263 块）另属一层。
   公开部署前跑 `node scripts/build.mjs --drop-editorial`（已实测：263 → 0，正文与句数不变）。
7. **PowerShell 5.1 限制**：不支持 `ForEach-Object -Parallel` 与三元 `? :`；`node -e` 里的引号
   易被吞（复杂脚本请写成文件再跑）；`>` 重定向默认 UTF-16LE，读回时要处理 BOM。
