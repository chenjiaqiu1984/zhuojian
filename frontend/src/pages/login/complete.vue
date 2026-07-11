<template>
  <view class="page">
    <view class="form-card">
      <text class="title">完善账户信息</text>
      <text class="sub">请阅读并同意用户协议，设置昵称和登录密码，以便正常使用全部功能</text>

      <view class="field-group">
        <text class="field-label">昵称 <text class="required">*</text></text>
        <view class="input-wrap">
          <input class="ipt" v-model="form.name" placeholder="请输入你的昵称" maxlength="20" />
        </view>
      </view>

      <view class="field-group">
        <text class="field-label">设置密码 <text class="required">*</text></text>
        <view class="input-wrap">
          <input class="ipt" v-model="form.password" placeholder="至少6位" password />
        </view>
      </view>

      <view class="field-group">
        <text class="field-label">确认密码 <text class="required">*</text></text>
        <view class="input-wrap">
          <input class="ipt" v-model="form.confirm" placeholder="再次输入密码" password />
        </view>
      </view>

      <!-- 用户协议 -->
      <view class="terms-row" @click="form.agreed = !form.agreed">
        <view :class="['checkbox', form.agreed && 'checked']" />
        <text class="terms-txt">
          我已阅读并同意
          <text class="terms-link" @click.stop="uni.navigateTo({ url: '/pages/legal/terms' })">《用户服务协议》</text>
          和
          <text class="terms-link" @click.stop="uni.navigateTo({ url: '/pages/legal/privacy' })">《隐私政策》</text>
        </text>
      </view>

      <view class="submit-btn" @click="submit()">
        <text>{{loading ? '保存中...' : '完成设置'}}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../../store/user';

const store = useUserStore();
const loading = ref(false);
const form = ref({ name: '', password: '', confirm: '', agreed: false });

async function submit() {
  if (!form.value.name.trim()) return uni.showToast({ title: '请输入昵称', icon: 'none' });
  const p = form.value.password;
  if (p.length < 6) return uni.showToast({ title: '密码至少6位', icon: 'none' });
  if (!/[A-Za-z]/.test(p)) return uni.showToast({ title: '密码必须包含字母', icon: 'none' });
  if (!/[0-9]/.test(p)) return uni.showToast({ title: '密码必须包含数字', icon: 'none' });
  if (p !== form.value.confirm) return uni.showToast({ title: '两次密码不一致', icon: 'none' });
  if (!form.value.agreed) return uni.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });

  loading.value = true;
  try {
    await store.completeSetup(form.value.name.trim(), form.value.password, true);
    uni.showToast({ title: '设置完成' });
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000);
  } catch (e) {
    uni.showToast({ title: e?.error || '保存失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: linear-gradient(160deg, #4A8A7A 0%, #3A6E80 100%);
  display: flex; flex-direction: column;
}
.form-card {
  background: #fff; flex: 1;
  border-radius: 40rpx 40rpx 0 0;
  margin-top: 80rpx; padding: 48rpx 40rpx 80rpx;
  display: flex; flex-direction: column;
}
.title { font-size: 40rpx; font-weight: 800; color: #1C2A27; display: block; margin-bottom: 12rpx; }
.sub { font-size: 24rpx; color: #8A9E97; display: block; margin-bottom: 40rpx; line-height: 1.6; }
.field-group { display: flex; flex-direction: column; gap: 10rpx; margin-bottom: 24rpx; }
.field-label { font-size: 24rpx; font-weight: 600; color: #617870; padding-left: 4rpx; }
.required { color: #E05A4A; }
.input-wrap {
  background: #F7F9F8; border-radius: 16rpx;
  border: 2rpx solid #E8EDEB; padding: 0 24rpx; height: 96rpx;
  display: flex; align-items: center;
}
.input-wrap:focus-within { border-color: #4A8A7A; }
.ipt { flex: 1; height: 96rpx; font-size: 28rpx; color: #1C2A27; background: transparent; }

/* 协议勾选 */
.terms-row {
  display: flex; align-items: flex-start; gap: 16rpx;
  margin: 8rpx 0 40rpx; cursor: pointer;
}
.checkbox {
  width: 40rpx; height: 40rpx; flex-shrink: 0; margin-top: 2rpx;
  border: 2rpx solid #C0CCC8; border-radius: 8rpx; background: #fff;
  transition: all 0.2s;
}
.checkbox.checked { background: #4A8A7A; border-color: #4A8A7A; position: relative; }
.checkbox.checked::after {
  content: '✓'; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%); color: #fff; font-size: 24rpx; line-height: 1;
}
.terms-txt { font-size: 24rpx; color: #617870; line-height: 1.7; flex: 1; }
.terms-link { color: #4A8A7A; font-weight: 600; }

.submit-btn {
  background: linear-gradient(135deg, #4A8A7A, #3A6E80);
  border-radius: 16rpx; padding: 28rpx 0;
  text-align: center;
}
.submit-btn text { color: #fff; font-size: 30rpx; font-weight: 700; letter-spacing: 1rpx; }
</style>
