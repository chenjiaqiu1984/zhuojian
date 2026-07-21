import { ref, computed } from 'vue';
import { authApi } from '../api/index';

export function useCaptcha() {
  const captchaSvg = ref('');
  const captchaToken = ref('');
  const captchaAnswer = ref('');

  const captchaUrl = computed(() =>
    captchaSvg.value
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(captchaSvg.value)}`
      : ''
  );

  async function refreshCaptcha() {
    try {
      const data = await authApi.getCaptcha();
      captchaSvg.value = data.svg;
      captchaToken.value = data.token;
      captchaAnswer.value = '';
    } catch {
      // 网络问题时静默失败，用户可点击图片重试
    }
  }

  return { captchaUrl, captchaToken, captchaAnswer, refreshCaptcha };
}
