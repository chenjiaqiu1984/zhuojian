// 背景音乐播放器（跨端）：uni.createInnerAudioContext
// 小程序：远程 SERVER/static/bgm/*.mp3（downloadFile 缓存后播放），不打进主包。
// 远程不可用时：把合成 WAV 写到本地再播（勿用 data-URI，开发者工具常解码失败）。
import { ref, onUnmounted } from 'vue';
import { trackFile, BGM_TRACKS, getTrackWavBytes } from '@/utils/bgmSynth';

const SYNTH_KEYS = ['meditation', 'mindful', 'rain', 'wind'];

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

function synthKeyFor(trackKey) {
  const idx = BGM_TRACKS.findIndex(t => t.key === trackKey);
  return SYNTH_KEYS[(idx >= 0 ? idx : 0) % SYNTH_KEYS.length];
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

/** 合成 WAV 写入本地，供小程序 InnerAudioContext 播放 */
function writeSynthToLocal(trackKey) {
  return new Promise((resolve, reject) => {
    const base = userDataPath();
    if (!base) {
      reject(new Error('no USER_DATA_PATH'));
      return;
    }
    const sk = synthKeyFor(trackKey);
    const path = `${base}/bgm_synth_${sk}.wav`;
    try {
      const st = uni.getFileSystemManager().statSync(path);
      if (st && st.size > 1024) {
        resolve(path);
        return;
      }
    } catch (e) { /* 未生成 */ }

    try {
      const bytes = getTrackWavBytes(sk);
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      uni.getFileSystemManager().writeFile({
        filePath: path,
        data: ab,
        success: () => resolve(path),
        fail: (err) => reject(err || new Error('write synth failed')),
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function useBgm(options = {}) {
  const playing = ref(false);
  const currentKey = ref(options.defaultTrack || (BGM_TRACKS[0] && BGM_TRACKS[0].key) || '');
  const volume = ref(options.volume != null ? options.volume : 0.6);
  const loading = ref(false);
  const lastError = ref('');

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
      lastError.value = (err && (err.errMsg || err.message)) || '播放失败';
    });
    audio.onPlay(() => { playing.value = true; loading.value = false; });
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

  async function playLocalSynth(k, token) {
    const local = await writeSynthToLocal(k);
    startSrc(local, token);
  }

  async function play(key) {
    const k = key || currentKey.value || (BGM_TRACKS[0] && BGM_TRACKS[0].key);
    if (!k) {
      playing.value = false;
      lastError.value = '暂无可用曲目';
      return false;
    }
    currentKey.value = k;
    const token = ++playToken;
    const src = trackFile(k);
    loading.value = true;
    lastError.value = '';

    try {
      if (src) {
        // 包内相对路径：直接播
        if (!/^https?:\/\//i.test(src)) {
          startSrc(src, token);
          loading.value = false;
          return true;
        }
        // 远程：小程序先下载校验；失败再降级本地合成
        if (isMp()) {
          try {
            const local = await downloadToLocal(src, k);
            if (token !== playToken) return false;
            startSrc(local, token);
            loading.value = false;
            return true;
          } catch (e) {
            console.warn('[bgm] remote unavailable, fallback synth', e);
          }
          try {
            await playLocalSynth(k, token);
            loading.value = false;
            return true;
          } catch (e2) {
            console.warn('[bgm] synth fallback failed', e2);
            lastError.value = '音乐加载失败';
          }
        } else {
          // H5：先试直链，失败再合成文件/直链行为由浏览器处理
          try {
            startSrc(src, token);
            loading.value = false;
            return true;
          } catch (e) {
            console.warn('[bgm] remote play failed', e);
          }
        }
      }

      // 无远程或远程失败：本地合成
      try {
        await playLocalSynth(k, token);
        loading.value = false;
        return true;
      } catch (e) {
        console.warn('[bgm] synth failed', e);
        lastError.value = '音乐加载失败';
      }

      if (token === playToken) {
        playing.value = false;
        loading.value = false;
      }
      return false;
    } catch (e) {
      console.warn('[bgm] play failed', e);
      if (token === playToken) {
        playing.value = false;
        loading.value = false;
        lastError.value = '音乐加载失败';
      }
      return false;
    }
  }

  function stop() {
    playToken += 1;
    if (audio) { try { audio.stop(); } catch (e) {} }
    playing.value = false;
    loading.value = false;
  }

  function pause() {
    if (audio) { try { audio.pause(); } catch (e) {} }
    playing.value = false;
  }

  async function toggle() {
    if (playing.value) {
      pause();
      return true;
    }
    return play(currentKey.value);
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
    loading.value = false;
  }

  onUnmounted(destroy);

  return {
    playing, currentKey, volume, loading, lastError, tracks: BGM_TRACKS,
    play, stop, pause, toggle, select, setVolume, destroy,
  };
}
