import * as XLSX from 'xlsx'
import type { Question } from '@/api/exam'

/**
 * 题库 Excel 批量导入工具
 * 模板结构（downloadQuestionTemplate）：
 *   Sheet1「题目填写」= 表头(第1行) + 17 个示例行(第2-18行，题干以【示例】开头，导入时自动跳过)
 *   Sheet2「填写规则」= 总体规则 + 逐格规则 + 案例索引
 * 模板列(表头):
 *   分类 | 题型 | 题干 | 选项A | 选项B | ... | 选项H | 答案 | 解析 | 分值 | 判分模式 | 题干图片
 * 说明:
 *   - 分类: 主分类名称, 可空(使用导入弹窗选择的目标分类)
 *   - 题型: single=单选 / multiple=多选 / judge=判断 (兼容中文 单选/多选/判断)
 *   - 判断题仅需「题干」「答案」(正确/错误), 选项列留空, 系统自动生成 正确/错误 两道选项
 *   - 答案: 单选填字母如 A; 多选用逗号分隔如 A,C; 判断填 正确/错误
 *   - 判分模式: exact=全对得分 / partial=多选漏选给分, 缺省 exact
 *   - 题干图片: 图片URL(可选, 支持 /uploads 或 http(s) 链接)
 */

const VALID_TYPES = new Set(['single', 'multiple', 'judge'])
const VALID_TYPE_LABELS: Record<string, string> = { single: 'single', multiple: 'multiple', judge: 'judge', 单选: 'single', 多选: 'multiple', 判断: 'judge' }
const QUESTION_COL_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export interface ParsePreview {
  /** 有效行(可导入) */
  rows: Question[]
  /** 错误行明细：row(Excel行号, 从1算数据行) + reason */
  errors: { row: number; reason: string }[]
  /** 总数据行数(去空行) */
  total: number
  /** 自动跳过的示例行数(题干以【示例】开头) */
  skippedSamples: number
  /** 识别到的原始表头 */
  header: string[]
}

/** 模板表头(第一行) */
const TEMPLATE_HEADER = [
  '分类', '题型', '题干',
  '选项A', '选项B', '选项C', '选项D', '选项E', '选项F', '选项G', '选项H',
  '答案', '解析', '分值', '判分模式', '题干图片',
]

/**
 * 模板示例行集(第二行起), 覆盖三种题型 + 边界与错误情况共 17 例。
 * 所有行题干以【示例】开头 → 导入时自动跳过（含错误示范行），仅作填写参考。
 * 列序与表头一致：分类/题型/题干/选项A~H/答案/解析/分值/判分模式/题干图片
 */
