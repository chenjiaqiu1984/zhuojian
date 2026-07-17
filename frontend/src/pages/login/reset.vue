<template>
  <view class="page">
    <view class="form-card">
      <text class="title">找回密码</text>
      <view class="input-wrap"><input class="ipt" v-model="form.target" placeholder="请输入手机号" type="number" maxlength="11" /></view>
      <view class="captcha-row" style="margin-bottom:24rpx">
        <image class="captcha-img" :src="captchaUrl" @click="refreshCaptcha()" mode="aspectFit" />
        <view class="input-wrap" style="flex:1;margin-bottom:0">
          <input class="ipt" v-model="captchaAnswer" placeholder="点击图片可刷新" maxlength="4" />
        </view>
      </view>
      <view class="code-row" style="margin-bottom:24rpx">
        <view class="input-wrap" style="flex:1;margin-bottom:0">
          <input class="ipt" v-model="form.code" placeholder="验证码" type="number" maxlength="6" />
        </view>
        <view class="send-code-btn" :class="{'send-code-btn--disabled': form.countdown>0}" @click="form.countdown<=0 && sendCode()">
          <text class="send-code-btn-text">{{form.countdown>0 ? `${form.countdown}s` : '获取验证码'}}</text>
        </view>
      </view>
      <view class="input-wrap"><input class="ipt" v-model="form.newPwd" placeholder="新密码（含字母和数字，至少6位）" password /></view>
      <view class="input-wrap" style="margin-top:16rpx"><input class="ipt" v-model="form.confirmPwd" placeholder="再次输入新密码" password /></view>
      <view class="submit-btn" :class="{'submit-btn--loading': loading}" @click="!loading && doReset()" style="margin-top:32rpx">
        <text class="submit-btn-text">{{ loading ? '重置中...' : '确认重置' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authApi } from '../../api/index';
import { hashPassword } from '../../utils/crypto';
import { useCaptcha } from '../../composables/useCaptcha';

const form = ref({ target: '', code: '', newPwd: '', confirmPwd: '', countdown: 0 });
const loading = ref(false);
const { captchaUrl, captchaToken, captchaAnswer, refreshCaptcha } = useCaptcha();
onMounted(() => refreshCaptcha());

// 密码强度：至少6位，且同时包含字母和数字
function checkPwd(p) {
  if (p.length < 6) return '密码至少6位';
  if (!/[A-Za-z]/.test(p)) return '密码必须包含字母';
  if (!/[0-9]/.test(p)) return '密码必须包含数字';
  return '';
}

function startCountdown() {
  form.value.countdown = 60;
  const t = setInterval(() => { if (--form.value.countdown <= 0) clearInterval(t); }, 1000);
}

async function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(form.value.target)) return uni.showToast({ title: '手机号格式错误', icon: 'none' });
  if (!captchaAnswer.value) return uni.showToast({ title: '请输入图形验证码', icon: 'none' });
  try {
    await authApi.sendReset(form.value.target, captchaToken.value, captchaAnswer.value);
    startCountdown(); uni.showToast({ title: '验证码已发送' });
  }
  catch (e) { refreshCaptcha(); uni.showToast({ title: e.error || '发送失败', icon: 'none' }); }
}

async function doReset() {
  if (!form.value.code || !form.value.newPwd) return uni.showToast({ title: '请填写完整', icon: 'none' });
  const pwdErr = checkPwd(form.value.newPwd);
  if (pwdErr) return uni.showToast({ title: pwdErr, icon: 'none' });
  if (form.value.newPwd !== form.value.confirmPwd) return uni.showToast({ title: '两次密码不一致', icon: 'none' });
  loading.value = true;
  try {
    await authApi.resetPassword(form.value.target, form.value.code, await hashPassword(form.value.newPwd));
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
.captcha-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.captcha-img { width: 200rpx; height: 80rpx; border-radius: 8rpx; background: #f5f6f8; flex-shrink: 0; border: 2rpx solid #e8e8e8; }
.code-row { display: flex; align-items: center; gap: 16rpx; }
.send-code-btn {
  flex-shrink: 0; margin-left: 16rpx;
  border: 1.5rpx solid #4A8A7A; border-radius: 12rpx; padding: 18rpx 20rpx; background: #fff;
  &--disabled { border-color: #ccc; }
}
.send-code-btn-text { font-size: 24rpx; color: #4A8A7A; .send-code-btn--disabled & { color: #ccc; } }
.submit-btn {
  background: #4A8A7A; border-radius: 16rpx; padding: 26rpx 0; text-align: center;
  &--loading { opacity: 0.7; }
}
.submit-btn-text { color: #fff; font-size: 30rpx; font-weight: 700; }
</style>
