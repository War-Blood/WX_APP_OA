import { post } from '../request'

export const examApi = {
  getCategoryList: () => post('/api/exam/categories/list'),
  getExamList: () => post('/api/exam/exam/list'),
  startExam: (paperId) => post('/api/exam/exam/start', { paperId }),
  submitExam: (data) => post('/api/exam/exam/submit', data),
  reportScreenshot: (recordId) => post('/api/exam/exam/warn', { recordId }),

  startPractice: (data) => post('/api/exam/practice/start', data),
  submitPractice: (data) => post('/api/exam/practice/submit', data),

  getMyRecords: (params) => post('/api/exam/records/my', params || {}),
  getRecordDetail: (recordId) => post('/api/exam/records/detail', { recordId }),
}
