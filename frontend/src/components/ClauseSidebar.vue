<template>
  <div class="clause-sidebar">
    <el-card shadow="hover" class="recommend-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon :size="18" color="#67c23a"><MagicStick /></el-icon>
            <span class="header-title">智能条款推荐</span>
            <el-tag v-if="recommendedList.length" type="success" size="small" effect="plain">
              {{ recommendedList.length }} 条
            </el-tag>
          </div>
          <el-button
            link
            size="small"
            type="primary"
            :loading="loading"
            @click="fetchRecommend"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-empty v-if="!loading && recommendedList.length === 0" description="暂无推荐条款" :image-size="80" />

      <div v-else class="clause-list" v-loading="loading">
        <div
          v-for="clause in recommendedList"
          :key="clause.id"
          class="clause-item"
          :class="{ 'applied': appliedIds.includes(clause.id) }"
        >
          <div class="clause-header" @click="toggleExpand(clause.id)">
            <div class="clause-title-row">
              <el-icon :size="14" color="#909399" class="expand-icon">
                <CaretBottom v-if="expandedIds.includes(clause.id)" />
                <CaretRight v-else />
              </el-icon>
              <span class="clause-title">{{ clause.title }}</span>
            </div>
            <div class="clause-tags">
              <el-tag v-if="clause.category" size="small" type="info" effect="light">
                {{ clause.category }}
              </el-tag>
              <el-tag
                v-if="clause.score !== undefined"
                size="small"
                :type="scoreType(clause.score)"
                effect="plain"
              >
                匹配度 {{ clause.score }}
              </el-tag>
            </div>
          </div>

          <div v-show="expandedIds.includes(clause.id)" class="clause-body">
            <div class="clause-tags-list" v-if="clause.tags && clause.tags.length">
              <el-tag
                v-for="tag in clause.tags"
                :key="tag"
                size="small"
                effect="plain"
                type="warning"
                style="margin: 2px 4px 2px 0"
              >
                #{{ tag }}
              </el-tag>
            </div>
            <div class="clause-content">
              <pre>{{ clause.content }}</pre>
            </div>
            <div class="clause-actions">
              <el-button
                size="small"
                type="primary"
                plain
                @click.stop="applyClause(clause, 'append')"
                :disabled="appliedIds.includes(clause.id)"
              >
                <el-icon><Plus /></el-icon>
                追加到文末
              </el-button>
              <el-button
                size="small"
                type="success"
                plain
                @click.stop="applyClause(clause, 'replace')"
                :disabled="appliedIds.includes(clause.id)"
              >
                <el-icon><Promotion /></el-icon>
                替换默认条款
              </el-button>
              <el-button
                size="small"
                type="info"
                plain
                @click.stop="copyContent(clause.content)"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制内容
              </el-button>
            </div>
            <div v-if="appliedIds.includes(clause.id)" class="applied-mark">
              <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
              已应用
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card shadow="hover" class="library-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon :size="18" color="#409eff"><Collection /></el-icon>
            <span class="header-title">全部条款库</span>
          </div>
          <el-button
            link
            size="small"
            type="primary"
            @click="showLibraryDialog = true"
          >
            <el-icon><View /></el-icon>
            查看全部
          </el-button>
        </div>
      </template>

      <div class="library-categories">
        <el-tag
          v-for="cat in categories"
          :key="cat.category"
          size="small"
          style="margin: 3px"
          effect="plain"
          :type="activeCategory === cat.category ? 'primary' : 'info'"
          @click="filterByCategory(cat.category)"
          class="cat-tag"
        >
          {{ cat.category }} ({{ cat.count }})
        </el-tag>
      </div>
    </el-card>

    <el-dialog
      v-model="showLibraryDialog"
      title="条款库"
      width="720px"
      destroy-on-close
    >
      <div class="library-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索条款标题、内容、关键词..."
          clearable
          @clear="fetchLibraryList"
          @keyup.enter="fetchLibraryList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="fetchLibraryList">搜索</el-button>
          </template>
        </el-input>
      </div>
      <div class="library-dialog-list" v-loading="libraryLoading">
        <div
          v-for="clause in libraryList"
          :key="clause.id"
          class="library-item"
        >
          <div class="lib-item-header">
            <span class="lib-item-title">{{ clause.title }}</span>
            <div class="lib-item-tags">
              <el-tag v-if="clause.category" size="small" type="info">{{ clause.category }}</el-tag>
            </div>
          </div>
          <div class="lib-item-content">
            <pre>{{ clause.content }}</pre>
          </div>
          <div class="lib-item-actions">
            <el-button
              size="small"
              type="primary"
              plain
              @click="applyClause(clause, 'append')"
            >
              追加
            </el-button>
            <el-button
              size="small"
              type="success"
              plain
              @click="applyClause(clause, 'replace')"
            >
              替换
            </el-button>
            <el-button
              size="small"
              type="info"
              plain
              @click="copyContent(clause.content)"
            >
              复制
            </el-button>
          </div>
        </div>
        <el-empty v-if="!libraryLoading && libraryList.length === 0" />
      </div>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[8, 15, 25]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          background
          small
          @size-change="fetchLibraryList"
          @current-change="fetchLibraryList"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  MagicStick, Refresh, CaretBottom, CaretRight, Plus, Promotion,
  DocumentCopy, CircleCheckFilled, Collection, View, Search
} from '@element-plus/icons-vue'
import {
  recommendClauses,
  getClauseList,
  getClauseCategories
} from '@/api/clause'

