<template>
  <view v-if="visible" class="overlay">
    <view class="modal">
      <view class="modal-head">
        <text class="modal-title">用户服务协议已更新</text>
        <text class="modal-version">版本 {{current.version}}　· 发布于 {{fmtDate(current.publishedAt)}}</text>
      </view>

      <!-- 协议内容滚动区 -->
      <scroll-view scroll-y class="content-scroll">
        <text class="content-text">{{current.content}}</text>
      </scroll-view>

      <view class="footer">
        <text class="hint">继续使用前，请阅读并同意新版协议</text>
        <view class="btn-accept" @click="tapHandler = accept">
          <text class="btn-text">{{ loading ? '处理中...' : '我已阅读并同意' }}</text>
        </view>
        <view class="btn-decline" @click="tapHandler = decline">
          <text class="btn-decline-text">不同意（将退出登录）</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import {ref, watch } from 'vue';
import { useUserStore } from '../store/user';
import { SERVER } from '../config';

// #ifndef H5
const tapHandler = ref(null);
watch(tapHandler, () => { if (tapHandler.value) { const fn = tapHandler.value; tapHandler.value = null; fn(); } });
// #endif

const visible = ref(false);
const loading = ref(false);
const current = ref({ version: '', content: '', publishedAt: null });
const store = useUserStore();

async function check() {
  // 未登录不检查
  if (!store.isLoggedIn()) return;

  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: `${SERVER}/api/terms/current`,
        method: 'GET',
        header: { Authorization: `Bearer ${uni.getStorageSync('token')}` },
        success: r => r.statusCode >= 400 ? reject(r.data) : resolve(r.data),
        fail: reject,
      });
    });

    if (!res) return; // 还没有发布过协议

    const userAcceptedAt = store.user?.termsAcceptedAt;
    const needConfirm = !userAcceptedAt || new Date(userAcceptedAt) < new Date(res.publishedAt);

    if (needConfirm) {
      current.value = res;
      visible.value = true;
    }
  } catch (_) {
    // 网络异常不阻断
  }
}

async function accept() {
  loading.value = true;
  try {
    await new Promise((resolve, reject) => {
      uni.request({
        url: `${SERVER}/api/terms/accept`,
        method: 'POST',
        header: { Authorization: `Bearer ${uni.getStorageSync('token')}` },
        success: r => r.statusCode >= 400 ? reject(r.data) : resolve(r.data),
        fail: reject,
      });
    });
    // 更新本地用户信息
    if (store.user) {
      store.user.termsAcceptedAt = new Date().toISOString();
      uni.setStorageSync('user', JSON.stringify(store.user));
    }
    visible.value = false;
    uni.showToast({ title: '感谢你的确认', icon: 'success' });
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function decline() {
  store.logout();
  visible.value = false;
  uni.reLaunch({ url: '/pages/login/index' });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

defineExpose({ check });
</script>

<style scoped lang="scss">
.overlay {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(0,0,0,.65);
  display: flex; align-items: flex-end;
}

.modal {
  background: #fff; width: 100%;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 88vh;
  display: flex; flex-direction: column;
}

.modal-head {
  padding: 36rpx 40rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
.modal-title {
  display: block; font-size: 34rpx; font-weight: 800;
  color: #1C2A27; margin-bottom: 8rpx;
}
.modal-version { font-size: 22rpx; color: #9BBCB4; }

.content-scroll { flex: 1; padding: 24rpx 40rpx; }
.content-text {
  font-size: 25rpx; color: #555; line-height: 1.9;
  white-space: pre-wrap;
}

.footer {
  padding: 20rpx 32rpx 48rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
.hint { display: block; font-size: 22rpx; color: #aaa; text-align: center; margin-bottom: 20rpx; }

.btn-accept {
  background: linear-gradient(135deg, #4A8A7A, #3A6E80);
  border-radius: 16rpx; padding: 26rpx 0;
  text-align: center; margin-bottom: 16rpx;
}
.btn-text { color: #fff; font-size: 30rpx; font-weight: 700; }

.btn-decline { padding: 16rpx 0; text-align: center; }
.btn-decline-text { font-size: 24rpx; color: #ccc; }
</style>
