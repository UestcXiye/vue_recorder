<template>
  <div style="padding: 20px;">
    <h1>{{ msg }}</h1>
    <div style="font-size:14px">
      <h3>录音时长：{{ recorder && recorder.duration.toFixed(4) }}</h3>
      <br />
      <el-button type="primary" @click="handleStart">开始录音</el-button>
      <el-button type="info" @click="handlePause">暂停录音</el-button>
      <el-button type="success" @click="handleResume">继续录音</el-button>
      <el-button type="warning" @click="handleStop">停止录音</el-button>
      <br />
      <br />
      <h3>
        播放时长：{{ recorder && (playTime > recorder.duration ? recorder.duration.toFixed(4) : playTime.toFixed(4)) }}
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
      <el-button type="primary" @click="uploadRecord">上传</el-button>
      <br />
      <br />
      <textarea rows="10" cols="50" placeholder="语音识别结果" v-model="asrText"></textarea>
    </div>
  </div>
</template>

<style scoped></style>

<script>
import Recorder from 'js-audio-recorder'
// import axios from 'axios'

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

      webSocket: null, // WebSocket 实例
      id: 'test', // 事先需要向服务端请求一个 id，来唯一标识客户端
      wsUrl: 'ws://localhost:8087/websocket/', // 服务端地址
      arrayBuffer: [] // 由 pcm 音频转换成的二进制数据，发往后端
    }
  },

  created() {
    // 初始化 recorder 实例
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
      // 创建 WebSocket 实例，创建以前先检查一下 id 是否获取到
      this.webSocket = new WebSocket(this.wsUrl + this.id)
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
    },

    // 错误事件
    webSocketOnError() {
      console.log("WebSocket 发生了错误")
    },

    // 关闭事件
    webSocketClose() {
      console.log("WebSocket 已关闭")
    },

    // 获得消息事件
    webSocketOnMessage(message) {
      console.log("WebSocket 接收到数据：" + message.data)
      // 前端处理数据
      this.asrText = message.data
    },

    // 向 WebSocket 服务器发送信息
    webSocketSendMessage(data) {
      this.webSocket.send(data)
    },

    // 开始录音
    handleStart() {
      // 初始化 recorder 实例
      this.recorder = new Recorder({
        sampleBits: 16, // 采样位数，支持 8 或 16，默认是 16
        sampleRate: 16000, // 采样率，支持 11025、16000、22050、24000、44100、48000，根据浏览器默认值，Chrome 是 48000
        numChannels: 1, // 声道数，支持 1 或 2， 默认是 1
        compiling: true, // 是否边录边转换，默认是 false
      })

      Recorder.getPermission().then(() => {
        console.log('开始录音')
        this.recorder.start() // 开始录音
      }, (error) => {
        this.$message({
          message: '请先允许该网页使用麦克风',
          type: 'info'
        })
        console.log(`${error.name} : ${error.message}`)
      })
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

      this.blobToArrayBuffer(blob).then(arrayBuffer => {
        console.log(arrayBuffer)
        this.webSocketSendMessage(arrayBuffer)
      });
    },

    // 上传 PCM 格式文件给后端 uploadPCMRecord 端口
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
    //   let newBlob = new Blob([blob])
    //   // 此处获取到 blob 对象后需要设置 fileName 满足项目上传需求，这里选择把 blob 包装成 file 塞入 formData
    //   let fileOfBlob = new File([newBlob], new Date().getTime() + '.pcm')
    //   const formData = new FormData()
    //   formData.append('file', fileOfBlob)
    //   const url = window.URL.createObjectURL(fileOfBlob)
    //   this.src = url

    //   axios.post('http://localhost:8087/uploadPCMRecord', formData, {
    //     headers: {
    //       'Content-Type': 'multipart/form-data'
    //     }
    //   }).then(response => {
    //     console.log('上传成功', response.data);
    //   }).then(res => {
    //     console.log(res.data.data[0].url)
    //   }).catch(error => {
    //     console.error('上传失败', error);
    //   })
    // },

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
