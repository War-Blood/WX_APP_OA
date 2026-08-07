import { post } from '../request'

/**
 * 答题模块 API — 命名对齐 kesixin/dati utils/util.js
 * (getQuestionMenu→getCategoryTree, saveScore→submit, historyList→myRecords, getRankList→rankList,
 *  getErrQuestionList→wrongList, getSetting→getSettings)
 */
export const examApi = {
  // 分类 (dati: getQuestionMenu)
  getCategoryTree: () => post('/api/exam/categories/list'),
  // 设置 (dati: getSetting)
  getSettings: () => post('/api/exam/settings/get'),

  // 练习/背题 (dati: getQuestions → 答题/背题)
  learnStart: (data) => post('/api/exam/learn/start', data),
  learnSubmit: (recordId, answers) => post('/api/exam/learn/submit', { recordId, answers }),

  // 模拟考试 (dati: moniq)
  mockStart: (categoryId) => post('/api/exam/mock/start', { categoryId }),
  mockSubmit: (recordId, answers) => post('/api/exam/mock/submit', { recordId, answers }),

  // 正式考试 (试卷制: 企业内部考核)
  getAvailablePapers: () => post('/api/exam/papers/available'),
  examStart: (paperId) => post('/api/exam/exam/start', { paperId }),
  examSubmit: (recordId, answers) => post('/api/exam/exam/submit', { recordId, answers }),
  saveProgress: (recordId, answers) => post('/api/exam/exam/save-progress', { recordId, answers }),

  // 记录/排行 (dati: historyList / getRankList)
  myRecords: (params) => post('/api/exam/records/my', params || {}),
  recordDetail: (recordId) => post('/api/exam/records/detail', { recordId }),
  rankList: (categoryId) => post('/api/exam/records/rank', { categoryId }),

  // 错题/收藏 (dati: getErrQuestionList / errorStar)
  wrongList: (params) => post('/api/exam/wrong/list', params || {}),
  wrongRemove: (questionId) => post('/api/exam/wrong/remove', { questionId }),
  favoriteToggle: (questionId) => post('/api/exam/favorite/toggle', { questionId }),
  favoriteList: (params) => post('/api/exam/favorite/list', params || {}),
}
