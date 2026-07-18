<script setup>
import { onLaunch } from '@dcloudio/uni-app';
import { useUserStore } from './store/user';

onLaunch(() => {
  const store = useUserStore();
  store.init();
});
</script>

<template>
</template>

<style lang="scss">
@import 'uview-plus/index.scss';
page { box-sizing: border-box; margin: 0; padding: 0; background: $zj-bg; font-family: -apple-system, 'PingFang SC', sans-serif; }
</style>
