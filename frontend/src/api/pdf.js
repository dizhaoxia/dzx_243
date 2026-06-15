import request from '@/utils/request'

export const generatePdf = (data) => {
  return request({
    url: '/pdf/generate',
    method: 'post',
    data
  })
}

export const generateSignedPdf = (data) => {
  return request({
    url: '/pdf/generate-signed',
    method: 'post',
    data
  })
}

export const downloadPdf = (documentId) => {
  window.open(`/api/pdf/download/${documentId}`, '_blank')
}

export const downloadSignedPdf = (versionId) => {
  window.open(`/api/pdf/download-signed/${versionId}`, '_blank')
}