const props = defineProps({
  templateType: { type: String, default: '' },
  templateTitle: { type: String, default: '' },
  formData: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['apply-clause'])

const loading = ref(false)
const libraryLoading = ref(false)
const recommendedList = ref([])
const expandedIds = ref([])
const appliedIds = ref([])
const categories = ref([])
const showLibraryDialog = ref(false)
const libraryList = ref([])
const searchKeyword = ref('')
const activeCategory = ref('')
const page = ref(1)
const pageSize = ref(8)
const total = ref(0)

const fetchRecommend = async () => {
  if (!props.templateType && !props.templateTitle) return
  loading.value = true
  try {
    const data = await recommendClauses({
      templateType: props.templateType,
      templateTitle: props.templateTitle,
      formData: JSON.stringify(props.formData),
      limit: 8
    })
    recommendedList.value = Array.isArray(data) ? data : (data.list || [])
  } catch (error) {
    console.warn('获取推荐条款失败', error)
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

const fetchLibraryList = async () => {
  libraryLoading.value = true
  try {
    const data = await getClauseList({
      keyword: searchKeyword.value || undefined,
      category: activeCategory.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    libraryList.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.warning('获取条款列表失败')
  } finally {
    libraryLoading.value = false
  }
}

const filterByCategory = (cat) => {
  activeCategory.value = activeCategory.value === cat ? '' : cat
  showLibraryDialog.value = true
  page.value = 1
  fetchLibraryList()
}

const toggleExpand = (id) => {
  const idx = expandedIds.value.indexOf(id)
  if (idx >= 0) {
    expandedIds.value.splice(idx, 1)
  } else {
    expandedIds.value.push(id)
  }
}

const scoreType = (score) => {
  if (score >= 30) return 'success'
  if (score >= 15) return 'warning'
  return 'info'
}

const applyClause = (clause, mode) => {
  appliedIds.value.push(clause.id)
  emit('apply-clause', {
    clause,
    mode,
    timestamp: Date.now()
  })
  ElMessage.success(`已${mode === 'append' ? '追加' : '替换'}条款：${clause.title}`)
}

const copyContent = (content) => {
  try {
    navigator.clipboard.writeText(content)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    const textarea = document.createElement('textarea')
    textarea.value = content
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('已复制到剪贴板')
  }
}

watch(
  () => [props.formData, props.templateType, props.templateTitle],
  () => {
    fetchRecommend()
  },
  { deep: true }
)

onMounted(() => {
  fetchRecommend()
  fetchCategories()
})
</script>

<style scoped>
.clause-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-weight: 600;
  font-size: 14px;
}

.clause-list {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.clause-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.clause-item:hover {
  border-color: #c6e2ff;
}

.clause-item.applied {
  border-color: #67c23a;
  background: #f0f9eb;
}

.clause-header {
  padding: 10px 12px;
  background: #fafbfc;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.clause-header:hover {
  background: #f5f7fa;
}

.clause-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.expand-icon {
  flex-shrink: 0;
}

.clause-title {
  font-weight: 500;
  font-size: 13px;
  color: #303133;
  line-height: 1.4;
  word-break: break-all;
}

.clause-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.clause-body {
  padding: 12px;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

.clause-tags-list {
  margin-bottom: 8px;
}

.clause-content {
  background: #f8f9fb;
  padding: 10px 12px;
  border-radius: 4px;
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.clause-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.7;
  color: #606266;
}

.clause-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.applied-mark {
  margin-top: 8px;
  color: #67c23a;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.library-categories {
  display: flex;
  flex-wrap: wrap;
}

.cat-tag {
  cursor: pointer;
}

.library-search {
  margin-bottom: 16px;
}

.library-dialog-list {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.library-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
}

.lib-item-header {
  padding: 10px 14px;
  background: #fafbfc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lib-item-title {
  font-weight: 600;
  color: #303133;
}

.lib-item-content {
  padding: 10px 14px;
  max-height: 180px;
  overflow-y: auto;
  background: #fcfcfd;
}

.lib-item-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

.lib-item-actions {
  padding: 10px 14px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
