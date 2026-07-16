import request from '@/utils/request'

export interface Question {
  id?: number; categoryId?: number; type: 'single' | 'multiple' | 'judge'
  title: string; options: { key: string; text: string }[]
  answer: string; analysis?: string; score: number; scoreMode?: 'exact' | 'partial'
  status?: string; createdBy?: number; createdAt?: string
}

export interface Paper {
  id?: number; title: string; description?: string; duration: number
  passScore: number; totalScore: number; maxAttempts?: number
  maxScreenshotWarns?: number; scopeType?: 'all' | 'department'
  scopeDepartments?: number[]; questionIds: number[]; status?: string; version?: number
}

export interface ExamRecord {
  id: number; userId: number; userName?: string; paperId: number; paperTitle?: string
  mode: string; score: number; totalScore: number; isPass: number
  warnCount: number; startTime: string; endTime: string; status: string
}

// 题库
export function getQuestionList(params: { page?: number; pageSize?: number; categoryId?: number; type?: string; keyword?: string }) {
  return request.post('/exam/questions/list', params)
}
export function createQuestion(data: Question) { return request.post('/exam/questions/create', data) }
export function updateQuestion(data: Question & { id: number }) { return request.post('/exam/questions/update', data) }
export function deleteQuestion(id: number) { return request.post('/exam/questions/delete', { id }) }
export function batchImportQuestions(questions: any[]) { return request.post('/exam/questions/batch-import', { questions }) }

// 试卷
export function getPaperList(params: { page?: number; pageSize?: number; status?: string }) {
  return request.post('/exam/papers/list', params)
}
export function createPaper(data: Paper) { return request.post('/exam/papers/create', data) }
export function updatePaper(data: Partial<Paper> & { id: number }) { return request.post('/exam/papers/update', data) }
export function deletePaper(id: number) { return request.post('/exam/papers/delete', { id }) }
export function publishPaper(id: number) { return request.post('/exam/papers/publish', { id }) }

// 记录
export function getRecordList(params: { page?: number; pageSize?: number; keyword?: string; paperId?: number; status?: string }) {
  return request.post('/exam/records/all', params)
}
export function getExamStats(paperId: number) { return request.post('/exam/records/stats', { paperId }) }
