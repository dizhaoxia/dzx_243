<template>
  <div class="clause-library-page">
    <div class="container">
      <el-page-header content="条款库管理" class="page-header-nav">
        <template #content>
          <div class="header-content">
            <h2>条款库管理</h2>
            <el-tag type="success" effect="plain" size="small">共 {{ total }} 条条款</el-tag>
          </div>
        </template>
      </el-page-header>

      <el-card shadow="never" class="filter-card">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="关键词">
            <el-input
              v-model="filterForm.keyword"
              placeholder="搜索标题、内容、关键词..."
              clearable
              style="width: 260px"
              @keyup.enter="fetchList"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select
              v-model="filterForm.category"
              placeholder="选择分类"
              clearable
              style="width: 160px"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.category"
                :label="`${cat.category} (${cat.count})`"
                :value="cat.category"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchList" :loading="loading">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilter">
              <el-icon><RefreshLeft /></el-icon>
              重置
            </el-button>
          </el-form-item>
          <el-form-item style="margin-left: auto">
            <el-button type="success" @click="openFormDialog()">
              <el-icon><Plus /></el-icon>
              新增条款
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="table-card" v-loading="loading">
        <el-table :data="clauseList" stripe>
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column label="标题" min-width="220">
            <template #default="{ row }">
              <div class="title-cell">
                <span class="clause-title">{{ row.title }}</span>
                <el-tag v-if="row.is_default" type="danger" size="small" effect="plain" style="margin-left: 8px">默认</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.category" type="info" size="small" effect="light">{{ row.category }}</el-tag>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="180">
            <template #default="{ row }">
              <template v-if="row.tags && row.tags.length">
                <el-tag
                  v-for="tag in row.tags.slice(0, 4)"
                  :key="tag"
                  size="small"
                  effect="plain"
                  type="warning"
                  style="margin: 2px 4px 2px 0"
                >
                  #{{ tag }}
                </el-tag>
                <span v-if="row.tags.length > 4" class="muted">+{{ row.tags.length - 4 }}</span>
              </template>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="适用模板" min-width="160">
            <template #default="{ row }">
              <template v-if="row.applicable_templates && row.applicable_templates.length">
                <el-tag
                  v-for="tpl in row.applicable_templates.slice(0, 3)"
                  :key="tpl"
                  size="small"
                  effect="plain"
                  type="primary"
                  style="margin: 2px 4px 2px 0"
                >
                  {{ tpl }}
                </el-tag>
                <span v-if="row.applicable_templates.length > 3" class="muted">+{{ row.applicable_templates.length - 3 }}</span>
              </template>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="权重" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="weightType(row.weight)" size="small" effect="plain">{{ row.weight || 0 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewClause(row)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button link type="success" size="small" @click="openFormDialog(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button link type="danger" size="small" @click="deleteClause(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 40, 80]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="fetchList"
            @current-change="fetchList"
          />
        </div>
      </el-card>

      <el-dialog
        v-model="formDialogVisible"
        :title="editingClause ? '编辑条款' : '新增条款'"
        width="720px"
        align-center
        destroy-on-close
        :close-on-click-modal="false"
      >
        <el-form :model="clauseForm" :rules="formRules" ref="clauseFormRef" label-width="110px" label-position="right">
          <el-form-item label="条款标题" prop="title">
            <el-input v-model="clauseForm.title" placeholder="请输入条款标题" maxlength="200" clearable />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="分类" prop="category">
                <el-select
                  v-model="clauseForm.category"
                  placeholder="选择或输入分类"
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option v-for="cat in categories" :key="cat.category" :label="cat.category" :value="cat.category" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="推荐权重">
                <el-input-number v-model="clauseForm.weight" :min="0" :max="100" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="标签">
            <el-select
              v-model="clauseForm.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="回车添加标签"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="适用模板">
            <el-select
              v-model="clauseForm.applicable_templates"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="如：contract、劳动合同、买卖合同等"
              style="width: 100%"
            >
              <el-option label="contract (通用合同)" value="contract" />
              <el-option label="pleading (诉讼文书)" value="pleading" />
              <el-option label="劳动合同" value="劳动合同" />
              <el-option label="买卖合同" value="买卖合同" />
              <el-option label="房屋租赁合同" value="房屋租赁合同" />
              <el-option label="民事起诉状" value="民事起诉状" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="clauseForm.keywords"
              placeholder="用逗号分隔，如：违约,违约金,赔偿"
              type="textarea"
              :rows="2"
            />
            <div class="form-tip">用于匹配用户填写内容，匹配频次越高推荐权重越大</div>
          </el-form-item>
          <el-form-item label="条款内容" prop="content">
            <el-input
              v-model="clauseForm.content"
              placeholder="支持Markdown格式，建议使用## 标题 + 1. 列表"
              type="textarea"
              :rows="10"
            />
          </el-form-item>
          <el-form-item label="设为默认">
            <el-switch v-model="clauseForm.is_default" />
            <span class="form-tip" style="margin-left: 10px">默认条款在推荐中获得额外权重加成</span>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="formDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitClauseForm">
            {{ editingClause ? '保存修改' : '创建条款' }}
          </el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="viewDialogVisible" :title="viewingClause?.title" width="680px" align-center>
        <div class="view-meta" v-if="viewingClause">
          <el-tag type="info" effect="plain">{{ viewingClause.category || '未分类' }}</el-tag>
          <el-tag type="primary" effect="plain" style="margin-left: 8px">
            权重：{{ viewingClause.weight || 0 }}
          </el-tag>
          <el-tag v-if="viewingClause.is_default" type="danger" effect="plain" style="margin-left: 8px">
            默认条款
          </el-tag>
          <div class="meta-tags" v-if="viewingClause.tags && viewingClause.tags.length">
            <span class="meta-label">标签：</span>
            <el-tag
              v-for="tag in viewingClause.tags"
              :key="tag"
              size="small"
              effect="plain"
              type="warning"
              style="margin: 2px"
            >
              #{{ tag }}
            </el-tag>
          </div>
          <div class="meta-tags" v-if="viewingClause.applicable_templates && viewingClause.applicable_templates.length">
            <span class="meta-label">适用：</span>
            <el-tag
              v-for="tpl in viewingClause.applicable_templates"
              :key="tpl"
              size="small"
              effect="plain"
              style="margin: 2px"
            >
              {{ tpl }}
            </el-tag>
          </div>
          <div class="meta-tags" v-if="viewingClause.keywords">
            <span class="meta-label">关键词：</span>
            <span class="muted">{{ viewingClause.keywords }}</span>
          </div>
        </div>
        <el-divider />
        <div class="markdown-content view-content" v-html="viewedContent" />
        <template #footer>
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="viewingClause && openFormDialog(viewingClause)">
            编辑此条款
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import {
  getClauseList,
  getClauseCategories,
  createClause,
  updateClause,
  deleteClause as deleteClauseApi
} from '@/api/clause'
import {
  Search, RefreshLeft, Plus, View, Edit, Delete
} from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const clauseList = ref([])
const categories = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const filterForm = reactive({
  keyword: '',
  category: ''
})

const formDialogVisible = ref(false)
const editingClause = ref(null)
const clauseFormRef = ref(null)
const clauseForm = reactive({
  title: '',
  content: '',
  category: '',
  tags: [],
  applicable_templates: [],
  keywords: '',
  weight: 0,
  is_default: false
})

const formRules = {
  title: [{ required: true, message: '请输入条款标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入条款内容', trigger: 'blur' }]
}

const viewDialogVisible = ref(false)
const viewingClause = ref(null)

const viewedContent = computed(() => {
  if (!viewingClause.value) return ''
  return marked.parse(viewingClause.value.content || '')
})

const fetchList = async () => {
  loading.value = true
  try {
    const data = await getClauseList({
      keyword: filterForm.keyword || undefined,
      category: filterForm.category || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    clauseList.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error('获取条款列表失败')
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const data = await getClauseCategories()
    categories.value = data || []
  } catch (error) {
    console.warn('获取分类失败', error)
  }
}

const resetFilter = () => {
  filterForm.keyword = ''
  filterForm.category = ''
  page.value = 1
  fetchList()
}

const weightType = (w) => {
  if (w >= 12) return 'success'
  if (w >= 6) return 'warning'
  return 'info'
}

const openFormDialog = (row = null) => {
  editingClause.value = row
  if (row) {
    clauseForm.title = row.title
    clauseForm.content = row.content
    clauseForm.category = row.category || ''
    clauseForm.tags = Array.isArray(row.tags) ? [...row.tags] : []
    clauseForm.applicable_templates = Array.isArray(row.applicable_templates) ? [...row.applicable_templates] : []
    clauseForm.keywords = row.keywords || ''
    clauseForm.weight = Number(row.weight) || 0
    clauseForm.is_default = !!row.is_default
  } else {
    clauseForm.title = ''
    clauseForm.content = ''
    clauseForm.category = ''
    clauseForm.tags = []
    clauseForm.applicable_templates = []
    clauseForm.keywords = ''
    clauseForm.weight = 0
    clauseForm.is_default = false
  }
  formDialogVisible.value = true
}

const submitClauseForm = async () => {
  if (!clauseFormRef.value) return
  try {
    await clauseFormRef.value.validate()
  } catch (e) {
    return
  }
  submitting.value = true
  try {
    if (editingClause.value) {
      await updateClause(editingClause.value.id, { ...clauseForm })
      ElMessage.success('修改成功')
    } else {
      await createClause({ ...clauseForm })
      ElMessage.success('创建成功')
    }
    formDialogVisible.value = false
    fetchList()
    fetchCategories()
  } catch (error) {
    ElMessage.error((editingClause.value ? '修改' : '创建') + '失败')
  } finally {
    submitting.value = false
  }
}

const deleteClause = (row) => {
  ElMessageBox.confirm(`确定删除条款【${row.title}】吗？此操作不可恢复`, '警告', {
    type: 'danger',
    confirmButtonText: '确定删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await deleteClauseApi(row.id)
      ElMessage.success('删除成功')
      fetchList()
      fetchCategories()
    } catch (e) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const viewClause = (row) => {
  viewingClause.value = row
  viewDialogVisible.value = true
}

onMounted(() => {
  fetchList()
  fetchCategories()
})
</script>

<style scoped>
.clause-library-page {
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

.filter-card {
  margin-bottom: 16px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.table-card {
  margin-bottom: 20px;
}

.title-cell {
  display: flex;
  align-items: center;
}

.clause-title {
  font-weight: 500;
  color: #303133;
}

.muted {
  color: #c0c4cc;
  font-size: 13px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

.view-meta {
  padding: 4px 8px;
}

.meta-tags {
  margin-top: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.meta-label {
  font-size: 13px;
  color: #606266;
  margin-right: 4px;
}

.view-content {
  background: #fafafa;
  padding: 24px;
  border-radius: 8px;
  max-height: 500px;
  overflow-y: auto;
}
</style>
