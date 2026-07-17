<template>
  <view class="page">
    <view class="section">
      <text class="section-title">基本信息</text>
      <view class="row">
        <text class="label">昵称</text>
        <input class="input" v-model="form.name" placeholder="请输入昵称" />
      </view>
      <text class="btn-save" @click="saveName()">保存</text>
    </view>

    <!-- 绑定/更换手机 -->
    <view class="section">
      <text class="section-title">手机号</text>
      <view v-if="store.user?.phone && !changingPhone" class="bound-row">
        <text class="bound-val">{{store.user.phone}}</text>
        <text class="bound-action" @click="startChangePhone()">更换</text>
      </view>
      <template v-else>
        <view class="row">
          <text class="label">手机号</text>
          <input class="input" v-model="phoneForm.phone" placeholder="请输入新手机号" type="number" maxlength="11" />
        </view>
        <view class="captcha-row">
          <image class="captcha-img" :src="captchaUrl" @click="refreshCaptcha()" mode="aspectFit" />
          <input class="input captcha-input" v-model="captchaAnswer" placeholder="点击图片可刷新" maxlength="4" />
        </view>
        <view class="row">
          <text class="label">验证码</text>
          <input class="input" v-model="phoneForm.code" placeholder="请输入验证码" type="number" maxlength="6" />
          <text class="btn-code" :class="{disabled: phoneCd > 0}" @click="sendPhoneCode()">
            {{phoneCd > 0 ? `${phoneCd}s` : '发送'}}
          </text>
        </view>
        <view style="display:flex;gap:16rpx">
          <text class="btn-save btn-cancel" style="flex:1" v-if="changingPhone" @click="cancelChangePhone()">取消</text>
          <view class="btn-save" style="flex:2" @click="submitPhone()">
            {{store.user?.phone ? '确认更换' : '绑定手机'}}
          </view>
        </view>
      </template>
    </view>

    <!-- 修改密码 -->
    <view class="section">
      <text class="section-title">修改密码</text>
      <view class="row">
        <text class="label">原密码</text>
        <input class="input" v-model="pwdForm.old" placeholder="请输入原密码" password />
      </view>
      <view class="row">
        <text class="label">新密码</text>
        <input class="input" v-model="pwdForm.new1" placeholder="至少6位" password />
      </view>
      <view class="row">
        <text class="label">确认密码</text>
        <input class="input" v-model="pwdForm.new2" placeholder="再次输入新密码" password />
      </view>
      <text class="btn-save" @click="changePassword()">修改密码</text>
    </view>

    <!-- 法律文件 -->
    <view class="section">
      <text class="section-title">法律与隐私</text>
      <view class="legal-item" @click="uni.navigateTo({url:'/pages/legal/terms'})">
        <view class="legal-left">
          <text class="legal-label">用户服务协议</text>
          <text v-if="store.user?.termsAcceptedAt" class="legal-signed">
            已签署 · {{fmtDate(store.user.termsAcceptedAt)}}
          </text>
          <text v-else class="legal-unsigned">未签署</text>
        </view>
        <text class="legal-arrow">›</text>
      </view>
      <view class="legal-item" @click="uni.navigateTo({url:'/pages/legal/privacy'})">
        <text class="legal-label">隐私政策</text>
        <text class="legal-arrow">›</text>
      </view>
      <text class="disclaimer">本平台不提供医疗诊断。如有心理危机请拨打上海希望热线  400-161-9995</text>
    </view>
  </view>
</template>

<script setup>
import {ref, onMounted, watch } from 'vue';
import { useUserStore } from '../../store/user';
import { authApi } from '../../api/index';
import { hashPassword } from '../../utils/crypto';
import { useCaptcha } from '../../composables/useCaptcha';


const store = useUserStore();
const form = ref({ name: store.user?.name || '' });
const phoneForm = ref({ phone: '', code: '' });
const phoneCd = ref(0);
const pwdForm = ref({ old: '', new1: '', new2: '' });
const changingPhone = ref(false);
const { captchaUrl, captchaToken, captchaAnswer, refreshCaptcha } = useCaptcha();
onMounted(() => { if (!store.user?.phone) refreshCaptcha(); });

