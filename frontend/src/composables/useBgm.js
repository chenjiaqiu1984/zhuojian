// 背景音乐播放器（跨端）：uni.createInnerAudioContext
// 小程序：远程 SERVER/static/bgm/*.mp3（downloadFile 缓存后播放），不打进主包。
// 禁止 WAV / data-URI——Windows 开发者工具会 Unable to decode audio data。
import { ref, onUnmounted } from 'vue';
import { trackFile, BGM_TRACKS } from '@/utils/bgmSynth';
// H5 才用合成兜底；MP 引入 getTrackDataUri 无意义且易误用
// #ifdef H5
import { getTrackDataUri } from '@/utils/bgmSynth';
// #endif

function isMp() {
  // #ifdef MP-WEIXIN
  return true;
  // #endif
  return false;
}

function userDataPath() {
  try {
    if (typeof uni !== 'undefined' && uni.env && uni.env.USER_DATA_PATH) return uni.env.USER_DATA_PATH;
  } catch (e) { /* ignore */ }
  return '';
}

/** 远程 mp3 下载到本地；校验体积，避免把 404 HTML 当音频播 */
function downloadToLocal(url, key) {
  return new Promise((resolve, reject) => {
    const base = userDataPath();
    const cached = base ? `${base}/bgm_${key}.mp3` : '';
    if (cached) {
      try {
        const st = uni.getFileSystemManager().statSync(cached);
        if (st && st.size > 1024) {
          resolve(cached);
          return;
        }
      } catch (e) { /* 未缓存 */ }
    }
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error(`download status ${res.statusCode}`));
          return;
        }
        try {
          const st = uni.getFileSystemManager().statSync(res.tempFilePath);
          if (!st || st.size < 1024) {
            reject(new Error('download too small, not audio'));
            return;
          }
        } catch (e) { /* 无法 stat 则继续尝试 */ }
        if (!cached) {
          resolve(res.tempFilePath);
          return;
        }
        try {
          uni.getFileSystemManager().saveFile({
            tempFilePath: res.tempFilePath,
            filePath: cached,
            success: () => resolve(cached),
            fail: () => resolve(res.tempFilePath),
          });
        } catch (e) {
          resolve(res.tempFilePath);
        }
      },
      fail: reject,
    });
  });
}

export function useBgm(options = {}) {
  const playing = ref(false);
  const currentKey = ref(options.defaultTrack || '');
  const volume = ref(options.volume != null ? options.volume : 0.6);
  // 小程序默认关闭合成音（WAV 在 Windows 模拟器必炸）
  const allowSynth = options.allowSynth != null ? options.allowSynth : !isMp();

  let audio = null;
  let playToken = 0;

  function ensureAudio() {
    if (audio) return audio;
    audio = uni.createInnerAudioContext();
    audio.loop = true;
    audio.volume = volume.value;
    audio.obeyMuteSwitch = false;
    audio.onError((err) => {
      console.warn('[bgm] play error', err);
      playing.value = false;
    });
    audio.onPlay(() => { playing.value = true; });
    audio.onStop(() => { playing.value = false; });
    audio.onPause(() => { playing.value = false; });
    return audio;
  }

  function startSrc(src, token) {
    if (token !== playToken || !src) return;
    const a = ensureAudio();
    try {
      a.stop();
    } catch (e) { /* ignore */ }
    a.src = src;
    a.volume = volume.value;
    a.play();
    playing.value = true;
  }

  async function play(key) {
    const k = key || currentKey.value || (BGM_TRACKS[0] && BGM_TRACKS[0].key);
    if (!k) { playing.value = false; return; }
    currentKey.value = k;
    const token = ++playToken;
    const src = trackFile(k);

    try {
      if (src) {
        // 包内相对路径：直接播
        if (!/^https?:\/\//i.test(src)) {
          startSrc(src, token);
          return;
        }
        // 远程：小程序先下载校验；H5 可直链
        if (isMp()) {
          try {
            const local = await downloadToLocal(src, k);
            startSrc(local, token);
            return;
          } catch (e) {
            console.warn('[bgm] remote unavailable', e);
          }
        } else {
          startSrc(src, token);
          return;
        }
      }

      // 仅 H5 允许 data-URI 合成兜底
      // #ifdef H5
      if (allowSynth) {
        startSrc(getTrackDataUri(k), token);
        return;
      }
      // #endif

      playing.value = false;
    } catch (e) {
      console.warn('[bgm] play failed', e);
      if (token === playToken) playing.value = false;
    }
  }

  function stop() {
    playToken += 1;
    if (audio) { try { audio.stop(); } catch (e) {} }
    playing.value = false;
  }

  function pause() {
    if (audio) { try { audio.pause(); } catch (e) {} }
    playing.value = false;
  }

  function toggle() {
    if (playing.value) pause();
    else play(currentKey.value);
  }

  function select(key) {
    if (playing.value) play(key);
    else currentKey.value = key;
  }

  function setVolume(v) {
    volume.value = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = volume.value;
  }

  function destroy() {
    playToken += 1;
    if (audio) {
      try { audio.stop(); } catch (e) {}
      try { audio.destroy(); } catch (e) {}
      audio = null;
    }
    playing.value = false;
  }

  onUnmounted(destroy);

  return { playing, currentKey, volume, tracks: BGM_TRACKS, play, stop, pause, toggle, select, setVolume, destroy };
}