const TEMPLATE_SAMPLES: (string | number)[][] = [
  // 1 单选·标准写法
  ['低压电工', 'single', '【示例】单选标准写法：答案填单个选项字母', '40Hz', '50Hz', '60Hz', '100Hz', '', '', '', '', 'B', '示例1：单选答案=选项字母', 2, 'exact', ''],
  // 2 题型·中文写法
  ['低压电工', '单选', '【示例】题型支持中文「单选」', '选项一', '选项二', '', '', '', '', '', '', 'A', '示例2：题型兼容 单选/多选/判断', '', '', ''],
  // 3 多选·标准写法
  ['低压电工', 'multiple', '【示例】多选标准写法：答案用英文逗号分隔多个字母', '红色', '蓝色', '绿色', '黄色', '白色', '', '', '', 'A,B,C,D', '示例3：多选答案≥2个字母', 2, 'exact', ''],
  // 4 多选·partial 部分判分
  ['低压电工', 'multiple', '【示例】多选+部分判分（漏选给一半分）', '正确', '错误', '不确定', '', '', '', '', '', 'A,B', '示例4：判分模式填 partial', 3, 'partial', ''],
  // 5 判断·答案=正确
  ['低压电工', 'judge', '【示例】判断题：选项列全部留空，系统自动生成「正确/错误」', '', '', '', '', '', '', '', '', '正确', '示例5：判断答案写 正确 或 错误', 2, 'exact', ''],
  // 6 判断·答案=错误 + 中文题型
  ['低压电工', '判断', '【示例】判断题答案也可写「错误」', '', '', '', '', '', '', '', '', '错误', '示例6：判断中文题型写法', '', '', ''],
  // 7 分类留空
  ['', 'single', '【示例】分类留空：使用导入弹窗选择的「目标分类」', '选项一', '选项二', '', '', '', '', '', '', 'A', '示例7：分类可空→用弹窗目标分类', 2, 'exact', ''],
  // 8 分值留空
  ['低压电工', 'single', '【示例】分值留空：默认 2 分', '选项一', '选项二', '', '', '', '', '', '', 'A', '示例8：分值可空→默认2', '', '', ''],
  // 9 题干图片
  ['低压电工', 'single', '【示例】题干图片：最后一列填图片 URL', '选项一', '选项二', '', '', '', '', '', '', 'A', '示例9：支持 /uploads 或 http(s) 链接', 2, 'exact', 'https://example.com/q.png'],
  // 10 错误①题型非法
  ['低压电工', '填空', '【示例】错误示范①：题型填「填空」→ 报「题型无效」', '选项一', '选项二', '', '', '', '', '', '', 'A', '错误①：题型仅 3 种', 2, 'exact', ''],
  // 11 错误②答案不在选项内
  ['低压电工', 'single', '【示例】错误示范②：答案 C 不在已填选项(A/B)内 → 报「答案不在选项范围」', '选项一', '选项二', '', '', '', '', '', '', 'C', '错误②：答案须在已填选项内', 2, 'exact', ''],
  // 12 错误③选项不足 2 个
  ['低压电工', 'single', '【示例】错误示范③：选项只填 1 个 → 报「至少需要2个有效选项」', '只有一个选项', '', '', '', '', '', '', '', 'A', '错误③：选项≥2', 2, 'exact', ''],
  // 13 错误④多选答案只有 1 个
  ['低压电工', 'multiple', '【示例】错误示范④：多选题答案只填 1 个字母 → 报「多选题答案至少2个选项」', '选项一', '选项二', '选项三', '', '', '', '', '', 'A', '错误④：多选答案≥2', 2, 'exact', ''],
  // 14 错误⑤判断题答案写字母
  ['低压电工', 'judge', '【示例】错误示范⑤：判断题答案填字母 → 报「判断题答案须为 正确/错误」', '', '', '', '', '', '', '', '', 'A', '错误⑤：判断答案用中文', 2, 'exact', ''],
  // 15 错误⑥分类不存在
  ['不存在的分类', 'single', '【示例】错误示范⑥：分类名不存在 → 报「分类不存在」', '选项一', '选项二', '', '', '', '', '', '', 'A', '错误⑥：分类须已存在', 2, 'exact', ''],
  // 16 错误⑦分值非数字
  ['低压电工', 'single', '【示例】错误示范⑦：分值填「2分」→ 报「分值必须为数字」', '选项一', '选项二', '', '', '', '', '', '', 'A', '错误⑦：分值须为数字', '2分', 'exact', ''],
  // 17 错误⑧答案留空
  ['低压电工', 'single', '【示例】错误示范⑧：答案留空 → 报「答案不能为空」', '选项一', '选项二', '', '', '', '', '', '', '', '错误⑧：答案必填', 2, 'exact', ''],
]

