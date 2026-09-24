<template>
  <view class="key-page">
    <nav-bar title="AI 归档密钥" showBack />
    <view class="content">
      <view class="intro">给密钥起个名字，便于在 AI 归档时选择。密钥有效期为 365 天，可随时撤销。密钥只能新增笔记，不能读取或修改已有笔记。</view>
      <view class="create-box">
        <input v-model="name" maxlength="40" placeholder="例如：个人笔记、工作笔记" class="name-input" />
        <button class="primary-button" :loading="busy" @tap="create">生成密钥</button>
      </view>
      <view v-if="newSecret" class="secret-box">
        <text class="secret-title">请现在复制并保存，离开页面后无法再次查看</text>
        <text class="secret-value" selectable>{{ newSecret }}</text>
        <button class="copy-button" @tap="copySecret">复制密钥</button>
      </view>
      <view class="section-title">我的密钥</view>
      <view v-if="!keys.length" class="empty">还没有密钥</view>
      <view v-for="item in keys" :key="item.id" class="key-card">
        <view class="key-row"><text class="key-name">{{ item.name }}</text><text :class="['status', statusClass(item)]">{{ status(item) }}</text></view>
        <view class="meta">末尾 {{ item.suffix }} · 到期 {{ formatTime(item.expiresAt) }}</view>
        <view v-if="!item.revokedAt" class="actions">
          <text @tap="rotate(item)">重新生成</text>
          <text class="danger" @tap="revoke(item)">撤销</text>
        </view>
      </view>
      <view class="help">把密钥交给 AI Skill 后即可归档。多个密钥可以分别命名，归档时由你选择目标。</view>
      <view class="skill-box">
        <text class="skill-title">Skill 获取地址（点击复制）</text>
        <text class="skill-value" @tap="copySkillRepo">github.com/Academicrubbish/Toolbox/tree/main/skills/ai-note-archive</text>
        <text class="install-tip">不知道怎么装？把安装提示词发给你的 AI，它会自动帮你安装并配好归档：</text>
        <button class="install-button" @tap="copyInstallPrompt">复制安装提示词</button>
      </view>
    </view>
  </view>
</template>

<script>
import NavBar from '@/component/nav-bar/index.vue'
import { listArchiveKeys, createArchiveKey, rotateArchiveKey, revokeArchiveKey } from '@/api/archiveKeys.js'

const SKILL_REPO_URL = 'https://github.com/Academicrubbish/Toolbox/tree/main/skills/ai-note-archive'
// 部署者在 uniCloud 控制台为 archiveNote 配置的 URL 化地址，换域名时同步修改
const ARCHIVE_ENDPOINT = 'https://api.coptis.top/archiveNote'

export default {
  components: { NavBar },
  data() { return { name: '', keys: [], newSecret: '', busy: false } },
  onLoad() { this.load() },
  onUnload() { this.newSecret = '' },
  methods: {
    async load() {
      try { this.keys = await listArchiveKeys() || [] }
      catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
    },
    status(item) {
      if (item.revokedAt) return '已撤销'
      return Date.now() >= item.expiresAt ? '已过期' : '有效'
    },
    statusClass(item) { return item.revokedAt || Date.now() >= item.expiresAt ? 'inactive' : 'active' },
    formatTime(value) {
      const date = new Date(value)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    },
    async create() {
      const name = this.name.trim()
      if (!name) return uni.showToast({ title: '请先填写名称', icon: 'none' })
      this.busy = true
      try {
        const result = await createArchiveKey(name)
        this.newSecret = result.secret
        this.name = ''
        await this.load()
      } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
      finally { this.busy = false }
    },
    copySecret() { uni.setClipboardData({ data: this.newSecret }) },
    copySkillRepo() { uni.setClipboardData({ data: SKILL_REPO_URL }) },
    copyInstallPrompt() {
      uni.setClipboardData({
        data: '请帮我安装 AI 笔记归档 skill：\n' +
          '1. 从 ' + SKILL_REPO_URL + ' 获取 SKILL.md 和 scripts/archive.py，安装到你的 Skills 目录并启用\n' +
          '2. 安装后用该 skill 关联连接：名称「Toolbox」，归档接口 ' + ARCHIVE_ENDPOINT + '，密钥我接下来单独发你\n' +
          '3. 配好后，我对你说「归档这段对话」时，按 skill 流程整理当前对话并保存'
      })
    },
    rotate(item) {
      uni.showModal({ title: '重新生成密钥', content: `旧密钥「${item.name}」会立即失效，确定继续吗？`,
        success: async result => {
          if (!result.confirm) return
          try {
            const created = await rotateArchiveKey(item.id)
            this.newSecret = created.secret
            await this.load()
          } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
        } })
    },
    revoke(item) {
      uni.showModal({ title: '撤销密钥', content: `撤销「${item.name}」后，使用它的 AI 将无法再归档。`,
        success: async result => {
          if (!result.confirm) return
          try { await revokeArchiveKey(item.id); await this.load() }
          catch (error) { uni.showToast({ title: error.message, icon: 'none' }) }
        } })
    }
  }
}
</script>

<style scoped>
.key-page { min-height: 100vh; background: #f7f8fa; }
.content { padding: 40rpx 36rpx 88rpx; }
.intro, .help { color: #6b7280; font-size: 26rpx; line-height: 1.7; }
.create-box, .secret-box, .key-card { background: #fff; border-radius: 28rpx; padding: 36rpx; margin-top: 36rpx; }
.name-input { height: 88rpx; border: 1rpx solid #e5e7eb; border-radius: 18rpx; padding: 0 24rpx; font-size: 28rpx; }
.primary-button, .copy-button { margin-top: 28rpx; background: #4a77e8; color: #fff; font-size: 28rpx; border-radius: 18rpx; }
.secret-box { background: #fff8e7; }
.secret-title { display: block; color: #9a6400; font-size: 26rpx; }
.secret-value { display: block; word-break: break-all; margin-top: 24rpx; font-size: 26rpx; color: #1f2937; }
.section-title { margin-top: 56rpx; font-weight: 600; font-size: 32rpx; }
.empty { text-align: center; color: #9ca3af; margin: 60rpx 0; }
.key-row { display: flex; justify-content: space-between; align-items: center; }
.key-name { font-weight: 600; font-size: 30rpx; }
.status { font-size: 24rpx; }.active { color: #168a4b; }.inactive { color: #9ca3af; }
.meta { margin-top: 18rpx; color: #6b7280; font-size: 24rpx; }
.actions { display: flex; gap: 48rpx; margin-top: 30rpx; color: #4a77e8; font-size: 26rpx; }.danger { color: #d94a4a; }
.help { margin-top: 48rpx; }
.skill-box { background: #eef3fe; border-radius: 18rpx; padding: 24rpx; margin-top: 20rpx; }
.skill-title { display: block; color: #3557b2; font-size: 24rpx; }
.skill-value { display: block; word-break: break-all; margin-top: 12rpx; font-size: 24rpx; color: #1f2937; }
.install-tip { display: block; color: #6b7280; font-size: 24rpx; line-height: 1.6; margin-top: 20rpx; }
.install-button { margin-top: 16rpx; background: #3557b2; color: #fff; font-size: 26rpx; border-radius: 16rpx; }
</style>
