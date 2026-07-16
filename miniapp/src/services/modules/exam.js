import { post } from '../request'

export const examApi = {
  getExamList: () => post('/api/exam/exam/list'),
  startExam: (paperId) => post('/api/exam/exam/start', { paperId }),
  submitExam: (data) => post('/api/exam/exam/submit', data),
  reportScreenshot: (recordId) => post('/api/exam/exam/warn', { recordId }),

  startPractice: (data) => post('/api/exam/practice/start', data),
  submitPractice: (data) => post('/api/exam/practice/submit', data),

  getMyRecords: (params) => post('/api/exam/records/my', params || {}),
}
