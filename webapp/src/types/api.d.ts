// API 类型定义

// 通用响应结构
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 分页请求参数
export interface PaginationParams {
  page?: number
  pageSize?: number
}

// 分页响应结构
export interface PaginationData<T> {
  total: number
  list: T[]
}

// 用户信息
export interface UserInfo {
  userId: string
  nickName: string
  avatarUrl: string
  role: 'employee' | 'admin' | 'superadmin'
  department: string
  phone?: string
  email?: string
  joinDate?: string
  permissions: string[]
  status?: 'active' | 'disabled'
  lastLoginTime?: string
}

// 登录响应
export interface LoginResponse {
  token: string
  userInfo: UserInfo
}

// 用户列表查询参数
export interface UserListParams extends PaginationParams {
  keyword?: string
  role?: string
  department?: string
  status?: string
}

// 审批项
export interface ApprovalItem {
  id: string
  title: string
  type: 'leave' | 'expense' | 'seal' | 'travel' | 'purchase' | 'general'
  applicant: string
  applicantDept: string
  applicantId: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
  statusText: string
  iconBg: string
  iconSrc: string
}

// 审批详情
export interface ApprovalDetail extends ApprovalItem {
  formData: Record<string, unknown>
  timeline: ApprovalTimelineItem[]
}

// 审批时间线
export interface ApprovalTimelineItem {
  status: string
  operator: string
  time: string
  remark?: string
}

// 日报
export interface DailyReport {
  id: string
  userId: string
  userName: string
  department: string
  date: string
  content: string
  status: 'draft' | 'submitted' | 'reviewed'
  reviewComment?: string
  reviewer?: string
  reviewTime?: string
  createdAt: string
  updatedAt: string
}

// 公告
export interface Announcement {
  id: string
  title: string
  content: string
  author: string
  publishTime: string
  scope: 'all' | 'department'
  targetDepartments?: string[]
  readCount: number
  totalCount: number
  status: 'draft' | 'published' | 'archived'
  isTop: boolean
}

// 项目
export interface Project {
  id: string
  name: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed'
  priority: 'low' | 'medium' | 'high'
  startDate: string
  endDate: string
  manager: string
  members: string[]
  progress: number
  createdAt: string
}

// 资产
export interface Asset {
  id: string
  name: string
  code: string
  category: string
  model?: string
  status: 'in_use' | 'idle' | 'maintenance' | 'scrapped'
  location: string
  owner?: string
  purchaseDate?: string
  price?: number
  warrantyDate?: string
  createdAt: string
}

// 部门
export interface Department {
  id: string
  name: string
  parentId?: string
  manager?: string
  memberCount: number
  children?: Department[]
}

// 角色
export interface Role {
  id: string
  name: string
  code: string
  description?: string
  permissions: string[]
  userCount: number
  createdAt: string
}
