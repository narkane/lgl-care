import Vue from 'vue'
import App from './App.vue'
import axios from 'axios'
import vuetify from '@/plugins/vuetify'
// import '@/plugins/veevalidate'
// import '@/plugins/common'
// import '@/plugins/googleAnalytics'
// import i18n from '@/plugins/i18n'
// import router from '@/router'
import { store } from '@/store'
// import Vuex from 'vuex'
import VueToastify from 'vue-toastify'
Vue.use(VueToastify, {
  singular: true,
  withBackdrop: false,
  theme: 'light'
})

import 'leaflet/dist/leaflet.css'

import VueMaterial from 'vue-material'
//! THIS IS THE FUCKER BREAKING LEAFLET GLIFY!
// import 'vue-material/dist/vue-material.min.css

import 'vue-material/dist/theme/default.css'

Vue.use(VueMaterial)
// Vue.use(Vuex)

// Vue.use(VueToastify, {
//   singular: true,
//   withBackdrop: false,
//   theme: 'light'
// })

const token = localStorage.getItem('token')
if (token) {
  console.log(token)
  axios.defaults.headers.common.Authorization = `Bearer ${JSON.parse(token)}`
}


Vue.config.productionTip = false

new Vue({
  vuetify,
  // router,
  store,
  render: h => h(App),
}).$mount('#app')
