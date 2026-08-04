import request from '@/utils/request'

export interface AnnouncementItem {
  id: number
  title: string
  content: string
  authorId: number
  authorName: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  targetDepartments: number[] | null
  status: 'draft' | 'published' | 'cancelled'
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export function getAnnouncementList(params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  priority?: string
}): Promise<{ list: AnnouncementItem[]; total: number }> {
  return request.post('/announcement/list', params)
}

export function createAnnouncement(data: {
  title: string
  content: string
  priority?: string
  targetDepartments?: number[]
}): Promise<{ id: number }> {
  return request.post('/announcement/create', data)
}

export function updateAnnouncement(id: number, data: {
  title?: string
  content?: string
  priority?: string
  targetDepartments?: number[]
}): Promise<{ id: number }> {
  return request.put(`/announcement/${id}`, data)
}

export function publishAnnouncement(id: number): Promise<{ id: number; status: string }> {
  return request.post(`/announcement/${id}/publish`)
}

export function cancelAnnouncement(id: number): Promise<{ id: number; status: string }> {
  return request.post(`/announcement/${id}/cancel`)
}

export function deleteAnnouncement(id: number): Promise<{ id: number; deleted: boolean }> {
  return request.delete(`/announcement/${id}`)
}
