<template>
  <div style="padding: 20px;">
    <h1>{{ msg }}</h1>
    <div style="font-size:14px">
      <h3>录音时长：{{ recorder && recorder.duration }}</h3>
      <br />
      <el-button type="primary" @click="handleStart">开始录音</el-button>
      <el-button type="info" @click="handlePause">暂停录音</el-button>
      <el-button type="success" @click="handleResume">继续录音</el-button>
      <el-button type="warning" @click="handleStop">停止录音</el-button>
      <br />
      <br />
      <h3>
        播放时长：{{ recorder && (playTime > recorder.duration ? recorder.duration : playTime) }}
      </h3>
      <br />
      <br />
      <el-button type="primary" @click="handlePlay">播放录音</el-button>
      <el-button type="info" @click="handlePausePlay">暂停播放</el-button>
      <el-button type="success" @click="handleResumePlay">继续播放</el-button>
      <el-button type="warning" @click="handleStopPlay">停止播放</el-button>
      <el-button type="error" @click="handleDestroy">销毁录音</el-button>
      <br />
      <br />
      <el-button type="primary" @click="downloadPCM">下载PCM数据</el-button>
      <el-button type="primary" @click="downloadWAV">下载WAV数据</el-button>
      <!-- <el-button type="primary" @click="uploadRecord">上传</el-button> -->
      <br />
      <br />
      <textarea rows="10" cols="50" placeholder="语音识别结果" v-model="asrText"></textarea>
    </div>
  </div>
</template>

<style scoped></style>

<script>
import Recorder from 'js-audio-recorder'
import axios from 'axios'

