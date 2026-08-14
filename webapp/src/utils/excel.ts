import * as XLSX from 'xlsx'
import type { Question } from '@/api/exam'

/**
 * 题库 Excel 批量导入工具
 * 模板列(表头为第一行, 数据从第二行起, 支持动态识别表头):
 *   分类 | 题型 | 题干 | 选项A | 选项B | ... | 选项H | 答案 | 解析 | 分值 | 判分模式 | 题干图片
 * 说明:
 *   - 分类: 主分类名称, 可空(使用导入弹窗选择的目标分类)
 *   - 题型: single=单选 / multiple=多选 / judge=判断 (兼容中文 单选/多选/判断)
 *   - 判断题仅需「题干」「答案」(正确/错误), 选项列留空, 系统自动生成 正确/错误 两道选项
 *   - 答案: 单选填字母如 A; 多选用逗号分隔如 A,C
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
  /** 识别到的原始表头 */
  header: string[]
}

/** 模板表头(第一行) */
const TEMPLATE_HEADER = [
  '分类', '题型', '题干',
  '选项A', '选项B', '选项C', '选项D', '选项E', '选项F', '选项G', '选项H',
  '答案', '解析', '分值', '判分模式', '题干图片',
]

/** 模板示例行(第二行), 帮助理解字段含义 */
const TEMPLATE_SAMPLE: (string | number)[] = [
  '低压电工', 'single', '我国工频交流电的频率是多少赫兹？',
  '40Hz', '50Hz', '60Hz', '100Hz', '', '', '', '',
  'B', '我国工频为50Hz', 2, 'exact', '',
]

/**
 * 生成题库导入模板并下载为 .xlsx
 * @param fileName - 导出文件名, 缺省为 题库导入模板.xlsx
 */
export function downloadQuestionTemplate(fileName = '题库导入模板.xlsx') {
  const rows: (string | number)[][] = []
  rows.push([...TEMPLATE_HEADER])
  rows.push([...TEMPLATE_SAMPLE])
  // 判断题示例(分类/题型/题干/答案/解析/分值/判分模式)
  rows.push(['低压电工', 'judge', '人体允许持续接触的安全电压一般不超过多少伏？', '', '', '', '', '', '', '', '', '正确', '安全电压上限为36V', 2, 'exact', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 36 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 30 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题目')
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
  if (!ws) return { rows: [], errors: [], total: 0, header: [] }

  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as (string | number)[][]
  if (!matrix.length) return { rows: [], errors: [], total: 0, header: [] }

  const header = (matrix[0] || []).map((h) => String(h).trim())
  const col = resolveColumns(header)
  const nameToId = new Map<string, number>()
  categories.forEach((c) => { nameToId.set(c.name.trim(), c.id) })

  const errors: { row: number; reason: string }[] = []
  const rows: Question[] = []
  let total = 0

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || []
    if (line.every((c) => c === '' || c == null)) continue
    total++
    const excelRow = i + 1 // Excel 中表头占第1行, 数据行号 = i+1
    const cell = (c: number) => (c >= 0 ? String(line[c] ?? '').trim() : '')
    const pushErr = (reason: string) => errors.push({ row: excelRow, reason })

    const typeRaw = cell(col.type).toLowerCase()
    const type = VALID_TYPE_LABELS[typeRaw] || (VALID_TYPES.has(typeRaw) ? typeRaw : '')
    const title = cell(col.title)

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

  return { rows, errors, total, header }
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
