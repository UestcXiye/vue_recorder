const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,

  devServer: {
    port: 8086, // 此处修改你想要的端口号
    open: { app: { name: 'chrome' } }, // 在每次编译成功后自动打开 Chrome 浏览器
  },
})

