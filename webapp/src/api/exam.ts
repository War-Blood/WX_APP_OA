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
  status?: string
}

export interface PaperRow {
  id: number
  title: string
  description?: string
  duration: number
  pass_score: number
  total_score: number
  max_attempts?: number
  max_screenshot_warns?: number
  scope_type?: 'all' | 'department'
  scope_departments?: number[] | string
  start_time?: string
  end_time?: string
  question_ids?: number[] | string
  status?: string
  version?: number
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
  status?: string
  createdBy?: number
  createdAt?: string
}

export interface Paper {
  id?: number
  title: string
  description?: string
  duration: number
  passScore: number
  totalScore: number
  maxAttempts?: number
  maxScreenshotWarns?: number
  scopeType?: 'all' | 'department'
  scopeDepartments?: number[]
  startTime?: string
  endTime?: string
  questionIds: number[]
  status?: string
  version?: number
}

export interface ExamRecord {
  id: number
  userId: number
  userName?: string
  paperId: number
  paperTitle?: string
  mode: string
  score: number
  totalScore: number
  isPass: number
  warnCount: number
  startTime: string
  endTime: string
  status: string
}

export interface ExamCategory {
  id: number
  parentId: number
  name: string
  path?: string
  sortOrder?: number
  children?: ExamCategory[]
}

export interface QuestionDetail {
  questionId: number
  type: string
  title: string
  userAnswer: string
  rightAnswer: string
  analysis?: string
  correct: boolean
  earnedPoints: number
  totalPoints: number
}

export interface RecordDetail {
  recordId: number
  paperId: number
  paperTitle?: string
  mode: string
  score: number
  totalScore: number
  isPass: number
  passScore?: number
  status: string
  warnCount: number
  startTime: string
  endTime: string
  details: QuestionDetail[]
}

export interface ExamStats {
  paperTitle?: string
  totalScore?: number
  passScore?: number
  total: number
  avgScore: number
  passCount: number
  cheatCount: number
  passRate: number
  distribution: { range: string; count: number }[]
}

// ===== 分类 =====
export function getCategoryList(): Promise<ExamCategory[]> {
  return request.post('/exam/categories/list')
}
export function createCategory(data: { parentId?: number; name: string; sortOrder?: number }): Promise<ExamCategory> {
  return request.post('/exam/categories/create', data)
}
export function updateCategory(data: { id: number; name?: string; sortOrder?: number }): Promise<{ updated: boolean }> {
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

// ===== 试卷 =====
export function getPaperList(params: { page?: number; pageSize?: number; status?: string }): Promise<PagedResult<PaperRow>> {
  return request.post('/exam/papers/list', params)
}
export function createPaper(data: Paper): Promise<{ id: number }> { return request.post('/exam/papers/create', data) }
export function updatePaper(data: Partial<Paper> & { id: number }): Promise<{ updated: boolean }> { return request.post('/exam/papers/update', data) }
export function deletePaper(id: number): Promise<{ deleted: boolean }> { return request.post('/exam/papers/delete', { id }) }
export function publishPaper(id: number): Promise<{ published: boolean }> { return request.post('/exam/papers/publish', { id }) }
export function clonePaper(id: number, title?: string): Promise<{ id: number; version: number }> { return request.post('/exam/papers/clone', { id, title }) }

// ===== 记录 =====
export function getRecordList(params: { page?: number; pageSize?: number; keyword?: string; paperId?: number; status?: string }): Promise<PagedResult<ExamRecord>> {
  return request.post('/exam/records/all', params)
}
export function getExamStats(paperId: number): Promise<ExamStats> { return request.post('/exam/records/stats', { paperId }) }
export function getRecordDetail(recordId: number): Promise<RecordDetail> { return request.post('/exam/records/detail', { recordId }) }
