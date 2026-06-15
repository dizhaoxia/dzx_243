import request from '@/utils/request'

export const getDocumentList = () => {
  return request({
    url: '/documents',
    method: 'get'
  })
}

export const getDocumentDetail = (id) => {
  return request({
    url: `/documents/${id}`,
    method: 'get'
  })
}

export const createDocument = (data) => {
  return request({
    url: '/documents',
    method: 'post',
    data
  })
}

export const deleteDocument = (id) => {
  return request({
    url: `/documents/${id}`,
    method: 'delete'
  })
}
