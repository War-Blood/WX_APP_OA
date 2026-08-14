import * as XLSX from 'xlsx'
import type { Question } from '@/api/exam'

/**
 * 题库 Excel 批量导入工具
 * 模板列约定(表头为第一行, 数据从第二行起):
 *   题型 | 题干 | 选项A | 选项B | 选项C | 选项D | 选项E | 选项F | 选项G | 选项H | 答案 | 解析 | 分值 | 判分模式
 * 说明:
 *   - 题型: single=单选 / multiple=多选 / judge=判断
 *   - 判断题仅需「题干」「答案」(正确/错误), 选项列留空, 系统自动生成 正确/错误 两道选项
 *   - 答案: 单选填字母如 A; 多选用逗号分隔如 A,C
 *   - 判分模式: exact=全对得分 / partial=多选漏选给分, 缺省 exact
 */

// 列顺序(与表头一一对应), 行内索引从 0 开始
const COL = {
  type: 0,
  title: 1,
  optionStart: 2, // 选项A
  optionEnd: 9,   // 选项H (共 8 列 A-H)
  answer: 10,
  analysis: 11,
  score: 12,
  scoreMode: 13,
} as const

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

const VALID_TYPES = new Set(['single', 'multiple', 'judge'])
const QUESTION_COL_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/** 模板表头(第一行) */
const TEMPLATE_HEADER = [
  '题型',
  '题干',
  '选项A',
  '选项B',
  '选项C',
  '选项D',
  '选项E',
  '选项F',
  '选项G',
  '选项H',
  '答案',
  '解析',
  '分值',
  '判分模式',
]

/** 模板示例行(第二行), 帮助理解字段含义 */
const TEMPLATE_SAMPLE = [
  'single',
  '我国工频交流电的频率是多少赫兹？',
  '40Hz',
  '50Hz',
  '60Hz',
  '100Hz',
  '',
  '',
  '',
  '',
  'B',
  '我国工频为50Hz',
  2,
  'exact',
]

/**
 * 生成题库导入模板并下载为 .xlsx
 * @param fileName - 导出文件名, 缺省为 题库导入模板.xlsx
 */
export function downloadQuestionTemplate(fileName = '题库导入模板.xlsx') {
  const rows: (string | number)[][] = []
  rows.push([...TEMPLATE_HEADER])
  rows.push([...TEMPLATE_SAMPLE])
  // 添加一行判断题示例
  rows.push(['judge', '人体允许持续接触的安全电压一般不超过多少伏？', '', '', '', '', '', '', '', '', '正确', '安全电压上限为36V', 2, 'exact'])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 10 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 10 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题目')
  XLSX.writeFile(wb, fileName)
}

/**
 * 解析 Excel 文件为可导入题目 + 错误明细
 * @param file - 用户选择的 .xlsx/.xls 文件
 * @returns ParsePreview
 */
export async function parseQuestionWorkbook(file: File): Promise<ParsePreview> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return { rows: [], errors: [], total: 0, header: [] }

  // sheet_to_json(header:1) 直接把整张表转成二维数组, 手动识别表头
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as (string | number)[][]
  if (!matrix.length) return { rows: [], errors: [], total: 0, header: [] }

  const header = (matrix[0] || []).map((h) => String(h).trim())
  // 数据从第 2 行(索引1)开始
  const errors: { row: number; reason: string }[] = []
  const rows: Question[] = []
  let total = 0

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || []
    // 跳过整行空白的说明/空行
    if (line.every((c) => c === '' || c == null)) continue
    total++
    const excelRow = i + 1 // Excel 中表头占第1行, 数据行号 = i+1

    const pushErr = (reason: string) => errors.push({ row: excelRow, reason })

    const type = String(line[COL.type] ?? '').trim().toLowerCase()
    const title = String(line[COL.title] ?? '').trim()

    if (!VALID_TYPES.has(type)) { pushErr(`题型无效: "${line[COL.type] || ''}"(须为 single/multiple/judge)`); continue }
    if (!title) { pushErr('题干不能为空'); continue }

    const rawScore = line[COL.score]
    const score = rawScore === '' || rawScore == null ? 2 : Number(rawScore)
    // 分值校验
    if (rawScore !== '' && rawScore != null && Number.isNaN(score)) { pushErr('分值必须为数字'); continue }
    const scoreMode = String(line[COL.scoreMode] ?? '').trim().toLowerCase() || 'exact'

    // 答案: 统一转大写、去空格
    const answerRaw = String(line[COL.answer] ?? '').trim()
    if (!answerRaw) { pushErr('答案不能为空'); continue }
    const answer = answerRaw.replace(/\s+/g, '').toUpperCase()

    // 判断题: 自动生成 正确/错误 两个选项
    if (type === 'judge') {
      rows.push({
        type, title, answer,
        options: [
          { key: '正确', text: '正确' },
          { key: '错误', text: '错误' },
        ],
        score, scoreMode, analysis: String(line[COL.analysis] ?? '').trim() || undefined,
      } as Question)
      continue
    }

    // 单选/多选: 收集选项
    const options: { key: string; text: string }[] = []
    for (let c = COL.optionStart; c <= COL.optionEnd; c++) {
      const text = String(line[c] ?? '').trim()
      if (text) options.push({ key: QUESTION_COL_KEYS[c - COL.optionStart], text })
    }
    if (options.length < 2) { pushErr('至少需要2个有效选项'); continue }

    // 校验答案字母是否都在已填选项内
    const validKeys = new Set(options.map((o) => o.key))
    const answerKeys = answer.split(',')
    if (answerKeys.some((k) => !validKeys.has(k))) {
      pushErr(`答案字母 "${answer}" 不在已填选项范围`); continue
    }

    rows.push({
      type, title, answer,
      options,
      score, scoreMode, analysis: String(line[COL.analysis] ?? '').trim() || undefined,
    } as Question)
  }

  return { rows, errors, total, header }
}