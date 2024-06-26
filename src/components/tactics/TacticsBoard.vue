<script setup lang="ts">
import Board from '@/canvas/board.js'
import { onMounted, ref } from 'vue'

const container = ref(null)
onMounted(() => {
  // 新建一个画板
  new Board(container.value)
})
</script>

<template>
  <div class="drawing-board">
    <div id="container" ref="container" style="width: 50rem; height: 50rem"></div>
    <!-- <div id="container" ref="container" style="width: 2000px; height: 2000px"></div> -->
  </div>
</template>

<style scoped>
.drawing-board {
  box-sizing: border-box;

  #container {
    display: flex;
  }
}
</style>
