<template>
  <div class="signature-pad-wrapper">
    <div class="mode-switch">
      <el-radio-group v-model="mode" size="small">
        <el-radio-button value="draw">
          <el-icon><Edit /></el-icon>
          <span>手写签名</span>
        </el-radio-button>
        <el-radio-button value="type">
          <el-icon><EditPen /></el-icon>
          <span>键入生成</span>
        </el-radio-button>
      </el-radio-group>
    </div>

    <div class="pad-area" v-if="mode === 'draw'">
      <div class="canvas-container" :style="{ borderColor: penColor }">
        <canvas
          ref="canvasRef"
          :width="canvasWidth"
          :height="canvasHeight"
          @mousedown="startDraw"
          @mousemove="drawing"
          @mouseup="endDraw"
          @mouseleave="endDraw"
          @touchstart.prevent="handleTouchStart"
          @touchmove.prevent="handleTouchMove"
          @touchend.prevent="handleTouchEnd"
        />
        <div v-if="isEmpty" class="empty-tip">
          <el-icon :size="32" color="#c0c4cc"><EditPen /></el-icon>
          <p>请在此区域绘制签名</p>
        </div>
      </div>
      <div class="draw-tools">
        <div class="tool-group">
          <span class="tool-label">笔触颜色</span>
          <el-color-picker v-model="penColor" size="small" />
        </div>
        <div class="tool-group">
          <span class="tool-label">笔触粗细</span>
          <el-slider v-model="penSize" :min="1" :max="8" :step="0.5" style="width: 120px" />
        </div>
      </div>
    </div>

    <div class="type-area" v-else>
      <div class="type-input-row">
        <el-input
          v-model="signerName"
          placeholder="请输入姓名"
          maxlength="20"
          clearable
          style="flex: 1; max-width: 280px"
          @input="renderTextSignature"
        />
        <div class="tool-group">
          <span class="tool-label">字体</span>
          <el-select v-model="fontFamily" size="small" @change="renderTextSignature">
            <el-option label="行楷" value="STKaiti, KaiTi, serif" />
            <el-option label="草书" value="STCaiyun, cursive" />
            <el-option label="隶书" value="STLiti, LiSu, serif" />
            <el-option label="艺术体" value="STXingkai, cursive" />
            <el-option label="手写体" value="Brush Script MT, cursive" />
          </el-select>
        </div>
        <div class="tool-group">
          <span class="tool-label">颜色</span>
          <el-color-picker v-model="textColor" size="small" @change="renderTextSignature" />
        </div>
      </div>
      <div class="text-canvas-container" :style="{ borderColor: textColor }">
        <canvas
          ref="textCanvasRef"
          :width="canvasWidth"
          :height="canvasHeight"
        />
        <div v-if="!signerName" class="empty-tip">
          <el-icon :size="32" color="#c0c4cc"><EditPen /></el-icon>
          <p>输入姓名后自动生成签名</p>
        </div>
      </div>
    </div>

    <div class="action-row">
      <el-button size="small" @click="clearPad">
        <el-icon><RefreshLeft /></el-icon>
        清除
      </el-button>
      <el-button size="small" @click="undo" :disabled="historyStack.length === 0">
        <el-icon><RefreshRight /></el-icon>
        撤销
      </el-button>
      <el-button size="small" @click="previewSignature" :disabled="isEmpty && !signerName">
        <el-icon><View /></el-icon>
        预览
      </el-button>
    </div>

    <el-dialog v-model="previewVisible" title="签名预览" width="500px" align-center>
      <div class="preview-img-box">
        <img v-if="previewDataUrl" :src="previewDataUrl" class="preview-img" />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="confirmSignature">确认使用此签名</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, EditPen, RefreshLeft, RefreshRight, View } from '@element-plus/icons-vue'

const props = defineProps({
  width: { type: Number, default: 480 },
  height: { type: Number, default: 200 },
  defaultName: { type: String, default: '' }
})

const emit = defineEmits(['change', 'confirm'])

const canvasRef = ref(null)
const textCanvasRef = ref(null)
const mode = ref('draw')
const penColor = ref('#1e40af')
const penSize = ref(2.5)
const textColor = ref('#1e40af')
const fontFamily = ref('STKaiti, KaiTi, serif')
const signerName = ref(props.defaultName)
const isDrawing = ref(false)
const historyStack = ref([])
const previewVisible = ref(false)
const previewDataUrl = ref('')

const canvasWidth = computed(() => props.width)
const canvasHeight = computed(() => props.height)

let ctx = null
let textCtx = null
let lastX = 0
let lastY = 0

const isEmpty = computed(() => {
  if (!canvasRef.value) return true
  return historyStack.value.length === 0
})

const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  ctx.strokeStyle = penColor.value
  ctx.lineWidth = penSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  saveHistory()
}

const initTextCanvas = () => {
  const canvas = textCanvasRef.value
  if (!canvas) return
  textCtx = canvas.getContext('2d')
  clearTextCanvas()
}

const clearTextCanvas = () => {
  if (!textCtx) return
  textCtx.fillStyle = '#ffffff'
  textCtx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
}

