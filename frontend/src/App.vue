<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="logo">
          <el-icon :size="28" color="#409eff"><Document /></el-icon>
          <span class="title">法律文书生成平台</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          router
          class="nav-menu"
          background-color="transparent"
          text-color="#606266"
          active-text-color="#409eff"
        >
          <el-menu-item index="/">
            <el-icon><Collection /></el-icon>
            <span>模板库</span>
          </el-menu-item>
          <el-menu-item index="/documents">
            <el-icon><Files /></el-icon>
            <span>我的文书</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
    <el-footer class="app-footer">
      <p>© 2024 法律文书生成平台 - 在线法律文书智能生成系统</p>
    </el-footer>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 40px;
}

.logo .title {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.nav-menu {
  flex: 1;
  border-bottom: none;
}

.app-main {
  flex: 1;
  background-color: #f5f7fa;
  padding: 24px 0;
}

.app-footer {
  background-color: #fff;
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 14px;
  border-top: 1px solid #ebeef5;
}
</style>
