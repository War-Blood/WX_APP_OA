import request from '@/utils/request'

export interface PagedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 列表行类型（后端 SELECT * 返回 snake_case 字段）
export interface QuestionRow {
  id: number
  category_id?: number
  type: 'single' | 'multiple' | 'judge'
  title: string
  options: string | { key: string; text: string }[]
  answer: string
  analysis?: string
  score: number
  score_mode?: 'exact' | 'partial'
  shuffle_options?: number
  status?: string
}

export interface Question {
  id?: number
  categoryId?: number
  type: 'single' | 'multiple' | 'judge'
  title: string
  options: { key: string; text: string }[]
  answer: string
  analysis?: string
  score: number
  scoreMode?: 'exact' | 'partial'
  shuffleOptions?: boolean
  status?: string
  createdBy?: number
  createdAt?: string
}

export interface ExamCategory {
  id: number
  parentId: number
  name: string
  cover?: string | null
  /** 子树聚合题量（后端计算） */
  questionNum?: number
  /** 建议答题时长(分钟) */
  time?: number
  path?: string
  sortOrder?: number
  children?: ExamCategory[]
}

export interface RecordRow {
  id: number
  userId: number
  userName?: string
  departmentName?: string
  categoryId: number
  categoryName?: string
  mode: 'practice' | 'exam' | 'mock'
  score: number | null
  totalScore: number
  useTime: number
  status: 'doing' | 'submitted' | 'timeout'
  startTime: string
  endTime: string
  createdAt: string
}

export interface QuestionDetail {
  questionId: number
  type: string
  title: string
  options: { key: string; text: string }[] | string
  userAnswer: string
  rightAnswer: string
  analysis?: string
  correct: boolean
  earnedPoints: number
  totalPoints: number
}

export interface RecordDetail {
  recordId: number
  categoryId: number
  categoryName?: string
  mode: string
  score: number | null
  totalScore: number
  useTime: number
  status: string
  startTime: string
  endTime: string
  details: QuestionDetail[]
}

export interface RankRow {
  rank: number
  userId: number
  userName: string
  departmentName: string
  score: number
  useTime: number
}

export interface StatsOverview {
  people: number
  total: number
  avgScore: number
  passCount: number
  passRate: number
  distribution: { id: number; name: string; cnt: number }[]
}

export interface SettingRow {
  key: string
  value: string
}

export interface DrawRule {
  type: 'single' | 'multiple' | 'judge'
  categoryId: number
  count: number
  score: number
}

export interface PaperRow {
  id: number
  title: string
  description?: string
  duration: number
  pass_score: number
  total_score: number
  max_attempts?: number
  scope_type?: 'all' | 'department' | 'user' | 'role'
  scope_departments?: number[] | string
  scope_users?: number[] | string
  scope_roles?: string[] | string
  draw_rules?: DrawRule[] | string
  shuffle_questions?: number
  shuffle_options?: number
  question_ids?: number[] | string
  start_time?: string
  end_time?: string
  status?: string
  version?: number
}

export interface Paper {
  id?: number
  title: string
  description?: string
  duration: number
  passScore: number
  totalScore: number
  maxAttempts?: number
  scopeType?: 'all' | 'department' | 'user' | 'role'
  scopeDepartments?: number[]
  scopeUsers?: number[]
  scopeRoles?: string[]
  drawRules?: DrawRule[]
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  questionIds: number[]
  startTime?: string
  endTime?: string
}

export interface AvailablePaper {
  paperId: number
  title: string
  description?: string
  duration: number
  passScore: number
  totalScore: number
  maxAttempts: number
  startTime?: string
  endTime?: string
  attemptsUsed: number
  attemptsLimit: number
  canTake: boolean
  recordId?: number | null
  myStatus?: string | null
  myScore?: number | null
  myPass?: number | null
}

// ===== 分类 =====
export function getCategoryList(): Promise<ExamCategory[]> {
  return request.post('/exam/categories/list')
}
export function createCategory(data: { parentId?: number; name: string; cover?: string; time?: number; sortOrder?: number }): Promise<{ id: number }> {
  return request.post('/exam/categories/create', data)
}
export function updateCategory(data: { id: number; name?: string; cover?: string; time?: number; sortOrder?: number }): Promise<{ updated: boolean }> {
  return request.post('/exam/categories/update', data)
}
export function deleteCategory(id: number): Promise<{ deleted: boolean }> {
  return request.post('/exam/categories/delete', { id })
}

// ===== 题库 =====
export function getQuestionList(params: { page?: number; pageSize?: number; categoryId?: number; type?: string; keyword?: string }): Promise<PagedResult<QuestionRow>> {
  return request.post('/exam/questions/list', params)
}
export function createQuestion(data: Question): Promise<{ id: number }> { return request.post('/exam/questions/create', data) }
export function updateQuestion(data: Question & { id: number }): Promise<{ updated: boolean }> { return request.post('/exam/questions/update', data) }
export function deleteQuestion(id: number): Promise<{ deleted: boolean }> { return request.post('/exam/questions/delete', { id }) }
export function batchImportQuestions(questions: Question[]): Promise<{ success: number; failed: number; errors: { row: number; reason: string }[] }> {
  return request.post('/exam/questions/batch-import', { questions })
}

// ===== 记录 =====
export function getRecordList(params: { page?: number; pageSize?: number; keyword?: string; categoryId?: number; mode?: string; status?: string }): Promise<PagedResult<RecordRow>> {
  return request.post('/exam/records/all', params)
}
export function getRecordDetail(recordId: number): Promise<RecordDetail> { return request.post('/exam/records/detail', { recordId }) }
export function exportRecords(params: { categoryId?: number; keyword?: string }): Promise<{ filename: string; csv: string }> {
  return request.post('/exam/records/export', params)
}

// ===== 统计 =====
export function getStatsOverview(params: { categoryId?: number } = {}): Promise<StatsOverview> {
  return request.post('/exam/stats/overview', params)
}

// ===== 答题设置 =====
export function getSettings(): Promise<Record<string, string>> { return request.post('/exam/settings/get') }
export function updateSettings(settings: SettingRow[]): Promise<{ updated: boolean }> { return request.post('/exam/settings/update', { settings }) }

// ===== 试卷（企业内部考核） =====
export function getPaperList(params: { page?: number; pageSize?: number; status?: string }): Promise<PagedResult<PaperRow>> {
  return request.post('/exam/papers/list', params)
}
export function createPaper(data: Paper): Promise<{ id: number }> { return request.post('/exam/papers/create', data) }
export function updatePaper(data: Partial<Paper> & { id: number }): Promise<{ updated: boolean }> { return request.post('/exam/papers/update', data) }
export function deletePaper(id: number): Promise<{ deleted: boolean }> { return request.post('/exam/papers/delete', { id }) }
export function publishPaper(id: number): Promise<{ published: boolean }> { return request.post('/exam/papers/publish', { id }) }
