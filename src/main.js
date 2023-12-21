import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 引入 element-ui
import ElementUI from 'element-ui'
// element-ui 的 css 样式要单独引入                    
import 'element-ui/lib/theme-chalk/index.css'
// 在 Vue 中使用 element-ui
Vue.use(ElementUI)

// 引入 axios
import axios from 'axios'
// 在全局使用 axios
Vue.prototype.$axios = axios

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
