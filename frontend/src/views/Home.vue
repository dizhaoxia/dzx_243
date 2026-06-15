<template>
  <div class="home-page">
    <div class="container">
      <div class="page-header">
        <h2>模板库</h2>
        <p>选择合适的模板，快速生成专业法律文书</p>
      </div>

      <div class="filter-section">
        <el-radio-group v-model="activeType" @change="handleTypeChange">
          <el-radio-button value="">全部模板</el-radio-button>
          <el-radio-button value="contract">合同类</el-radio-button>
          <el-radio-button value="pleading">诉讼文书</el-radio-button>
          <el-radio-button value="other">其他</el-radio-button>
        </el-radio-group>
      </div>

      <el-row :gutter="20" v-loading="loading">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="template in templateList" :key="template.id">
          <el-card class="template-card card-hover" @click="goToDetail(template.id)">
            <template #header>
              <div class="card-header">
                <el-icon :size="24" :color="getTypeColor(template.type)">
                  <component :is="getTypeIcon(template.type)" />
                </el-icon>
                <span class="type-tag" :class="template.type">{{ getTypeName(template.type) }}</span>
              </div>
            </template>
            <h3 class="card-title">{{ template.title }}</h3>
            <p class="card-desc">{{ template.description }}</p>
            <div class="card-footer">
              <span class="create-time">{{ formatDate(template.created_at) }}</span>
              <el-button type="primary" size="small" @click.stop="goToFill(template.id)">
                立即使用
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="!loading && templateList.length === 0" description="暂无模板" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTemplateStore } from '@/stores/template'
import { ElMessage } from 'element-plus'

const router = useRouter()
const templateStore = useTemplateStore()

const templateList = ref([])
const loading = ref(false)
const activeType = ref('')

const getTypeIcon = (type) => {
  const icons = {
    contract: 'Document',
    pleading: 'EditPen',
    other: 'Files'
  }
  return icons[type] || 'Document'
}

const getTypeName = (type) => {
  const names = {
    contract: '合同',
    pleading: '诉讼文书',
    other: '其他'
  }
  return names[type] || type
}

const getTypeColor = (type) => {
  const colors = {
    contract: '#409eff',
    pleading: '#f56c6c',
    other: '#67c23a'
  }
  return colors[type] || '#909399'
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleTypeChange = () => {
  fetchTemplates()
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    const params = activeType.value ? { type: activeType.value } : {}
    const data = await templateStore.fetchTemplateList(params)
    templateList.value = data
  } catch (error) {
    ElMessage.error('获取模板列表失败')
  } finally {
    loading.value = false
  }
}

const goToDetail = (id) => {
  router.push(`/template/${id}`)
}

const goToFill = (id) => {
  router.push(`/fill/${id}`)
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 128px);
}

.filter-section {
  margin-bottom: 24px;
}

.template-card {
  cursor: pointer;
  margin-bottom: 20px;
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.card-title {
  font-size: 16px;
  color: #303133;
  margin-bottom: 12px;
  font-weight: 600;
}

.card-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  min-height: 42px;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.create-time {
  font-size: 12px;
  color: #909399;
}
</style>
