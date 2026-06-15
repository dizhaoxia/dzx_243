<template>
  <div class="template-detail-page">
    <div class="container">
      <el-page-header @back="goBack" :content="template?.title || '模板详情'" class="page-header-nav">
        <template #content>
          <div class="header-content">
            <h2>{{ template?.title }}</h2>
            <span class="type-tag" :class="template?.type">{{ getTypeName(template?.type) }}</span>
          </div>
        </template>
      </el-page-header>

      <el-row :gutter="24" v-loading="loading">
        <el-col :xs="24" :md="14">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#409eff"><Document /></el-icon>
                <span>文书内容预览</span>
              </div>
            </template>
            <div class="markdown-content" v-html="renderedContent"></div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="10">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#409eff"><InfoFilled /></el-icon>
                <span>模板信息</span>
              </div>
            </template>

            <div class="info-section">
              <h4>模板描述</h4>
              <p>{{ template?.description }}</p>
            </div>

            <div class="info-section">
              <h4>占位符字段</h4>
              <el-tag v-for="field in template?.fields" :key="field.name" size="small" class="field-tag">
                {{ field.label }}
              </el-tag>
            </div>

            <div class="info-section">
              <h4>字段数量</h4>
              <p class="count">{{ template?.fields?.length || 0 }} 个字段</p>
            </div>

            <div class="action-section">
              <el-button type="primary" size="large" @click="goToFill" class="fill-btn">
                <el-icon><Edit /></el-icon>
                <span>开始填写</span>
              </el-button>
            </div>
          </el-card>

          <el-card class="tip-card">
            <template #header>
              <div class="card-header">
                <el-icon :size="18" color="#e6a23c"><Warning /></el-icon>
                <span>温馨提示</span>
              </div>
            </template>
            <ul class="tip-list">
              <li>请确保填写的信息真实有效</li>
              <li>带 * 号的字段为必填项</li>
              <li>生成的文书仅供参考，建议咨询专业律师</li>
              <li>您可以在"我的文书"中查看已生成的文档</li>
            </ul>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTemplateDetail } from '@/api/template'
import { marked } from 'marked'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const template = ref(null)
const loading = ref(false)

const getTypeName = (type) => {
  const names = {
    contract: '合同',
    pleading: '诉讼文书',
    other: '其他'
  }
  return names[type] || type
}

const renderedContent = computed(() => {
  if (!template.value?.content) return ''
  return marked.parse(template.value.content)
})

const fetchTemplate = async () => {
  const id = route.params.id
  if (!id) return
  
  loading.value = true
  try {
    const data = await getTemplateDetail(id)
    template.value = data
  } catch (error) {
    ElMessage.error('获取模板详情失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

const goToFill = () => {
  router.push(`/fill/${route.params.id}`)
}

onMounted(() => {
  fetchTemplate()
})
</script>

<style scoped>
.template-detail-page {
  min-height: calc(100vh - 128px);
}

.page-header-nav {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
}

.type-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: #ecf5ff;
  color: #409eff;
}

.type-tag.contract {
  background-color: #ecf5ff;
  color: #409eff;
}

.type-tag.pleading {
  background-color: #fef0f0;
  color: #f56c6c;
}

.type-tag.other {
  background-color: #f0f9eb;
  color: #67c23a;
}

.content-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.info-card {
  margin-bottom: 20px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section h4 {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
  font-weight: 500;
}

.info-section p {
  color: #303133;
  line-height: 1.6;
  font-size: 14px;
}

.info-section .count {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.field-tag {
  margin: 4px;
}

.action-section {
  margin-top: 24px;
}

.fill-btn {
  width: 100%;
  height: 48px;
}

.tip-card {
  background-color: #fdf6ec;
  border-color: #faecd8;
}

.tip-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip-list li {
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
  color: #e6a23c;
  font-size: 13px;
  line-height: 1.5;
}

.tip-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #e6a23c;
}
</style>