/** 填写规则 sheet：总体规则 + 逐格规则 + 案例索引 */
const RULE_ROWS: (string | number)[][] = [
  ['题库批量导入 — 填写规则说明', '', '', ''],
  ['', '', '', ''],
  ['一、总体规则', '', '', ''],
  ['表头', '第 1 行固定（列名自动识别，兼容无「分类」列的旧模板）', '', ''],
  ['数据行', '从第 2 行开始，每行一道题', '', ''],
  ['示例行', '题干以【示例】开头的行自动跳过（含错误示范行），仅作填写参考、不导入', '', ''],
  ['错误处理', '不合规的行不导入，下载「导入错误明细.csv」查看原因；行号 = Excel 实际行号', '', ''],
  ['分类兜底', '「分类」留空时使用导入弹窗选择的「目标分类」；库中无唯一主分类时后端报「请选择分类」', '', ''],
  ['选项图片', '批量导入暂不支持选项图片；选项图请在 Web 题库编辑中逐题上传', '', ''],
  ['', '', '', ''],
  ['二、逐格规则（每个格子的规则）', '', '', ''],
  ['列名', '必填', '格式/取值', '规则说明'],
  ['分类', '否', '主分类名称文本', '须为已存在的主分类；填了不存在 → 报「分类不存在: 名称」；留空 → 用弹窗目标分类'],
  ['题型', '是', 'single / multiple / judge，兼容中文 单选 / 多选 / 判断', '其他值 → 报「题型无效(须为 single/multiple/judge 或 单选/多选/判断)」'],
  ['题干', '是', '文本', '不能为空；不能以【示例】开头（会被跳过）'],
  ['选项A~H', '条件', '文本，最多 8 个', '单选/多选：至少填 2 个有效选项，可跳空，字母按列位置自动编号(A~H)；判断题：必须留空，系统自动生成「正确/错误」两个选项'],
  ['答案', '是', '单选：1 个字母；多选：字母用英文逗号分隔；判断：正确 或 错误', '字母须都在已填选项内（否则报「答案不在已填选项范围」）；多选至少 2 个字母；自动去空格转大写、大小写不敏感；留空 → 报「答案不能为空」'],
  ['解析', '否', '文本', '可空；展示于答题详情/成绩页'],
  ['分值', '否', '正整数（数字）', '留空默认 2；非数字 → 报「分值必须为数字」；≤0 → 后端报「分值必须为正数」'],
  ['判分模式', '否', 'exact / partial', '留空默认 exact；exact=全对才得分；partial=多选漏选给一半分（仅多选有意义）'],
  ['题干图片', '否', '图片 URL', '支持 /uploads/xxx 或 http(s)://xxx；留空无图'],
  ['', '', '', ''],
  ['三、案例索引（见 Sheet「题目填写」示例行）', '', '', ''],
  ['第2行', '示例1：单选标准写法（答案=单个字母）', '', ''],
  ['第3行', '示例2：题型中文写法（单选/多选/判断）', '', ''],
  ['第4行', '示例3：多选标准写法（答案逗号分隔）', '', ''],
  ['第5行', '示例4：多选 + partial 部分判分', '', ''],
  ['第6行', '示例5：判断题（答案=正确，选项留空）', '', ''],
  ['第7行', '示例6：判断题（答案=错误，中文题型）', '', ''],
  ['第8行', '示例7：分类留空（用弹窗目标分类）', '', ''],
  ['第9行', '示例8：分值留空（默认 2 分）', '', ''],
  ['第10行', '示例9：题干图片 URL', '', ''],
  ['第11行', '错误①：题型非法 → 「题型无效」', '', ''],
  ['第12行', '错误②：答案字母不在选项内 → 「答案不在已填选项范围」', '', ''],
  ['第13行', '错误③：选项不足 2 个 → 「至少需要2个有效选项」', '', ''],
  ['第14行', '错误④：多选答案只有 1 个 → 「多选题答案至少2个选项」', '', ''],
  ['第15行', '错误⑤：判断题答案写字母 → 「判断题答案须为 正确/错误」', '', ''],
  ['第16行', '错误⑥：分类名不存在 → 「分类不存在」', '', ''],
  ['第17行', '错误⑦：分值非数字 → 「分值必须为数字」', '', ''],
  ['第18行', '错误⑧：答案留空 → 「答案不能为空」', '', ''],
]

/**
 * 生成题库导入模板并下载为 .xlsx
 * 结构：Sheet1「题目填写」= 表头 + 17 个示例行(含错误示范)；Sheet2「填写规则」= 逐格规则说明
 * @param fileName - 导出文件名, 缺省为 题库导入模板.xlsx
 */
