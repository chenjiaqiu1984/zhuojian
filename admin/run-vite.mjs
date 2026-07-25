/**
 * 启动 Vite：先打上 Node 18 的 crypto polyfill，再进入 CLI。
 * 用法：node run-vite.mjs [build|preview|...]
 */
import './vite-crypto-polyfill.mjs';
await import('./node_modules/vite/dist/node/cli.js');
