<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="error-page">
    <div class="error-content">
      <h1 class="error-code">404</h1>
      <p class="error-message">抱歉，您访问的页面不存在</p>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $bg-color;
}

.error-content {
  text-align: center;
  
  .error-code {
    font-size: 120px;
    font-weight: 700;
    color: $primary-color;
    margin-bottom: 16px;
    line-height: 1;
  }
  
  .error-message {
    font-size: 20px;
    color: $text-regular;
    margin-bottom: 32px;
  }
  
  .error-actions {
    .el-button {
      margin: 0 8px;
    }
  }
}
</style>