export default {
  name: 'MyRecorder',
  props: {
    msg: String
  },

  data() {
    return {
      recorder: null, // recorder 实例
      playTime: 0, // 录音播放时间
      timer: null,
      src: null, // 录音 url
      asrText: "", // 语音识别文本
      arrayBuffer: [], // 由 pcm 音频转换成的二进制数据，发往后端

      webSocket: null, // WebSocket 实例
      id: 'test', // 事先需要向服务端请求一个 id，来唯一标识客户端
      WS_URL: 'ws://speech.ths8.com:6011/SpeechDictation/v1/ws/', // 服务端地址
      APP_ID: '6BB241B0A66C46239520231206145533', // 应用 Id
      APP_KEY: '03AB767E8E37882293618F11B8A5C0A3', // 应用 key
      STREAM: 'continue', // 是否连续识别，sentence：单句模式，最长 1 分钟，continue：连续识别模式，最长 2 小时
    }
  },

  created() {
    this.recorder = new Recorder({
      sampleBits: 16, // 采样位数，支持 8 或 16，默认是 16
      sampleRate: 16000, // 采样率，支持 11025、16000、22050、24000、44100、48000，根据浏览器默认值，Chrome 是 48000
      numChannels: 1, // 声道数，支持 1 或 2， 默认是 1
      compiling: true, // 是否边录边转换，默认是 false
    })
    // 创建 WebSocket 连接
    this.initWebSocket()
  },
  destroyed() {
    // 在 Vue 销毁前断开 WebSocket 连接
    this.webSocket.onClose()
  },

  methods: {
    // 初始化 WebSocket
    initWebSocket() {
      if (typeof WebSocket === 'undefined') {
        this.$message.error('Error：浏览器不支持 WebSocket！')
        return;
      }
      // 创建 WebSocket 实例
      var ASR_URL = this.WS_URL + this.APP_ID + '/' + this.APP_KEY + '/' + this.STREAM
      this.webSocket = new WebSocket(ASR_URL)
      // 给 WebSocket 实例提供实现方法
      this.webSocket.onopen = this.webSocketOnOpen
      this.webSocket.onerror = this.webSocketOnError
      this.webSocket.onclose = this.webSocketClose
      this.webSocket.onmessage = this.webSocketOnMessage
    },

    // 打开事件
    webSocketOnOpen() {
      // 设置服务端传输二进制流时前端收到的类型，默认为 blob
      this.webSocket.binaryType = 'arraybuffer'
      console.log("WebSocket 连接成功")

      var entity = {
        action: "apply_token",
        params: {
          newEngineType: "2101", // 引擎类型码，说明：中文普通话、通用、16k
          asrParams: "{\"piny\":0,\"ori_freq\":16000,\"symbol\":1,\"flag\":0,\"cn\":0,\"type\":0}",
          sex: 0, // 是否开启性别识别，0：否，1：是，默认为 0
        },
        vad: 1, // 是否开启静音检测，0：否，1：是，默认为 0
        vadEos: 200, // 静音检测后端超时时长，单位 ms
      }
      this.webSocketSendMessage(JSON.stringify(entity))
      console.log("apply_token = " + JSON.stringify(entity))

      // 获取授权后，每隔 30s 发送心跳包
      // entity = {
      //   action: "heart_beat",
      // }
      // setInterval(() => {
      //   this.webSocketSendMessage(JSON.stringify(entity))
      //   console.log(this.webSocket.readyState)
      // }, 3000)
    },

    // 错误事件
    webSocketOnError() {
      console.error("WebSocket 发生了错误")
    },

    // 关闭事件
    webSocketClose() {
      clearInterval(this.interval)
      console.log("WebSocket 已关闭")
    },

    // 获得消息事件
    webSocketOnMessage(message) {
      var result = JSON.parse(message.data)
      var action = result.action
      console.log("action = " + action)
      // 申请令牌
      if (action == "apply_token") {
        console.log("令牌申请成功：" + result.data)
        this.$message.success("连接已经成功建立")
        return;
      }
      // 如果 action 是接收实时结果指令
      if (action == "realtime_result") {
        console.log("实时识别结果：" + result.data);
        /*
          result 是一个 JSONObject，内容如下：
          "msg":"处理成功"
          "reqCode":"ws_6ebf223db239454e87960256e0eb1a82"
          "code":"0"
          "data":"现在开始识别，这是一段录音。"
          "action":"realtime_result"
         */
        if (result.code == "0") {
          this.asrText = result.data
        }
      }
      // 如果 action 是接收静音检测断句结果指令
      if (action == "sentence_result") {
        console.log("静音检测断句：" + result)
        /*
          result 是一个 JSONObject，内容如下：
          "msg":"处理成功"
          "reqCode":"ws_6ebf223db239454e87960256e0eb1a82"
          "code":"0"
          "data":"现在开始识别，这是一段录音。"
          "action":"sentence_result"
         */
        if (result.code == "0") {
          this.asrText = result.data
        }
      }
      // 如果 action 是接收最终识别结果指令
      if (action == "asr_result") {
        console.log("最终识别结果：" + result);
        /*
          result 是一个 JSONObject，内容如下：
          "msg":"处理成功"
          "reqCode":"ws_6ebf223db239454e87960256e0eb1a82"
          "code":"0"
          "data": {
              "answer":"现在开始识别，这是一段录音。"
              "data":""
              "emotion":""
              "logId":""
              "userNumber":""
              "extMsg":""
          }
          "action":"asr_result"
         */
        if (result.code == "0") {
          this.asrText = result.data.answer
        }
      }
      // 如果 action 是接收识别结束指令
      if (action == "asr_end") {
        console.log("识别结束：" + result);
      }
      // 如果 action 是未匹配到指令或者指令异常
      if (action == "no_command") {
        console.log("未匹配到指令或者指令异常：" + result);
      }

    },

    // 向 WebSocket 服务器发送信息
    webSocketSendMessage(data) {
      this.webSocket.send(data)
    },

    // 开始录音
    handleStart() {
      // 如果 recorder 还没有创建， 就新建一个
      if (this.recorder == null) {
        this.recorder = new Recorder({
          sampleBits: 16, // 采样位数，支持 8 或 16，默认是 16
          sampleRate: 16000, // 采样率，支持 11025、16000、22050、24000、44100、48000，根据浏览器默认值，Chrome 是 48000
          numChannels: 1, // 声道数，支持 1 或 2， 默认是 1
          compiling: true, // 是否边录边转换，默认是 false
        })
      }

      Recorder.getPermission().then(() => {
        console.log('开始录音')
        this.recorder.start()
      }, (error) => {
        this.$message({
          message: '请先允许该网页使用麦克风',
          type: 'info'
        })
        console.log(`${error.name} : ${error.message}`)
      })

      var webSocket = this.webSocket
      this.recorder.onprogress = function (params) {
        var data = params.data
        var length = data.length
        var buffer = data[length - 1].buffer
        // console.log(buffer) // ArrayBuffer(2730)
        // 将 ArrayBuffer 转为二进制字符串
        var binary = ''
        var bytes = new Uint8Array(buffer)
        for (var len = bytes.byteLength, i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        // 将二进制字符串转为 base64 字符串
        var base64String = window.btoa(binary)
        // console.log(base64String)
        webSocket.send(JSON.stringify({ action: "send_data", data: base64String }))
      }

      // this.interval = setInterval(() => {
      //   var data = this.recorder.getNextData()
      //   console.log(data)
      //   //var length = data.length
      //   var buffer = data[data.length - 1].buffer
      //   console.log(buffer) // ArrayBuffer(2730)
      //   // 将 ArrayBuffer 转为二进制字符串
      //   var binary = ''
      //   var bytes = new Uint8Array(buffer)
      //   for (var len = bytes.byteLength, i = 0; i < len; i++) {
      //     binary += String.fromCharCode(bytes[i])
      //   }
      //   // 将二进制字符串转为 base64 字符串
      //   var base64String = window.btoa(binary)
      //   this.webSocketSendMessage(JSON.stringify({ action: "send_data", data: base64String }))
      // }, 200)
    },

    // 暂停录音
    handlePause() {
      console.log('暂停录音')
      this.recorder.pause() // 暂停录音
    },

    // 恢复录音
    handleResume() {
      console.log('恢复录音')
      this.recorder.resume() // 恢复录音
    },

    // 停止录音
    handleStop() {
      console.log('停止录音')
      this.recorder.stop() // 停止录音
    },

    // 播放录音
    handlePlay() {
      console.log('播放录音')
      console.log(this.recorder)
      this.recorder.play() // 播放录音

      // 设置 playTime 为录音播放时长
      this.timer = setInterval(() => {
        try {
          this.playTime = this.recorder.getPlayTime() // 获取音频已经播的时长，返回 number
        } catch (error) {
          this.timer = null
        }
      }, 100)
    },

    // 暂停播放
    handlePausePlay() {
      console.log('暂停播放')
      this.recorder.pausePlay() // 暂停录音播放

      // 播放时长
      this.playTime = this.recorder.getPlayTime() // 获取音频已经播的时长，返回 number
      this.time = null
    },

    // 恢复播放
    handleResumePlay() {
      console.log('恢复播放')
      this.recorder.resumePlay() // 恢复录音播发

      // 设置 playTime 为录音播放时长
      this.timer = setInterval(() => {
        try {
          this.playTime = this.recorder.getPlayTime() // 获取音频已经播的时长，返回 number
        } catch (error) {
          this.timer = null
        }
      }, 100)
    },

    // 停止播放
    handleStopPlay() {
      console.log('停止播放')
      this.recorder.stopPlay() // 停止播放

      // 播放时长
      this.playTime = this.recorder.getPlayTime() // 获取音频已经播的时长，返回 number
      this.timer = null
    },

    // 销毁实例
    handleDestroy() {
      console.log('销毁实例')
      this.recorder.destroy() // 销毁实例
      this.timer = null
    },

    // 下载 PCM 格式文件
    downloadPCM() {
      console.log('下载PCM格式数据')
      // 注：使用该方法会默认调用 stop() 方法
      this.recorder.downloadPCM("record_pcm" + new Date().getTime())
    },

    // 下载 WAV 格式文件
    downloadWAV() {
      console.log('下载WAV格式数据')
      // 注：使用该方法会默认调用 stop() 方法
      this.recorder.downloadWAV("record_wav" + new Date().getTime())
    },

    // 将 Blob 转换成 ArrayBuffer
    blobToArrayBuffer(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.readAsArrayBuffer(blob);
      });
    },

    // 上传 ArrayBuffer 给后端
    // uploadRecord() {
    //   if (this.recorder == null || this.recorder.duration === 0) {
    //     this.$message({
    //       message: '请先录音',
    //       type: 'error'
    //     })
    //     return false
    //   }
    //   this.recorder.pause() // 暂停录音
    //   this.timer = null
    //   console.log('上传录音') // 上传录音

    //   let blob = this.recorder.getPCMBlob() // 获取 pcm 格式音频数据

    //   this.blobToArrayBuffer(blob).then(arrayBuffer => {
    //     console.log(arrayBuffer)
    //     this.webSocketSendMessage(arrayBuffer)
    //   });
    // },

    // 上传 PCM 格式文件给后端 uploadPCMRecord 端口
    uploadRecord() {
      if (this.recorder == null || this.recorder.duration === 0) {
        this.$message({
          message: '请先录音',
          type: 'error'
        })
        return false
      }
      this.recorder.pause() // 暂停录音
      this.timer = null
      console.log('上传录音') // 上传录音

      let blob = this.recorder.getPCMBlob() // 获取 pcm 格式音频数据
      let newBlob = new Blob([blob])
      // 此处获取到 blob 对象后需要设置 fileName 满足项目上传需求，这里选择把 blob 包装成 file 塞入 formData
      let fileOfBlob = new File([newBlob], new Date().getTime() + '.pcm')
      const formData = new FormData()
      formData.append('file', fileOfBlob)
      const url = window.URL.createObjectURL(fileOfBlob)
      this.src = url

      axios.post('http://localhost:8087/uploadPCMRecord', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(response => {
        console.log('上传成功', response.data);
      }).then(res => {
        console.log(res.data.data[0].url)
      }).catch(error => {
        console.error('上传失败', error);
      })
    },

    // 接收后端传回的 action 类型为 realtime_result 的语音识别数据
    // getAsrRealTimeResult() {
    //   axios.get('http://localhost:8087/getAsrRealTimeResult')
    //     .then(response => {
    //       // 处理成功情况
    //       console.log(response)
    //       this.setAsrRealTimeText(response.data)
    //     }).catch(error => {
    //       // 处理错误情况
    //       this.$message({
    //         message: '获取实时语音识别数据失败！',
    //         type: 'error',
    //         duration: 2000
    //       })
    //       console.log("获取实时语音识别数据出错！")
    //       console.error(error)
    //     })
    // },
  }
}
</script>