// Emit the w3 (Phänomenologie des Geistes) context package and its CSV termbase.
//   node data/_jobs/_emit-ctx-w3-csv.mjs
// Single source of truth: the ENTRY table below -> context-w3.json + ctx-w3.glossar.csv
import fs from 'node:fs';

/* ---------------------------------------------------------------- style guide */
const styleGuide = [
  '权威顺序（不可颠倒）：① 用户的词族／术语政策最高，任何其他依据都不得用来推翻它；② 本卷术语包在政策框架内细化，与政策冲突时以政策为准；③ 共享词表；④ 通行译名、学术惯例、其他中译本与读者评论——仅供参考，只能用来改进，绝不能作为改动政策译名的理由。特别提醒：通行译名（如“观念论”“理念”）与政策冲突时，一律以政策为准。',
  '词根一致：同一德文词根的不同形式必须共用一个中文词根——Idee/ideal/Idealität/Idealismus/das Ideelle 一律用“观念”（观念、观念性、观念论、观念物），严禁“唯心主义”、严禁“理念”；Realität/real/Realismus/das Reelle 一律用“实在”（实在性、实在论、实在物）；Begriff/begreifen 用“概念”（概念、以概念把握）；Vorstellung 用“表象”，不得占用“观念”。书名与学派名同样服从（《先验观念论体系》System des transzendentalen Idealismus）。',
  '对偶成对：观念性／实在性、观念论／实在论、观念物／实在物必须成对出现，不许一边用“观念”、另一边用“唯物”或“现实”。',
  '长句保留为一整句：德文一句＝中文一句（机器校验），保持逗号、分号、冒号的层级，按原文的嵌套层次展开，不拆成一串短句，也不重排语序。',
  '用白话，不用论文腔：能说“X 就是 Y”就不写“所谓 X 者，乃 Y 也”；不用“盖、故、岂、焉、换言之、不可谓不”这类旧腔，也不用“进行／作出／关于……的问题”这类翻译体套话。',
  '不增不删：不漏否定、不漏被动、不漏半句；不作解释性增补，不夹带译者自己的见解（译者注只写版本、术语与必要说明）。',
  '一句只译一次：定语从句、插入语都只出现一次，不得重复翻译同一从句。',
  '不造生词：术语先照本包 entries 与词族政策；政策未覆盖之处才用通行译名。确需新造必须加译注说明理由。',
  '一个术语只对应一个译名：一个德文术语只用一个中文译名，一个中文译名也只用于一个德文术语；不把两个不同术语合译成一个词。',
  '反身代词与格：德语第三格 sich 多数是“对自己／为自己”，不是“自己”；es ist / es gibt 常等于“有”，不要一律译成“它是”。',
  '同源可见：同一句里出现同族词（如 Idee 与 Idealität、Sittlichkeit 与 sittlich），中文也要让读者看出其同源关系。',
  '日常义例外：同一词在非体系语境中可保留通用说法（ideal＝理想的、Ideal＝理想、realisieren＝实现），但体系义必须回到词族词根，且例外须记入词表。',
  '自在／自为／自在自为三档不混：an sich＝自在，für sich＝自为，an und für sich＝自在自为；名词形式 Ansichsein＝自在存在、Fürsichsein＝自为存在、Für-ein-Anderes-Sein＝为他存在，全卷统一。',
  '序言核心词固定：Substanz＝实体、Subjekt＝主体（“实体即主体”Substanz als Subjekt）；das Wahre＝真的东西（“Das Wahre ist das Ganze”＝真的东西就是整体）；das Ganze＝整体，与 Totalität（总体性）分开。',
  '外化与异化严格分开：Entäußerung／entäußern＝外化，Entfremdung／entfremdet＝异化（der sich entfremdete Geist＝自身异化了的精神）；Bildung＝教养，不作“教育”（Erziehung）。',
  '假象与现象分开：Erscheinung＝现象，Schein＝假象；erscheinendes Wissen＝显现着的知识；Erscheinung 与 Wesen（本质）对举。',
  '扬弃全卷统一：Aufhebung／aufheben 一律“扬弃”，严禁拆成“取消＋保存”两个词并列解释。',
  '中介与直接性成对：Vermittlung＝中介，Unmittelbarkeit＝直接性；不得用“媒介化”“间接性”另立译名。',
  '第一章（感性确定性）词面固定：sinnliche Gewißheit＝感性确定性，das Diese＝这一个，Meinen＝意谓，Jetzt＝这时，Hier＝这里；das Sinnliche＝感性之物，与 das Übersinnliche（超感性之物）对举。',
  '第二、三章词面固定：Wahrnehmung＝知觉（不作“感知”），Ding＝物，Täuschung＝错觉（标题“物与错觉”），Kraft＝力（标题“力与知性”），Gesetz＝规律（道德语境作“法则”，仅成文法才作“法律”），übersinnliche Welt＝超感性世界，Verstand＝知性。',
  '第四章（自我意识）词面固定：Begierde＝欲望，Anerkennen＝承认，Herr／Knecht＝主人／奴隶（Herrschaft und Knechtschaft＝主人与奴隶），unglückliches Bewußtsein＝苦恼意识，Stoizismus＝斯多葛主义，Skeptizismus＝怀疑论。',
  '第五章（理性）词面固定：beobachtende Vernunft＝观察的理性，Physiognomik＝面相学，Schädellehre＝颅相学，Gesetz des Herzens＝心的规律，Eigendünkel＝自负，Tugend＝德行，Weltlauf＝世界进程，geistiges Tierreich＝精神动物王国，Sache selbst＝事情本身。',
  '第六章（精神）词面固定：Sittlichkeit＝伦理，Moralität＝道德，两者严格分开；Schuld＝罪过，Schicksal＝命运，Rechtszustand＝法权状态，Gewissen＝良心，schöne Seele＝美的灵魂，Verzeihung＝宽恕，Verstellung＝伪装，Aufklärung＝启蒙，reine Einsicht＝纯粹识见。',
  '第七、八章（宗教与绝对知识）词面固定：offenbare Religion＝天启宗教（不作“启示宗教”），Kunstreligion＝艺术宗教，Gemeinde＝教团，Andacht＝虔诚，Innerlichkeit＝内在性；absolutes Wissen＝绝对知识，Erinnerung＝回忆（与 Gedächtnis 记忆分开）。',
  '人名、地名、书名用通行中译，首次出现可附原文；希腊语、拉丁语（Horos、a priori）和缩写（S.、Bd.、vgl.、Hrsg.、u. ö.）照抄原文，必要时在括注里给中文。',
  '分级符号与公式形式（α)、β)、γ)、a)、b)、c)、A = A、Ich = Ich、Ich, das Wir, und Wir, das Ich）原样保留，不译不动，便于三栏逐句联动。',
  '主宾与格关系逐句核对：德语长句里分句的主语常发生切换，必须显式处理，不得让前后分句的主语颠倒或含糊；指代不清时重复名词，不让读者做二次解读。',
];

