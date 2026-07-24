/**
 * 扫描 mp3/ → 压缩到 backend/static/bgm/（远程播放，不打进小程序主包）。
 * 生成 frontend/src/utils/bgmTracks.generated.js。
 *
 * 体积策略：单声道约 48kbps × 约 30 秒；文件只部署到后端，避免撑爆微信主包 2MB。
 *
 * 用法（仓库根目录）: node scripts/prepare-bgm.mjs
 * 可设 FFMPEG_PATH。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'mp3');
const OUT_FRONT = path.join(ROOT, 'frontend', 'src', 'static', 'bgm');
const OUT_BACK = path.join(ROOT, 'backend', 'static', 'bgm');
const GEN_FILE = path.join(ROOT, 'frontend', 'src', 'utils', 'bgmTracks.generated.js');

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac']);
const CLIP_SEC = 30;
const BITRATE = '48k';
const SAMPLE_RATE = '44100'; // 必须 44100：22050 会打成 MPEG-2.5，微信 Windows 模拟器 Unable to decode

const NAME_RULES = [
  { re: /healing.?bowl|疗愈/i, name: '疗愈颂钵', icon: '🧘' },
  { re: /spirit.?cleanse|净化/i, name: '心灵净化', icon: '✨' },
  { re: /relaxation.?journey|放松.?之旅/i, name: '颂钵放松', icon: '🔔' },
  { re: /singing.?bowl|tibetan|颂钵/i, name: '颂钵长鸣', icon: '🔔' },
  { re: /yoga|meditation|冥想|relax/i, name: '瑜伽冥想', icon: '🌙' },
  { re: /rain|雨/i, name: '雨声', icon: '🌧' },
  { re: /wind|风/i, name: '风吟', icon: '🍃' },
  { re: /mindful|正念|ethereal|pad/i, name: '空灵正念', icon: '🌙' },
];

const ICONS = ['🧘', '🌙', '✨', '🔔', '🍃', '🌧', '🎶'];

function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const local = path.join(
    ROOT,
    '.tools',
    'ffmpeg',
    'btbn',
    'ffmpeg-master-latest-win64-gpl-shared',
    'bin',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
  );
  if (fs.existsSync(local)) return local;
  return 'ffmpeg';
}

function findFfprobe(ffmpegPath) {
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    return process.env.FFPROBE_PATH;
  }
  const dir = path.dirname(ffmpegPath);
  const name = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  const sibling = path.join(dir, name);
  if (fs.existsSync(sibling)) return sibling;
  return 'ffprobe';
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`${cmd} failed:\n${r.stderr || r.stdout}`);
  }
  return r;
}

function probeDuration(ffprobe, file) {
  try {
    const r = run(ffprobe, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    const n = parseFloat(String(r.stdout).trim());
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function prettyName(filename, index) {
  const stem = filename.replace(/\.[^.]+$/, '');
  for (const rule of NAME_RULES) {
    if (rule.re.test(stem)) return { name: rule.name, icon: rule.icon };
  }
  let title = stem
    .replace(/^\w+-/i, '')
    .replace(/-\d+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!title) title = `曲目 ${index + 1}`;
  title = title.replace(/\b\w/g, (c) => c.toUpperCase());
  return { name: title.slice(0, 16), icon: ICONS[index % ICONS.length] };
}

function keyFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'track';
}

function listSourceFiles() {
  if (!fs.existsSync(SRC_DIR)) {
    throw new Error(`源目录不存在: ${SRC_DIR}`);
  }
  return fs
    .readdirSync(SRC_DIR)
    .filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function clearAudio(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (AUDIO_EXT.has(path.extname(f).toLowerCase())) {
      fs.unlinkSync(path.join(dir, f));
    }
  }
}

function compressOne(ffmpeg, ffprobe, srcPath, outPath) {
  const dur = probeDuration(ffprobe, srcPath);
  const args = ['-y', '-i', srcPath];
  if (dur > CLIP_SEC + 5) {
    args.push('-ss', '10', '-t', String(CLIP_SEC));
  }
  args.push('-ac', '1', '-ar', SAMPLE_RATE, '-c:a', 'libmp3lame', '-b:a', BITRATE, '-write_xing', '0', outPath);
  run(ffmpeg, args);
  return { dur, clipped: dur > CLIP_SEC + 5 };
}

function writeGenerated(tracks) {
  const body = tracks.map((t) => (
    `  { key: ${JSON.stringify(t.key)}, name: ${JSON.stringify(t.name)}, icon: ${JSON.stringify(t.icon)}, file: ${JSON.stringify(t.file)} },`
  )).join('\n');

  const code = `// 由 scripts/prepare-bgm.mjs 自动生成，请勿手改。
// 重新生成：在仓库根目录执行  node scripts/prepare-bgm.mjs
export const BGM_TRACKS = [
${body}
];
`;
  fs.writeFileSync(GEN_FILE, code, 'utf8');
}

function main() {
  const ffmpeg = findFfmpeg();
  const ffprobe = findFfprobe(ffmpeg);
  try {
    run(ffmpeg, ['-version']);
  } catch (e) {
    console.error('找不到 ffmpeg。请安装或设置 FFMPEG_PATH。');
    console.error(e.message || e);
    process.exit(1);
  }

  const files = listSourceFiles();
  if (!files.length) {
    console.error('mp3/ 下没有音频文件');
    process.exit(1);
  }

  fs.mkdirSync(OUT_BACK, { recursive: true });
  // 不再写入 frontend/src/static/bgm（会打进小程序主包超限）
  clearAudio(OUT_FRONT);
  clearAudio(OUT_BACK);

  const tracks = [];
  const usedKeys = new Set();
  let totalOut = 0;

  console.log(`源: ${SRC_DIR}`);
  console.log(`出: ${OUT_BACK}（仅后端静态资源，不进小程序包）`);
  console.log(`参数: mono ${BITRATE} ~${CLIP_SEC}s\n`);

  files.forEach((filename, i) => {
    const srcPath = path.join(SRC_DIR, filename);
    const outName = path.basename(filename, path.extname(filename)) + '.mp3';
    const backPath = path.join(OUT_BACK, outName);
    const srcSize = fs.statSync(srcPath).size;

    const { dur, clipped } = compressOne(ffmpeg, ffprobe, srcPath, backPath);
    const outSize = fs.statSync(backPath).size;
    totalOut += outSize;

    const { name, icon } = prettyName(filename, i);
    let key = keyFromFilename(outName);
    if (usedKeys.has(key)) key = `${key}-${i + 1}`;
    usedKeys.add(key);

    tracks.push({
      key,
      name,
      icon,
      file: `/static/bgm/${outName}`,
    });

    console.log(
      `✓ ${filename}\n` +
      `  ${(srcSize / 1048576).toFixed(2)}MB` +
      (dur ? ` / ${dur.toFixed(1)}s` : '') +
      (clipped ? ` → 截 ${CLIP_SEC}s` : '') +
      ` → ${(outSize / 1024).toFixed(0)}KB  |  ${icon} ${name}`,
    );
  });

  writeGenerated(tracks);
  console.log(`\n合计输出 ${(totalOut / 1024).toFixed(0)}KB / ${tracks.length} 首`);
  console.log(`已生成 ${GEN_FILE}`);
  if (totalOut > 2 * 1024 * 1024) {
    console.warn('警告：BGM 合计偏大，请再压短或减少曲目。');
  }
}

main();
