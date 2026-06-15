import request from '@/utils/request'

export const getVersionList = (documentId) => {
  return request({
    url: `/versions/document/${documentId}`,
    method: 'get'
  })
}

export const getVersionDetail = (id) => {
  return request({
    url: `/versions/${id}`,
    method: 'get'
  })
}

export const createVersion = (data) => {
  return request({
    url: '/versions',
    method: 'post',
    data
  })
}

export const deleteVersion = (id) => {
  return request({
    url: `/versions/${id}`,
    method: 'delete'
  })
}

export const downloadVersionPdf = (id) => {
  window.open(`/api/versions/${id}/download`, '_blank')
}
