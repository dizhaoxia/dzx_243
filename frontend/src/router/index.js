import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '模板库' }
  },
  {
    path: '/template/:id',
    name: 'TemplateDetail',
    component: () => import('@/views/TemplateDetail.vue'),
    meta: { title: '模板详情' }
  },
  {
    path: '/fill/:templateId',
    name: 'FillForm',
    component: () => import('@/views/FillForm.vue'),
    meta: { title: '填写表单' }
  },
  {
    path: '/documents',
    name: 'Documents',
    component: () => import('@/views/Documents.vue'),
    meta: { title: '我的文书' }
  },
  {
    path: '/document/:id',
    name: 'DocumentDetail',
    component: () => import('@/views/DocumentDetail.vue'),
    meta: { title: '文书详情' }
  },
  {
    path: '/clause-library',
    name: 'ClauseLibrary',
    component: () => import('@/views/ClauseLibrary.vue'),
    meta: { title: '条款库管理' }
  },
  {
    path: '/sign/:documentId',
    name: 'SignPage',
    component: () => import('@/views/SignPage.vue'),
    meta: { title: '文书签署' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 法律文书生成平台`
  }
  next()
})

export default router
