/** ICP / 公安备案外链（小程序走 web-view 页） */
const ICP_URL = 'https://beian.miit.gov.cn/';
const MPS_URL = 'https://beian.mps.gov.cn/portal/registerSystemInfo?recordcode=32010402002563';

function openExternal(url) {
  if (!url) return;
  // #ifdef H5
  window.open(url, '_blank');
  // #endif
  // #ifndef H5
  uni.navigateTo({
    url: `/pages/webview/index?url=${encodeURIComponent(url)}`,
    fail(err) {
      console.error('[openBeian]', url, err?.errMsg || err);
      uni.showToast({ title: '页面打开失败', icon: 'none' });
    },
  });
  // #endif
}

export function openIcp() {
  openExternal(ICP_URL);
}

export function openBeian() {
  openExternal(MPS_URL);
}
