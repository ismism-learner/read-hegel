# 术语政策（最高权威）

> 本文件是本项目**译名的唯一最高权威**。任何其他依据——通行译名、学术惯例、其他中译本、
> 读者评论、审校代理的建议——**都不得用来推翻它**，只能用来把工作做得更好。
> 机器守卫：`node scripts/check-policy.mjs`（违反即退出码 1）。

## 一、权威顺序（不可颠倒）

1. **本政策（用户的词族／术语决定）** —— 最高。
2. **卷级上下文包** `data/_jobs/context-<vol>.json` —— 在政策框架内细化；冲突时以政策为准。
3. **共享词表** `glossary/hegel_glossar.csv`。
4. **通行译名、学术惯例、其他中译本、读者评论** —— 仅供参考。
   特别注意：**通行译名（如"唯心主义""理念"）与政策冲突时，一律以政策为准。**

`scripts/push-authority-order.mjs` 把这条顺序写进每个卷级上下文包的第 1 条（代理必先读到）；
`scripts/normalize-context.mjs` 把与政策冲突的卷级条目归一化。

## 二、词根一致（核心原则）

**同一德文词根的不同书写形式，中文必须共用同一中文词根**，让读者看得见派生关系。
不能一半叫"理念"、一半叫"观念"、另一半叫"唯心主义"。

| 德文词族 | 中文词根 | 成员与译名 |
|---|---|---|
| **Idee** | **观念** | Idee 观念 · ideell 观念的 · das Ideelle 观念物 · Idealität 观念性 · idealisieren 观念化 · Idealismus 观念论 · idealistisch 观念论的 · Idealrealismus 观念实在论 |
| **Realität** | **实在** | Realität 实在性 · real 实在的 · das Reelle 实在物 · Realismus 实在论 |
| **Begriff** | **概念** | Begriff 概念 · begreifen 以概念把握 · begrifflich 概念性的 · begrifflos 无概念的 |
| **Vorstellung** | **表象** | Vorstellung 表象 · vorgestellt 被表象的 · sich vorstellen 设想/想象 |
| **Geist** | **精神** | Geist 精神 · geistig 精神的 · geistlos 无精神的 |
| **Wissen** | **知** | Wissen 知识（活动义作"知"）· wissen 知道 · absolutes Wissen 绝对知识 |
| **Wahrheit** | **真** | Wahrheit 真理 · wahr 真的 · wahrhaft 真正的 |
| **Wirklichkeit** | **现实** | Wirklichkeit 现实性 · wirklich 现实的 · verwirklichen 实现 |

机器可读版本：`glossary/hegel_families.csv`
（列：`family,root_zh,member_de,member_zh,sense,status,note`；`systematic` 受强制约束，
`exception` 是登记在案的日常义例外）。

### 严禁的译名（政策违规，`check-policy.mjs` 会拦）

- `Idealismus` → **观念论**，**严禁"唯心主义"**；`idealistisch` 严禁"唯心的"；
  `Idealität` 严禁"唯心性"。
- `Idee` → **观念**，**严禁"理念"**（含书名与学派名：
  `System des transzendentalen Idealismus` →《先验观念论体系》，
  `Das älteste Systemprogramm des deutschen Idealismus` →《德国观念论最古老的体系纲领》；
  首次出现附德文原名）。
- `Realismus` → 实在论，严禁"现实主义"。
- `Vorstellung` 严禁占用"观念"（该词根留给 Idee 族）。

## 三、配套规则

- **对偶成对**：观念性／实在性、观念论／实在论、观念物／实在物必须成对出现。
- **避免碰撞**：选定的词根不得被别的术语占用——`Vorstellung` 一律"表象"，`Begriff` 一律"概念"。
- **日常义例外**：`ideal`＝理想的、`Ideal`＝理想、`realisieren`＝实现 等日常义可保留通用说法，
  但体系义必须回到词族词根；例外须登记在 `hegel_families.csv` 的 `note` 里。
- **易混术语必须分开**：`Ansichsein` 自在存在 ≠ `Insichsein` 自身内存在；
  `Erscheinung` 现象 ≠ `Schein` 假象；`Gestalt des Bewußtseins` 意识的形态（**不是"意识形态"**）。

## 四、新增或修改一条政策的流程

1. 把思辨依据说清楚（同源同根、按体系义选根、避免碰撞、对偶成对、例外须记录、全库落地）。
2. 写进 `glossary/hegel_families.csv`（词族成员）或共享词表。
3. 下发到卷级上下文包：`node scripts/push-family-policy.mjs`、`node scripts/push-authority-order.mjs`。
4. 归一化冲突条目：`node scripts/normalize-context.mjs --apply`。
5. 回改已译正文：`node scripts/apply-families.mjs --apply`（带护栏，避免误伤）。
6. 术语混用的定向归一：`node scripts/fix-term.mjs --de Tun --zh 行动 --from 作为 --guard "\bals\b" --apply`
   （护栏用于排除"同一个中文词其实对应另一个德文词"的情形）。
7. 补词条：`node scripts/add-term.mjs --vol w3 --de Tun --zh 行动 --note "…"`。
8. 跑守卫：`node scripts/check-policy.mjs` → 必须通过。

**已执行的三次政策落地记录**：`Idealismus→观念论`（回改 67 句"理念→观念"、全库"唯心"归零）、
`Tun→行动`（91 个候选中凭护栏只改 18 处，73 处因德文含 `als` 而正确跳过）、
`Ansichsein/Insichsein` 拆分。
