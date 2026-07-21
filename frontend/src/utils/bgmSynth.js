// 背景音乐合成器：用代码生成循环氛围音的 WAV data-URI，交给 uni.createInnerAudioContext 播放。
// 为什么用 WAV data-URI 而不用 Web Audio：微信小程序不支持 AudioContext/振荡器，
// 而 createInnerAudioContext + data-URI 两端（H5 / 小程序）都支持。见 [[uniapp-mp-weixin-gotchas]]。
//
// 思路：合成一段"无缝循环"的 PCM（首尾相接不爆音），编码成 WAV，再转 base64 data-URI。
// 生成一次即可反复 loop 播放，无需音频文件。

const SAMPLE_RATE = 16000; // 采样率：16kHz 对氛围音足够，体积更小（base64 更短）

// ── 小工具 ──────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// UTF-8/二进制安全的 base64（小程序无 window.btoa）
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bytesToBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const e0 = b0 >> 2;
    const e1 = ((b0 & 3) << 4) | (b1 >> 4);
    let e2 = ((b1 & 15) << 2) | (b2 >> 6);
    let e3 = b2 & 63;
    if (i + 1 >= bytes.length) { e2 = 64; e3 = 64; }
    else if (i + 2 >= bytes.length) { e3 = 64; }
    out += B64[e0] + B64[e1] + (e2 === 64 ? '=' : B64[e2]) + (e3 === 64 ? '=' : B64[e3]);
  }
  return out;
}

// 把 [-1,1] 浮点样本数组编码为 16-bit 单声道 WAV 字节
function encodeWav(samples, sampleRate) {
  const n = samples.length;
  const dataLen = n * 2;               // 16-bit = 2 bytes/sample
  const buf = new Uint8Array(44 + dataLen);
  const dv = new DataView(buf.buffer);
  const wr = (off, s) => { for (let i = 0; i < s.length; i++) buf[off + i] = s.charCodeAt(i); };

  wr(0, 'RIFF');
  dv.setUint32(4, 36 + dataLen, true);
  wr(8, 'WAVE');
  wr(12, 'fmt ');
  dv.setUint32(16, 16, true);          // fmt chunk size
  dv.setUint16(20, 1, true);           // PCM
  dv.setUint16(22, 1, true);           // mono
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true); // byte rate
  dv.setUint16(32, 2, true);           // block align
  dv.setUint16(34, 16, true);          // bits per sample
  wr(36, 'data');
  dv.setUint32(40, dataLen, true);

  let off = 44;
  for (let i = 0; i < n; i++) {
    const s = clamp(samples[i], -1, 1);
    dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return buf;
}

function toDataUri(samples, sampleRate) {
  const wav = encodeWav(samples, sampleRate);
  return `data:audio/wav;base64,${bytesToBase64(wav)}`;
}

// ── 合成基元 ────────────────────────────────────────────────────────────
// 无缝循环的关键：所有正弦分量的频率都取「整数个周期正好填满 loop 时长」，
// 这样样本首尾天然衔接，loop 播放不爆音。

// 生成 durSec 秒、可无缝循环的和弦垫音（多个正弦叠加 + 缓慢音量起伏）
function padChord(durSec, freqs, sampleRate) {
  const N = Math.floor(durSec * sampleRate);
  const out = new Float32Array(N);
  // 把每个频率吸附到「整数周期」的最近频率，保证循环无缝
  const snapped = freqs.map(f => Math.max(1, Math.round(f * durSec)) / durSec);
  for (let i = 0; i < N; i++) {
    const t = i / sampleRate;
    let s = 0;
    for (let k = 0; k < snapped.length; k++) {
      // 高频分量音量略低，模拟自然泛音衰减
      const amp = 1 / (1 + k * 0.5);
      s += Math.sin(2 * Math.PI * snapped[k] * t) * amp;
    }
    out[i] = s / snapped.length;
  }
  // 极缓慢的整体音量呼吸（1 个周期填满 loop，保持无缝）
  for (let i = 0; i < N; i++) {
    const lfo = 0.82 + 0.18 * Math.sin(2 * Math.PI * (i / N));
    out[i] *= lfo;
  }
  return out;
}