export function downloadQuestionTemplate(fileName = '题库导入模板.xlsx') {
  const rows: (string | number)[][] = []
  rows.push([...TEMPLATE_HEADER])
  TEMPLATE_SAMPLES.forEach((s) => rows.push([...s]))

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 36 }, { wch: 8 }, { wch: 10 }, { wch: 32 },
  ]
  // 填写规则 sheet
  const wsRules = XLSX.utils.aoa_to_sheet(RULE_ROWS)
  wsRules['!cols'] = [{ wch: 14 }, { wch: 46 }, { wch: 30 }, { wch: 56 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题目填写')
  XLSX.utils.book_append_sheet(wb, wsRules, '填写规则')
  XLSX.writeFile(wb, fileName)
}

/**
 * 按表头动态定位列索引(兼容旧模板: 无「分类」列时整体右移)
 * @param header - 表头数组
 * @returns 各列索引 { category, type, title, optionStart, answer, analysis, score, scoreMode, titleImage }
 */
function resolveColumns(header: string[]) {
  const idx = (name: string) => header.findIndex((h) => h === name)
  const category = idx('分类')
  const type = idx('题型')
  const title = idx('题干')
  const answer = idx('答案')
  const analysis = idx('解析')
  const score = idx('分值')
  const scoreMode = idx('判分模式')
  const titleImage = idx('题干图片')
  // 选项列: 从「选项A」开始连续识别到「选项H」
  let optionStart = -1
  let optionEnd = -1
  for (let i = 0; i < header.length; i++) {
    if (/^选项[A-H]$/.test(header[i])) {
      if (optionStart < 0) optionStart = i
      optionEnd = i
    }
  }
  return { category, type, title, answer, analysis, score, scoreMode, titleImage, optionStart, optionEnd }
}

/**
 * 解析 Excel 文件为可导入题目 + 错误明细
 * @param file - 用户选择的 .xlsx/.xls 文件
 * @param categories - 主分类列表(用于分类名→ID 解析), 可空
 * @returns ParsePreview
 */
export async function parseQuestionWorkbook(file: File, categories: { id: number; name: string }[] = []): Promise<ParsePreview> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return { rows: [], errors: [], total: 0, header: [], skippedSamples: 0 }

  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as (string | number)[][]
  if (!matrix.length) return { rows: [], errors: [], total: 0, header: [], skippedSamples: 0 }

  const header = (matrix[0] || []).map((h) => String(h).trim())
  const col = resolveColumns(header)
  const nameToId = new Map<string, number>()
  categories.forEach((c) => { nameToId.set(c.name.trim(), c.id) })

  const errors: { row: number; reason: string }[] = []
  const rows: Question[] = []
  let total = 0
  let skippedSamples = 0

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || []
    if (line.every((c) => c === '' || c == null)) continue
    const excelRow = i + 1 // Excel 中表头占第1行, 数据行号 = i+1
    const cell = (c: number) => (c >= 0 ? String(line[c] ?? '').trim() : '')
    const title = cell(col.title)

    // 示例行(题干以【示例】开头)自动跳过, 不校验不导入
    if (title.startsWith('【示例】')) { skippedSamples++; continue }

    total++
    const pushErr = (reason: string) => errors.push({ row: excelRow, reason })
    const typeRaw = cell(col.type).toLowerCase()
    const type = VALID_TYPE_LABELS[typeRaw] || (VALID_TYPES.has(typeRaw) ? typeRaw : '')
    if (!type) { pushErr('题型无效(须为 single/multiple/judge 或 单选/多选/判断)'); continue }
    if (!title) { pushErr('题干不能为空'); continue }

    // 分类: 名称→ID, 可空(由导入弹窗目标分类兜底)
    let categoryId: number | undefined
    const categoryName = cell(col.category)
    if (categoryName) {
      const id = nameToId.get(categoryName)
      if (id == null) { pushErr('分类不存在: ' + categoryName); continue }
      categoryId = id
    }

    const rawScore = cell(col.score)
    const score = rawScore === '' ? 2 : Number(rawScore)
    if (rawScore !== '' && Number.isNaN(score)) { pushErr('分值必须为数字'); continue }
    const scoreMode = (cell(col.scoreMode) || 'exact').toLowerCase() || 'exact'
    if (!['exact', 'partial'].includes(scoreMode)) { pushErr('判分模式无效(须为 exact/partial)'); continue }

    const answerRaw = cell(col.answer)
    if (!answerRaw) { pushErr('答案不能为空'); continue }
    const answer = answerRaw.replace(/\s+/g, '').toUpperCase()

    const titleImage = cell(col.titleImage) || undefined

    // 判断题: 自动生成 正确/错误 两个选项
    if (type === 'judge') {
      if (!['正确', '错误'].includes(answer)) { pushErr('判断题答案须为 正确/错误'); continue }
      rows.push({
        type, title, answer, categoryId,
        options: [
          { key: '正确', text: '正确' },
          { key: '错误', text: '错误' },
        ],
        score, scoreMode, analysis: cell(col.analysis) || undefined, titleImage,
      } as Question)
      continue
    }

    // 单选/多选: 收集选项
    const options: { key: string; text: string }[] = []
    if (col.optionStart >= 0) {
      for (let c = col.optionStart; c <= col.optionEnd; c++) {
        const text = String(line[c] ?? '').trim()
        if (text) options.push({ key: QUESTION_COL_KEYS[c - col.optionStart], text })
      }
    }
    if (options.length < 2) { pushErr('至少需要2个有效选项'); continue }

    // 校验答案字母是否都在已填选项内
    const validKeys = new Set(options.map((o) => o.key))
    const answerKeys = answer.split(',')
    if (answerKeys.some((k) => !validKeys.has(k))) {
      pushErr('答案字母 "' + answer + '" 不在已填选项范围')
      continue
    }
    if (type === 'multiple' && answerKeys.length < 2) { pushErr('多选题答案至少2个选项'); continue }

    rows.push({
      type, title, answer, categoryId,
      options,
      score, scoreMode, analysis: cell(col.analysis) || undefined, titleImage,
    } as Question)
  }

  return { rows, errors, total, header, skippedSamples }
}

/**
 * 导出导入错误明细为 CSV 并下载
 * @param errors - 错误明细
 * @param fileName - 导出文件名, 缺省 导入错误明细.csv
 */
export function downloadImportErrors(errors: { row: number; reason: string }[], fileName = '导入错误明细.csv') {
  const esc = (v: string) => (/[,"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)
  const lines = errors.map((e) => [String(e.row), esc(e.reason)].join(','))
  const csv = '\uFEFF' + ['行号,错误原因', ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}