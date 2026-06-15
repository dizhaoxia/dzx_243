import request from '@/utils/request'

export const getClauseList = (params) => {
  return request({
    url: '/clauses',
    method: 'get',
    params
  })
}

export const getClauseDetail = (id) => {
  return request({
    url: `/clauses/${id}`,
    method: 'get'
  })
}

export const createClause = (data) => {
  return request({
    url: '/clauses',
    method: 'post',
    data
  })
}

export const updateClause = (id, data) => {
  return request({
    url: `/clauses/${id}`,
    method: 'put',
    data
  })
}

export const deleteClause = (id) => {
  return request({
    url: `/clauses/${id}`,
    method: 'delete'
  })
}

export const getClauseCategories = () => {
  return request({
    url: '/clauses/categories',
    method: 'get'
  })
}

export const recommendClauses = (params) => {
  return request({
    url: '/clauses/recommend',
    method: 'get',
    params
  })
}