function startCd(cd) {
  cd.value = 60;
  const t = setInterval(() => { cd.value--; if (cd.value <= 0) clearInterval(t); }, 1000);
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function startChangePhone() {
  phoneForm.value = { phone: '', code: '' };
  phoneCd.value = 0;
  changingPhone.value = true;
  refreshCaptcha();
}

function cancelChangePhone() {
  changingPhone.value = false;
  phoneForm.value = { phone: '', code: '' };
}

async function saveName() {
  try {
    const r = await authApi.updateProfile({ name: form.value.name });
    Object.assign(store.user, r.user);
    uni.setStorageSync('user', JSON.stringify(store.user));
    uni.showToast({ title: '已保存' });
  } catch { uni.showToast({ title: '保存失败', icon: 'none' }); }
}

async function sendPhoneCode() {
  if (phoneCd.value > 0) return;
  if (!/^1[3-9]\d{9}$/.test(phoneForm.value.phone))
    return uni.showToast({ title: '手机号格式错误', icon: 'none' });
  if (!captchaAnswer.value)
    return uni.showToast({ title: '请输入图形验证码', icon: 'none' });
  try {
    if (store.user?.phone) await authApi.sendChangePhone(phoneForm.value.phone, captchaToken.value, captchaAnswer.value);
    else await authApi.sendBindSms(phoneForm.value.phone, captchaToken.value, captchaAnswer.value);
    startCd(phoneCd);
    uni.showToast({ title: '验证码已发送' });
  } catch (e) { refreshCaptcha(); uni.showToast({ title: e?.error || '发送失败', icon: 'none' }); }
}

async function submitPhone() {
  if (!phoneForm.value.phone || !phoneForm.value.code)
    return uni.showToast({ title: '请填写完整', icon: 'none' });
  try {
    let r;
    if (store.user?.phone) r = await authApi.changePhone(phoneForm.value.phone, phoneForm.value.code);
    else r = await authApi.bindPhone(phoneForm.value.phone, phoneForm.value.code);
    Object.assign(store.user, r.user);
    uni.setStorageSync('user', JSON.stringify(store.user));
    changingPhone.value = false;
    phoneForm.value = { phone: '', code: '' };
    uni.showToast({ title: store.user?.phone ? '手机号已更换' : '绑定成功' });
  } catch (e) { uni.showToast({ title: e?.error || '操作失败', icon: 'none' }); }
}

async function changePassword() {
  const { old: o, new1, new2 } = pwdForm.value;
  if (!new1) return uni.showToast({ title: '请输入新密码', icon: 'none' });
  if (new1.length < 6) return uni.showToast({ title: '新密码至少6位', icon: 'none' });
  if (!/[A-Za-z]/.test(new1)) return uni.showToast({ title: '密码必须包含字母', icon: 'none' });
  if (!/[0-9]/.test(new1)) return uni.showToast({ title: '密码必须包含数字', icon: 'none' });
  if (new1 !== new2) return uni.showToast({ title: '两次密码不一致', icon: 'none' });
  try {
    await authApi.changePassword(await hashPassword(o), await hashPassword(new1));
    pwdForm.value = { old: '', new1: '', new2: '' };
    uni.showToast({ title: '密码已修改' });
  } catch (e) { uni.showToast({ title: e?.error || '修改失败', icon: 'none' }); }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F0F4F3;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(74, 138, 122, 0.06);
}

.section-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #617870;
  display: block;
  margin-bottom: 24rpx;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }

.label { font-size: 26rpx; color: #8AA49D; width: 90rpx; flex-shrink: 0; }

.input {
  flex: 1;
  font-size: 28rpx;
  color: #1C2A27;
  border-bottom: 1rpx solid #E8EFED;
  padding: 10rpx 0;
}

.btn-code {
  font-size: 24rpx;
  color: #4A8A7A;
  white-space: nowrap;
  padding: 10rpx 20rpx;
  border: 1.5rpx solid #4A8A7A;
  border-radius: 10rpx;
  &.disabled { color: #C2D8D3; border-color: #C2D8D3; }
}

.btn-save {
  display: block;
  background: linear-gradient(135deg, #4A8A7A, #3A7068);
  color: #fff;
  text-align: center;
  padding: 22rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.btn-cancel { background: #F0F4F3; color: #7A9E97; }

.bound-row { display: flex; align-items: center; gap: 16rpx; padding: 4rpx 0; }
.bound-val { font-size: 28rpx; color: #1C2A27; flex: 1; }
.bound-action {
  font-size: 24rpx;
  color: #4A8A7A;
  border: 1.5rpx solid #4A8A7A;
  padding: 6rpx 24rpx;
  border-radius: 12rpx;
}

.legal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #F0F4F3;
  &:last-of-type { border-bottom: none; }
}

.legal-left { display: flex; flex-direction: column; gap: 6rpx; }
.legal-label { font-size: 28rpx; color: #1C2A27; }
.legal-signed { font-size: 20rpx; color: #4A8A7A; }
.legal-unsigned { font-size: 20rpx; color: #C2D8D3; }
.legal-arrow { font-size: 32rpx; color: #C2D8D3; }

.disclaimer {
  display: block;
  font-size: 22rpx;
  color: #9BBCB4;
  line-height: 1.7;
  margin-top: 20rpx;
  padding: 16rpx;
  background: #F5FAF8;
  border-radius: 12rpx;
}

.captcha-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.captcha-img {
  width: 200rpx;
  height: 76rpx;
  border-radius: 10rpx;
  background: #F0F4F3;
  flex-shrink: 0;
  border: 1rpx solid #E8EFED;
}
.captcha-input { flex: 1; font-size: 26rpx; color: #1C2A27; border-bottom: 1rpx solid #E8EFED; padding: 10rpx 0; }
</style>