/* ------------------------------------------------------------------- entries */
// [source, en, zh, type, note]
const E = [
  // ---- 词族政策（systematic family members：译名不得与 glossary/hegel_families.csv 冲突）
  ['Idee', 'idea', '观念', 'term', '政策：词族 Idee 的词根是“观念”，严禁“理念”'],
  ['ideell', 'ideal (of ideality)', '观念的', 'term', '与 reell（实在的）对举；政策：严禁“理想的”'],
  ['das Ideelle', 'the ideal element', '观念物', 'term', '与 das Reelle（实在物）对举；亦作“观念的东西”'],
  ['Idealität', 'ideality', '观念性', 'term', '与 Realität（实在性）对举'],
  ['idealisieren', 'to idealize', '观念化', 'term', '日常义“使理想化”仅限非体系语境'],
  ['Idealismus', 'idealism', '观念论', 'term', '政策：严禁“唯心主义”；书名同此（《先验观念论体系》）'],
  ['idealistisch', 'idealistic', '观念论的', 'term', '政策：严禁“唯心的”'],
  ['Idealrealismus', 'ideal-realism', '观念实在论', 'term', '黑格尔自造词；句中出现极少'],
  ['Realität', 'reality', '实在性', 'term', '与 Idealität（观念性）对举；严禁“现实性”'],
  ['real', 'real', '实在的', 'term', '与 ideell（观念的）对举'],
  ['das Reelle', 'the real element', '实在物', 'term', '与 das Ideelle（观念物）对举'],
  ['Realismus', 'realism', '实在论', 'term', '与 Idealismus（观念论）对举；严禁“现实主义”'],
  ['Begriff', 'concept', '概念', 'term', '与 Vorstellung（表象）、Anschauung（直观）区分；严禁用“观念”'],
  ['begreifen', 'to comprehend', '以概念把握', 'term', '体系义须含“概念”；非体系语境的日常义才可作“领会”'],
  ['begrifflich', 'conceptual', '概念性的', 'term', '亦可作“概念的”'],
  ['begrifflos', 'concept-less', '无概念的', 'term', '严禁“无观念的”'],
  ['Vorstellung', 'representation', '表象', 'term', '政策：严禁用“观念”译 Vorstellung（该词根留给 Idee 族）'],
  ['vorgestellt', 'represented', '被表象的', 'term', '同上'],
  ['Geist', 'spirit', '精神', 'term', '与 Seele（灵魂）、Bewußtsein（意识）区分；不作“心灵”'],
  ['geistig', 'spiritual', '精神的', 'term', ''],
  ['geistlos', 'spirit-less', '无精神的', 'term', ''],
  ['Wissen', 'knowing / knowledge', '知识', 'term', '名词义作“知识”，活动义可作“知”；与 Erkenntnis（认识）分开'],
  ['absolutes Wissen', 'absolute knowing', '绝对知识', 'term', '第八章标题；begreifendes Wissen 作“以概念把握的知识”'],
  ['Wahrheit', 'truth', '真理', 'term', '与 Gewißheit（确定性）对举'],
  ['wahr', 'true', '真的', 'term', ''],
  ['wahrhaft', 'true, genuine', '真正的', 'term', '与 wirklich（现实的）区分'],
  ['Wirklichkeit', 'actuality', '现实性', 'term', '与 Realität（实在性）、Möglichkeit（可能性）、Notwendigkeit（必然性）并列'],
  ['wirklich', 'actual', '现实的', 'term', '与 real／reell（实在的）严格分开'],

  // ---- 序言／导论
  ['Vorrede', 'preface', '序言', 'term', ''],
  ['Einleitung', 'introduction', '导论', 'term', '通行作“导论”'],
  ['das Wahre', 'the true', '真的东西', 'term', '“Das Wahre ist das Ganze”＝真的东西就是整体'],
  ['das Ganze', 'the whole', '整体', 'term', '与 Totalität（总体性）分开'],
  ['Substanz', 'substance', '实体', 'term', '“实体即主体”（Substanz als Subjekt）'],
  ['Subjekt', 'subject', '主体', 'term', '与 subjektiv（主观的）严格分开'],
  ['das Ansich', 'the in-itself', '自在', 'term', '名词形式；副词 an sich 同根'],
  ['Ansichsein', 'being-in-itself', '自在存在', 'term', '与 Fürsichsein（自为存在）对举'],
  ['Fürsichsein', 'being-for-itself', '自为存在', 'term', ''],
  ['an und für sich', 'in and for itself', '自在自为', 'term', '三档：自在／自为／自在自为'],
  ['Für-ein-Anderes-Sein', 'being-for-another', '为他存在', 'term', '与自在存在、自为存在并列'],
  ['Anderssein', 'otherness', '他在', 'term', '亦作“异在”；全卷统一“他在”'],
  ['Aufhebung', 'sublation', '扬弃', 'term', '全卷统一；严禁拆成“取消＋保存”'],
  ['aufheben', 'to sublate', '扬弃', 'term', ''],
  ['Vermittlung', 'mediation', '中介', 'term', '与 Unmittelbarkeit（直接性）成对；不作“媒介化”'],
  ['Unmittelbarkeit', 'immediacy', '直接性', 'term', ''],
  ['unmittelbar', 'immediate', '直接的', 'term', ''],
  ['Entäußerung', 'externalization', '外化', 'term', '与 Entfremdung（异化）严格分开'],
  ['entäußern', 'to externalize', '外化', 'term', ''],
  ['Entfremdung', 'estrangement', '异化', 'term', '与 Entäußerung（外化）严格分开'],
  ['entfremdet', 'estranged', '异化了的', 'term', 'der sich entfremdete Geist＝自身异化了的精神'],
  ['Bildung', 'formation, culture', '教养', 'term', '不作“教育”（Erziehung）'],
  ['Gestalt', 'shape', '形态', 'term', 'Gestalt des Bewußtseins＝意识的形态'],
  ['Erscheinung', 'appearance', '现象', 'term', '与 Schein（假象）分开'],
  ['erscheinend', 'appearing', '显现着的', 'term', 'erscheinendes Wissen＝显现着的知识'],
  ['Schein', 'semblance', '假象', 'term', '与 Erscheinung（现象）分开'],
  ['Wesen', 'essence', '本质', 'term', '与 Erscheinung（现象）对举'],
  ['Dasein', 'determinate being', '定在', 'term', '与 Existenz（存在）严格分开；全卷统一“定在”'],
  ['Existenz', 'existence', '存在', 'term', '与 Dasein（定在）分开；不作“实存”'],
  ['das Sein', 'being', '存在', 'term', '与 das Seiende（存在者）分开'],
  ['das Sinnliche', 'the sensuous', '感性之物', 'term', '与 das Übersinnliche（超感性之物）对举'],
  ['sinnlich', 'sensuous', '感性的', 'term', '不作“感官的”'],
  ['übersinnliche Welt', 'supersensuous world', '超感性世界', 'term', '第三章标题'],
  ['Erfahrung', 'experience', '经验', 'term', '导论：辩证运动即“经验”'],
  ['Maßstab', 'standard', '尺度', 'term', '全卷统一“尺度”；不作“标准”'],
  ['Verzweiflung', 'despair', '绝望', 'term', 'Weg der Verzweiflung＝绝望之路'],
  ['bestimmte Negation', 'determinate negation', '特定的否定', 'term', '通行译名'],
  ['Negativität', 'negativity', '否定性', 'term', ''],
  ['Widerspruch', 'contradiction', '矛盾', 'term', ''],
  ['Gegensatz', 'opposition', '对立', 'term', ''],
  ['Unterschied', 'difference', '差别', 'term', ''],
  ['Moment', 'moment', '环节', 'term', '严禁“时刻”；黑格尔的 Moment 是整体的环节'],
  ['Dialektik', 'dialectic', '辩证法', 'term', ''],
  ['Reflexion', 'reflection', '反思', 'term', '哲学义作“反思”；不作“反映”'],
  ['Bestimmtheit', 'determinacy', '规定性', 'term', '与 Gewißheit（确定性）分开'],
  ['Gewißheit', 'certainty', '确定性', 'term', '与 Bestimmtheit（规定性）分开'],
  ['Erkenntnis', 'cognition', '认识', 'term', '与 Wissen（知识）分开'],
  ['Erinnerung', 'recollection', '回忆', 'term', '末句与 Schädelstätte（骷髅地）并出；与 Gedächtnis（记忆）分开'],
  ['Schädelstätte', 'place of skulls', '骷髅地', 'place', '全书末句“……构成绝对精神的回忆和骷髅地”；典出各各他 Golgatha'],

  // ---- 第一章 感性确定性
  ['sinnliche Gewißheit', 'sense-certainty', '感性确定性', 'term', '第一章标题'],
  ['das Diese', 'the “this”', '这一个', 'term', '通行作“这一个”'],
  ['Meinen', 'meaning, opinion', '意谓', 'term', '通行作“意谓”；不作“意指”'],
  ['Jetzt', 'now', '这时', 'term', '通行作“这时”'],
  ['Hier', 'here', '这里', 'term', '通行作“这里”'],

  // ---- 第二章／第三章
  ['Wahrnehmung', 'perception', '知觉', 'term', '第二章标题；全卷统一，不作“感知”'],
  ['Ding', 'thing', '物', 'term', 'das Ding der Wahrnehmung＝知觉的物'],
  ['Täuschung', 'deception', '错觉', 'term', '标题“物与错觉”'],
  ['Kraft', 'force', '力', 'term', '第三章标题“力与知性”；不作“力量”'],
  ['Äußerung', 'expression', '表现', 'term', '与 Entäußerung（外化）严格分开'],
  ['Gesetz', 'law', '规律', 'term', '本卷多指“规律”；道德语境作“法则”，仅成文法作“法律”'],
  ['Verstand', 'understanding', '知性', 'term', '严禁“理智”；与 Vernunft（理性）分开'],

  // ---- 第四章 自我意识
  ['Bewußtsein', 'consciousness', '意识', 'term', '与 Selbstbewußtsein（自我意识）、Geist（精神）区分'],
  ['Selbstbewußtsein', 'self-consciousness', '自我意识', 'term', ''],
  ['Gegenstand', 'object', '对象', 'term', '与 Objekt（客体）分开；不作“客体”'],
  ['Objekt', 'object (set over against)', '客体', 'term', '与 Gegenstand（对象）分开；objektiv 作“客观的”'],
  ['Begierde', 'desire', '欲望', 'term', '不作“贪欲”'],
  ['Leben', 'life', '生命', 'term', ''],
  ['Anerkennen', 'to recognize', '承认', 'term', 'Bewegung des Anerkennens＝承认的运动'],
  ['Selbständigkeit', 'independence', '独立性', 'term', '标题“自我意识的独立性”'],
  ['Herr', 'master', '主人', 'term', 'Herrschaft und Knechtschaft＝主人与奴隶'],
  ['Knecht', 'slave', '奴隶', 'term', ''],
  ['Herrschaft und Knechtschaft', 'lordship and bondage', '主人与奴隶', 'term', '全卷统一；不作“统治与奴役”'],
  ['Stoizismus', 'stoicism', '斯多葛主义', 'term', ''],
  ['Skeptizismus', 'scepticism', '怀疑论', 'term', ''],
  ['unglückliches Bewußtsein', 'unhappy consciousness', '苦恼意识', 'term', '全卷统一；不作“不幸的意识”'],

  // ---- 第五章 理性
  ['Vernunft', 'reason', '理性', 'term', '与 Verstand（知性）严格分开'],
  ['beobachtende Vernunft', 'observing reason', '观察的理性', 'term', '第五章 A'],
  ['Physiognomik', 'physiognomy', '面相学', 'term', '第五章 c'],
  ['Schädellehre', 'phrenology', '颅相学', 'term', '第五章 c'],
  ['Individualität', 'individuality', '个体性', 'term', ''],
  ['Lust', 'pleasure', '快乐', 'term', '标题“快乐与必然性”'],
  ['Gesetz des Herzens', 'law of the heart', '心的规律', 'term', '标题“心的规律与自负的疯狂”'],
  ['Eigendünkel', 'self-conceit', '自负', 'term', ''],
  ['Tugend', 'virtue', '德行', 'term', '本卷通行“德行”；不作“美德”'],
  ['Weltlauf', 'course of the world', '世界进程', 'term', '标题“德行与世界进程”'],
  ['geistiges Tierreich', 'spiritual animal kingdom', '精神动物王国', 'term', '第五章 a'],
  ['Sache selbst', 'the matter itself', '事情本身', 'term', '不作“物自身”（Ding an sich）'],
  ['gesetzgebende Vernunft', 'law-giving reason', '立法的理性', 'term', '第五章 b'],
  ['gesetzprüfende Vernunft', 'law-testing reason', '审查法则的理性', 'term', '第五章 c'],

  // ---- 第六章 精神
  ['Sittlichkeit', 'ethical life', '伦理', 'term', '与 Moralität（道德）严格分开'],
  ['Schuld', 'guilt', '罪过', 'term', '标题“罪过与命运”；法律语境可作“债务”'],
  ['Schicksal', 'fate', '命运', 'term', ''],
  ['Rechtszustand', 'legal condition', '法权状态', 'term', '通行“法权状态”'],
  ['Gemeinwesen', 'commonwealth', '共同体', 'term', ''],
  ['Person', 'person', '人格', 'term', '法权义作“人格”；“个人”留给 Individuum'],
  ['Individuum', 'individual', '个体', 'term', ''],
  ['Pflicht', 'duty', '义务', 'term', ''],
  ['Gewissen', 'conscience', '良心', 'term', ''],
  ['schöne Seele', 'beautiful soul', '美的灵魂', 'term', '第六章 C'],
  ['Verzeihung', 'forgiveness', '宽恕', 'term', ''],
  ['Böse', 'evil', '恶', 'term', '与 das Gute（善）对举'],
  ['Verstellung', 'dissemblance', '伪装', 'term', '标题“伪装”；不作“颠倒”'],
  ['Moralität', 'morality', '道德', 'term', '与 Sittlichkeit（伦理）严格分开'],
  ['moralische Weltanschauung', 'moral world-view', '道德世界观', 'term', '第六章 C'],
  ['Aufklärung', 'enlightenment', '启蒙', 'term', '第六章 B II'],
  ['Aberglaube', 'superstition', '迷信', 'term', ''],
  ['Glaube', 'faith', '信仰', 'term', ''],
  ['reine Einsicht', 'pure insight', '纯粹识见', 'term', '通行“纯粹识见”'],
  ['absolute Freiheit', 'absolute freedom', '绝对自由', 'term', '第六章 B III'],
  ['Schrecken', 'terror', '恐怖', 'term', '标题“绝对自由与恐怖”'],

  // ---- 第七章 宗教
  ['Religion', 'religion', '宗教', 'term', ''],
  ['natürliche Religion', 'natural religion', '自然宗教', 'term', '第七章 A'],
  ['Lichtwesen', 'being of light', '光明本质', 'term', '通行亦作“光明之神”'],
  ['Werkmeister', 'artificer', '工匠', 'term', '第七章 A c'],
  ['Kunstreligion', 'art-religion', '艺术宗教', 'term', '第七章 B'],
  ['offenbare Religion', 'revealed religion', '天启宗教', 'term', '通行“天启宗教”；不作“启示宗教”'],
  ['Gemeinde', 'community', '教团', 'term', '宗教语境作“教团”'],
  ['Andacht', 'devotion', '虔诚', 'term', ''],
  ['Innerlichkeit', 'inwardness', '内在性', 'term', '第七章'],

  // ---- 人物／作品／地名
  ['Kant', 'Kant', '康德', 'person', ''],
  ['Fichte', 'Fichte', '费希特', 'person', ''],
  ['Schelling', 'Schelling', '谢林', 'person', ''],
  ['Platon', 'Plato', '柏拉图', 'person', ''],
  ['Aristoteles', 'Aristotle', '亚里士多德', 'person', ''],
  ['Sophokles', 'Sophocles', '索福克勒斯', 'person', ''],
  ['Goethe', 'Goethe', '歌德', 'person', ''],
  ['Antigone', 'Antigone', '安提戈涅', 'person', '索福克勒斯悲剧人物；剧名作《安提戈涅》'],
  ['Phänomenologie des Geistes', 'Phenomenology of Spirit', '《精神现象学》', 'work', '本卷即此书的 Suhrkamp 版'],
  ['Wissenschaft der Logik', 'Science of Logic', '《逻辑学》', 'work', '全称《逻辑学》，不作“逻辑科学”'],
  ['System des transzendentalen Idealismus', 'System of Transcendental Idealism', '《先验观念论体系》', 'work', '政策：Idealismus 作“观念论”'],
];

