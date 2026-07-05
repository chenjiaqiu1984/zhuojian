<script setup>
import { onLaunch } from '@dcloudio/uni-app';
import { useUserStore } from './store/user';

onLaunch(() => {
  const store = useUserStore();
  store.init();
});
</script>

<template>
  <router-view />
</template>

<style lang="scss">
@import 'uview-plus/index.scss';
* { box-sizing: border-box; margin: 0; padding: 0; }
page { background: #F5F7FA; font-family: -apple-system, 'PingFang SC', sans-serif; }
</style>
