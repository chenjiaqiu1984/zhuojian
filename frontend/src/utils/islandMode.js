import { ref } from 'vue';

/** 首页心镜岛开关（与 pageNav 一样供点击回调同步调用） */
export const islandOpen = ref(true);

export function openIslandMode() {
  islandOpen.value = true;
  try {
    uni.setNavigationBarTitle({ title: '心镜岛' });
  } catch (e) {}
}

export function closeIslandMode() {
  islandOpen.value = false;
  try {
    uni.setNavigationBarTitle({ title: '卓见心理' });
  } catch (e) {}
}