/* --------------------------------------------------------------- forbidden */
// [source, forbidden, prefer, why]
const F = [
  ['Idee', '理念', '观念', '政策：词族一致的词根是“观念”，严禁“理念”'],
  ['Idealismus', '唯心主义', '观念论', '政策：严禁“唯心主义”；书名《先验观念论体系》同此'],
  ['idealistisch', '唯心的', '观念论的', '政策：严禁“唯心的”'],
  ['Idealität', '理想性', '观念性', '“理想”留给 Ideal；词族词根为“观念”'],
  ['Ideal', '观念', '理想', '日常／美学义作“理想”；体系义才回 Idee 族，例外须记入词表'],
  ['Realität', '现实性', '实在性', '与 Wirklichkeit（现实性）严格分开'],
  ['Realismus', '现实主义', '实在论', '与 Idealismus（观念论）对举；严禁“现实主义”'],
  ['das Reelle', '现实的', '实在物', '与 das Ideelle（观念物）对举'],
  ['ideell', '理想的', '观念的', '与 Ideal（理想）分开；ideell 是观念性的'],
  ['reell', '现实的', '实在的', '与 wirklich（现实的）严格分开'],
  ['Begriff', '观念', '概念', '“观念”留给 Idee 家族'],
  ['Vorstellung', '观念', '表象', '政策：严禁用“观念”译 Vorstellung'],
  ['vorgestellt', '观念的', '被表象的', '同上'],
  ['Wirklichkeit', '实在性', '现实性', '与 Realität（实在性）分开'],
  ['wirklich', '实在的', '现实的', '与 real／reell（实在的）分开'],
  ['wahrhaft', '真实的', '真正的', '词族 Wahrheit（词根：真）；wahrhaft 作“真正的”'],
  ['Dasein', '存在', '定在', '与 Existenz（存在）严格分开；凡 Dasein 一律“定在”'],
  ['Existenz', '实存', '存在', '与 Dasein（定在）分开'],
  ['Schein', '现象', '假象', '与 Erscheinung（现象）分开'],
  ['Erscheinung', '假象', '现象', '与 Schein（假象）分开'],
  ['Bestimmtheit', '确定性', '规定性', '“确定性”留给 Gewißheit'],
  ['Gewißheit', '规定性', '确定性', '与 Bestimmtheit（规定性）分开'],
  ['Erkenntnis', '知识', '认识', '“知识”留给 Wissen'],
  ['Sittlichkeit', '道德', '伦理', '与 Moralität（道德）严格分开'],
  ['Moralität', '伦理', '道德', '与 Sittlichkeit（伦理）严格分开'],
  ['Verstand', '理智', '知性', '全卷统一“知性”'],
  ['Aufhebung', '取消', '扬弃', '全卷统一“扬弃”；严禁拆成“取消＋保存”'],
  ['Entfremdung', '外化', '异化', '“外化”留给 Entäußerung'],
  ['Entäußerung', '异化', '外化', '“异化”留给 Entfremdung'],
  ['Bildung', '教育', '教养', '“教育”留给 Erziehung'],
  ['Täuschung', '欺骗', '错觉', '第二章标题作“物与错觉”'],
  ['Wahrnehmung', '感知', '知觉', '全卷统一“知觉”'],
  ['Moment', '时刻', '环节', '黑格尔的 Moment 指整体的环节，不是时间上的时刻'],
  ['Kraft', '力量', '力', '第三章标题作“力与知性”'],
  ['Gesetz', '法律', '规律', '本卷 Gesetz 多指“规律”；道德语境作“法则”，仅成文法作“法律”'],
  ['unglückliches Bewußtsein', '不幸的意识', '苦恼意识', '全卷统一“苦恼意识”'],
  ['Herrschaft und Knechtschaft', '统治与奴役', '主人与奴隶', '全卷统一“主人与奴隶”'],
  ['Sache selbst', '物自身', '事情本身', '“物自身”留给 Ding an sich'],
  ['offenbare Religion', '启示宗教', '天启宗教', '通行作“天启宗教”'],
  ['Reflexion', '反映', '反思', '哲学义作“反思”'],
  ['Verstellung', '颠倒', '伪装', '标题作“伪装”'],
  ['Tugend', '美德', '德行', '本卷通行“德行”'],
  ['Subjekt', '主观', '主体', '与 subjektiv（主观的）严格分开'],
  ['Anschauung', '直觉', '直观', '全卷统一“直观”'],
  ['Geist', '心灵', '精神', '全卷统一“精神”；“心灵”留给 Seele 一系说法'],
  ['das Diese', '这个', '这一个', '第一章通行作“这一个”'],
  ['Meinen', '意指', '意谓', '第一章通行作“意谓”'],
  ['sinnlich', '感官的', '感性的', '全卷统一“感性的”'],
];

