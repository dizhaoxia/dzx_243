import request from '@/utils/request'

export const getTemplateList = (params) => {
  return request({
    url: '/templates',
    method: 'get',
    params
  })
}

export const getTemplateDetail = (id) => {
  return request({
    url: `/templates/${id}`,
    method: 'get'
  })
}

export const createTemplate = (data) => {
  return request({
    url: '/templates',
    method: 'post',
    data
  })
}
