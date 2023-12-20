import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 引入 element-ui
import ElementUI from 'element-ui';
// element-ui 的 css 样式要单独引入                    
import 'element-ui/lib/theme-chalk/index.css';

import axios from 'axios'

Vue.prototype.$axios = axios

Vue.use(ElementUI);

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