const doNotTranslate = [
  'a priori',
  'Horos',
  'A = A',
  'Ich = Ich',
  'Ich, das Wir, und Wir, das Ich',
  'α)',
  'β)',
  'γ)',
  'a)',
  'b)',
  'c)',
  'S.',
  'Bd.',
  'vgl.',
  'Hrsg.',
  'hg. von',
  'u. ö.',
];

/* ------------------------------------------------------------------- status */
const VARIANTE = new Set([
  'das Ideelle', 'Idealität', 'idealisieren', 'begreifen', 'vorgestellt', 'Wissen', 'wahrhaft', 'das Sein',
  'das Sinnliche', 'Maßstab', 'Erscheinung', 'erscheinend', 'Wesen', 'entfremdet', 'Bildung', 'Gestalt',
  'Ding', 'Äußerung', 'Gesetz', 'Anerkennen', 'Kraft', 'Eigendünkel', 'Tugend', 'Weltlauf', 'Sache selbst',
  'Person', 'Individuum', 'Gewissen', 'Verzeihung', 'Verstellung', 'reine Einsicht', 'Gemeinde', 'Andacht',
  'Erinnerung', 'Schuld', 'sittlich', 'Bestimmtheit', 'Gewißheit',
]);
const UNSICHER = new Set([
  'Idealrealismus', 'Lichtwesen', 'Werkmeister', 'Schädelstätte', 'gesetzprüfende Vernunft',
  'Individualität', 'Wahrnehmung', 'Meinen', 'Gemeinwesen',
]);
const statusOf = (s) => (UNSICHER.has(s) ? 'unsicher' : VARIANTE.has(s) ? 'variante' : 'ok');