// 生成滤波噪声（低通近似）：用于雨声/风声等氛围底噪。可无缝循环（首尾交叉淡化）。
function filteredNoise(durSec, cutoff, sampleRate, seed) {
  // 多生成 fade 段，交叉淡化后裁掉，最终长度恰为 durSec*sampleRate
  const M = Math.floor(durSec * sampleRate);
  const fade = Math.min(Math.floor(0.4 * sampleRate), Math.floor(M / 3));
  const N = M + fade;
  const out = new Float32Array(N);
  // 简单线性同余伪随机，保证可复现（不用 Math.random，避免 SSR/一致性问题）
  let x = (seed || 12345) >>> 0;
  const rnd = () => { x = (1103515245 * x + 12345) >>> 0; return (x / 0xFFFFFFFF) * 2 - 1; };
  // 一阶低通：y[i] = y[i-1] + a*(noise - y[i-1])
  const a = clamp(cutoff, 0.001, 1);
  let y = 0;
  for (let i = 0; i < N; i++) {
    y = y + a * (rnd() - y);
    out[i] = y;
  }
  // 无缝循环：把尾部多出的 fade 段与头部 fade 段做等功率交叉淡化写回头部，
  // 最终返回前 M 个样本，使「首」与「尾」天然衔接。
  const res = new Float32Array(M);
  for (let i = 0; i < M; i++) res[i] = out[i];
  for (let i = 0; i < fade; i++) {
    const w = i / fade;                 // 0→1
    res[i] = out[i] * Math.sqrt(w) + out[M + i] * Math.sqrt(1 - w);
  }
  // 归一化
  let peak = 0;
  for (let i = 0; i < M; i++) peak = Math.max(peak, Math.abs(res[i]));
  if (peak > 0) for (let i = 0; i < M; i++) res[i] /= peak;
  return res;
}

// 混合两个等长样本数组
function mix(a, b, wa, wb) {
  const N = Math.min(a.length, b.length);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = a[i] * wa + b[i] * wb;
  return out;
}

// ── 曲目定义 ────────────────────────────────────────────────────────────
// 每首曲目返回一段可无缝循环的样本。时长取 8 秒（体积与流畅的平衡）。
const LOOP_SEC = 6;

// 频率（Hz）：以 A2=110 为根，几个和谐音程搭出温暖大调/小调色彩
const TRACK_BUILDERS = {
  // 冥想：温暖大调和弦垫音（C-E-G-八度），像颂钵长鸣
  meditation: (sr) => padChord(LOOP_SEC, [130.81, 164.81, 196.00, 261.63], sr),
  // 正念：更空灵的挂留和弦（D-A-E-八度），留白多
  mindful: (sr) => padChord(LOOP_SEC, [146.83, 220.00, 329.63], sr),
  // 雨声：中低通滤波噪声
  rain: (sr) => filteredNoise(LOOP_SEC, 0.08, sr, 2251),
  // 风声：更低通、更缓的滤波噪声 + 极弱低频垫音
  wind: (sr) => mix(filteredNoise(LOOP_SEC, 0.02, sr, 99177), padChord(LOOP_SEC, [98.00, 146.83], sr), 0.8, 0.2),
};

// 曲目元信息（供 UI 展示）
// file: 本地音频路径（把 mp3 放到 frontend/src/static/bgm/ 下，文件名与此一致）。
//       播放时优先用本地文件；若文件缺失/加载失败，自动降级为运行时合成氛围音，保证不静默失效。
export const BGM_TRACKS = [
  { key: 'meditation', name: '冥想颂钵', icon: '🧘', file: '/static/bgm/meditation.mp3' },
  { key: 'mindful',    name: '空灵正念', icon: '🌙', file: '/static/bgm/mindful.mp3' },
  { key: 'rain',       name: '雨声',     icon: '🌧', file: '/static/bgm/rain.mp3' },
  { key: 'wind',       name: '风吟',     icon: '🍃', file: '/static/bgm/wind.mp3' },
];

// 取某曲目的本地文件路径（无则返回空）
export function trackFile(key) {
  const t = BGM_TRACKS.find(x => x.key === key);
  return (t && t.file) || '';
}

// data-URI 缓存：同一曲目只合成一次
const _cache = {};

// 获取某曲目的可循环 WAV data-URI
export function getTrackDataUri(key) {
  if (_cache[key]) return _cache[key];
  const build = TRACK_BUILDERS[key] || TRACK_BUILDERS.meditation;
  const samples = build(SAMPLE_RATE);
  const uri = toDataUri(samples, SAMPLE_RATE);
  _cache[key] = uri;
  return uri;
}
