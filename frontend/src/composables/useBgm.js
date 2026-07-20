// 背景音乐播放器（跨端）：封装 uni.createInnerAudioContext + 合成 WAV data-URI 循环播放。
// 用法：
//   const bgm = useBgm();
//   bgm.play('meditation');   // 播放某曲目
//   bgm.stop();               // 停止
//   bgm.toggle();             // 播放/暂停当前
//   bgm.setVolume(0.5);
// 组件卸载时务必调用 bgm.destroy()（或用 onUnmounted 自动处理）。
import { ref, onUnmounted } from 'vue';
import { getTrackDataUri, trackFile, BGM_TRACKS } from '@/utils/bgmSynth';

export function useBgm(options = {}) {
  const playing = ref(false);
  const currentKey = ref(options.defaultTrack || '');
  const volume = ref(options.volume != null ? options.volume : 0.6);
  // 是否允许在本地文件缺失时降级为合成音（默认允许，保证不静默失效）
  const allowSynth = options.allowSynth !== false;

  let audio = null;
  // 记录当前曲目是否已经历过"本地文件失败 → 已切合成"，避免 onError 死循环
  let triedSynthFor = '';

  function ensureAudio() {
    if (audio) return audio;
    audio = uni.createInnerAudioContext();
    audio.loop = true;
    audio.volume = volume.value;
    audio.obeyMuteSwitch = false; // iOS 静音键下仍可播放氛围音
    audio.onError(() => {
      // 本地文件加载失败：降级为合成音再试一次
      if (allowSynth && triedSynthFor !== currentKey.value) {
        triedSynthFor = currentKey.value;
        try {
          audio.src = getTrackDataUri(currentKey.value);
          audio.play();
          return;
        } catch (e) { /* 合成也失败则放弃 */ }
      }
      playing.value = false;
    });
    audio.onPlay(() => { playing.value = true; });
    audio.onStop(() => { playing.value = false; });
    audio.onPause(() => { playing.value = false; });
    return audio;
  }

  // 切换到某曲目并播放：优先本地文件；失败由 onError 自动降级为合成音。
  function play(key) {
    const k = key || currentKey.value || BGM_TRACKS[0].key;
    currentKey.value = k;
    triedSynthFor = '';
    setTimeout(() => {
      try {
        const a = ensureAudio();
        const file = trackFile(k);
        // 有本地文件走本地；否则直接用合成音
        if (file) {
          a.src = file;
        } else if (allowSynth) {
          triedSynthFor = k;
          a.src = getTrackDataUri(k);
        } else {
          playing.value = false;
          return;
        }
        a.volume = volume.value;
        a.play();
        playing.value = true;
      } catch (e) {
        playing.value = false;
      }
    }, 0);
  }

  function stop() {
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

  // 切曲目：若正在播放则立即切换并续播，否则只记录选择
  function select(key) {
    if (playing.value) play(key);
    else currentKey.value = key;
  }

  function setVolume(v) {
    volume.value = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = volume.value;
  }

  function destroy() {
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