/* --------------------------------------------------------------------- emit */
const pkg = {
  volume: 'w3',
  styleGuide,
  entries: E.map(([source, en, zh, type, note]) => ({ source, en, zh, type, note: note || '' })),
  forbidden: F.map(([source, forbidden, prefer, why]) => ({ source, forbidden, prefer, why })),
  doNotTranslate,
};

if (pkg.entries.length > 160) throw new Error(`too many entries: ${pkg.entries.length} (cap 160)`);
const dupes = pkg.entries.map((e) => e.source).filter((s, i, a) => a.indexOf(s) !== i);
if (dupes.length) throw new Error('duplicate entry sources: ' + dupes.join(', '));

fs.writeFileSync('data/_jobs/context-w3.json', JSON.stringify(pkg, null, 1) + '\n', 'utf8');

const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const rows = pkg.entries.map((e) => [e.source, e.en, e.zh, statusOf(e.source), e.note].map(esc).join(','));
const csv = ['de,en,zh,status,note', ...rows].join('\n') + '\n';
fs.writeFileSync('data/_jobs/ctx-w3.glossar.csv', csv, 'utf8');

console.log(`entries: ${pkg.entries.length}`);
console.log(`forbidden: ${pkg.forbidden.length}`);
console.log(`doNotTranslate: ${pkg.doNotTranslate.length}`);
console.log(`styleGuide: ${pkg.styleGuide.length}`);
console.log(`csv rows: ${rows.length}`);
const byType = {};
for (const e of pkg.entries) byType[e.type] = (byType[e.type] || 0) + 1;
console.log('by type:', JSON.stringify(byType));
const st = {};
for (const e of pkg.entries) st[statusOf(e.source)] = (st[statusOf(e.source)] || 0) + 1;
console.log('by status:', JSON.stringify(st));