const saveHistory = () => {
  if (!canvasRef.value) return
  try {
    const data = canvasRef.value.toDataURL('image/png')
    historyStack.value.push(data)
    if (historyStack.value.length > 30) {
      historyStack.value.shift()
    }
  } catch (e) {
    console.warn('保存历史失败', e)
  }
}

const getPos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

const startDraw = (e) => {
  if (!ctx) return
  isDrawing.value = true
  const pos = getPos(e)
  lastX = pos.x
  lastY = pos.y
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(lastX + 0.1, lastY + 0.1)
  ctx.stroke()
}

const drawing = (e) => {
  if (!isDrawing.value || !ctx) return
  const pos = getPos(e)
  ctx.strokeStyle = penColor.value
  ctx.lineWidth = penSize.value
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  lastX = pos.x
  lastY = pos.y
}

const endDraw = () => {
  if (!isDrawing.value) return
  isDrawing.value = false
  saveHistory()
  emitChange()
}

const handleTouchStart = (e) => {
  if (!e.touches || e.touches.length === 0) return
  const touch = e.touches[0]
  startDraw({ clientX: touch.clientX, clientY: touch.clientY })
}

const handleTouchMove = (e) => {
  if (!e.touches || e.touches.length === 0) return
  const touch = e.touches[0]
  drawing({ clientX: touch.clientX, clientY: touch.clientY })
}

const handleTouchEnd = () => {
  endDraw()
}

const undo = () => {
  if (historyStack.value.length <= 1) return
  historyStack.value.pop()
  const prevData = historyStack.value[historyStack.value.length - 1]
  const img = new window.Image()
  img.onload = () => {
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
    ctx.drawImage(img, 0, 0, canvasWidth.value, canvasHeight.value)
    emitChange()
  }
  img.src = prevData
}

const clearPad = () => {
  if (mode.value === 'draw') {
    initCanvas()
    historyStack.value = []
    saveHistory()
  } else {
    signerName.value = ''
    clearTextCanvas()
  }
  emitChange()
}

const renderTextSignature = () => {
  if (!textCtx) return
  clearTextCanvas()
  if (!signerName.value.trim()) return

  const name = signerName.value.trim()
  const fontSize = name.length <= 2 ? 120 : name.length <= 3 ? 100 : 80

  textCtx.save()
  textCtx.font = `bold ${fontSize}px ${fontFamily.value}`
  textCtx.fillStyle = textColor.value
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'

  const x = canvasWidth.value / 2
  const y = canvasHeight.value / 2

  textCtx.translate(x, y)
  textCtx.rotate(-0.05)
  textCtx.shadowColor = 'rgba(30, 64, 175, 0.1)'
  textCtx.shadowBlur = 2
  textCtx.shadowOffsetX = 1
  textCtx.shadowOffsetY = 1
  textCtx.fillText(name, 0, 0)
  textCtx.restore()

  emitChange()
}

const emitChange = () => {
  const data = getSignatureDataUrl()
  emit('change', data)
}

const getSignatureDataUrl = () => {
  if (mode.value === 'draw') {
    if (!canvasRef.value) return ''
    return canvasRef.value.toDataURL('image/png')
  } else {
    if (!textCanvasRef.value || !signerName.value.trim()) return ''
    return textCanvasRef.value.toDataURL('image/png')
  }
}

const getSignatureBase64 = () => {
  const dataUrl = getSignatureDataUrl()
  if (!dataUrl) return ''
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
  return match ? match[1] : ''
}

const previewSignature = () => {
  previewDataUrl.value = getSignatureDataUrl()
  if (!previewDataUrl.value) {
    ElMessage.warning('请先完成签名')
    return
  }
  previewVisible.value = true
}

const confirmSignature = () => {
  const data = getSignatureDataUrl()
  const base64 = getSignatureBase64()
  emit('confirm', {
    dataUrl: data,
    base64: base64,
    mode: mode.value,
    name: signerName.value
  })
  previewVisible.value = false
  ElMessage.success('签名已确认')
}

watch(penColor, () => {
  if (ctx) {
    ctx.strokeStyle = penColor.value
  }
})

watch(penSize, () => {
  if (ctx) {
    ctx.lineWidth = penSize.value
  }
})

onMounted(async () => {
  await nextTick()
  initCanvas()
  initTextCanvas()
  if (signerName.value) {
    renderTextSignature()
  }
})

defineExpose({
  getSignatureDataUrl,
  getSignatureBase64,
  clearPad,
  confirmSignature
})
</script>

<style scoped>
.signature-pad-wrapper {
  padding: 8px;
}

.mode-switch {
  margin-bottom: 14px;
  text-align: center;
}

.canvas-container,
.text-canvas-container {
  position: relative;
  background: #fff;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
  transition: border-color 0.25s;
}

.canvas-container:hover,
.text-canvas-container:hover {
  border-color: #409eff;
}

.canvas-container canvas,
.text-canvas-container canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
}

.empty-tip {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  pointer-events: none;
  font-size: 14px;
}

.empty-tip p {
  margin: 8px 0 0;
}

.draw-tools,
.type-input-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.action-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.preview-img-box {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 220px;
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
}

.preview-img {
  max-width: 100%;
  max-height: 300px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fff;
}
</style>
