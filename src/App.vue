<template>
  <div id="app">
    <!-- <img alt="Vue logo" src="./assets/logo.png"> -->
    <LeafletMap />
  </div>
</template>

<script>
import LeafletMap from "./components/LeafletMap.vue";

export default {
  name: "App",
  components: {
    LeafletMap,
  },
};
</script>

<style></style>
