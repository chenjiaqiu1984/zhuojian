<template>
  <view class="page">
    <view class="form-card">
      <text class="title">找回密码</text>
      <view class="input-wrap"><input class="ipt" v-model="form.target" placeholder="手机号或邮箱" /></view>
      <view class="code-row" style="margin-bottom:24rpx">
        <view class="input-wrap" style="flex:1;margin-bottom:0">
          <input class="ipt" v-model="form.code" placeholder="验证码" type="number" maxlength="6" />
        </view>
        <u-button size="mini" :disabled="form.countdown>0" @click="sendCode" type="primary" plain style="margin-left:16rpx;flex-shrink:0">
          {{form.countdown>0 ? `${form.countdown}s` : '获取验证码'}}
        </u-button>
      </view>
      <view class="input-wrap"><input class="ipt" v-model="form.newPwd" placeholder="新密码（6位以上）" password /></view>
      <u-button type="primary" @click="doReset" :loading="loading" style="margin-top:32rpx">确认重置</u-button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { authApi } from '../../api/index';

const form = ref({ target: '', code: '', newPwd: '', countdown: 0 });
const loading = ref(false);

function startCountdown() {
  form.value.countdown = 60;
  const t = setInterval(() => { if (--form.value.countdown <= 0) clearInterval(t); }, 1000);
}

async function sendCode() {
  if (!form.value.target) return uni.showToast({ title: '请输入手机号或邮箱', icon: 'none' });
  try { await authApi.sendReset(form.value.target); startCountdown(); uni.showToast({ title: '验证码已发送' }); }
  catch (e) { uni.showToast({ title: e.error || '发送失败', icon: 'none' }); }
}

async function doReset() {
  if (!form.value.code || !form.value.newPwd) return uni.showToast({ title: '请填写完整', icon: 'none' });
  loading.value = true;
  try {
    await authApi.resetPassword(form.value.target, form.value.code, form.value.newPwd);
    uni.showToast({ title: '密码已重置，请重新登录' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) { uni.showToast({ title: e.error || '重置失败', icon: 'none' }); }
  finally { loading.value = false; }
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: linear-gradient(160deg,#4A8A7A 0%,#3A6E80 100%); display: flex; flex-direction: column; }
.form-card { background: #fff; flex: 1; border-radius: 40rpx 40rpx 0 0; margin-top: 80rpx; padding: 48rpx 40rpx 80rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 32rpx; }
.input-wrap { background: #f5f6f8; border-radius: 16rpx; border: 2rpx solid #e8e8e8; padding: 0 24rpx; height: 96rpx; display: flex; align-items: center; margin-bottom: 24rpx; }
.ipt { flex: 1; height: 96rpx; font-size: 28rpx; color: #333; background: transparent; }
.code-row { display: flex; align-items: center; }
</style>
