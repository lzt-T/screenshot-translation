// Node.js 文件系统接口
const fs = require('node:fs')
// Node.js 路径接口
const path = require('node:path')

// Git LFS 指针文件的固定开头
const GIT_LFS_POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1'
// 随包内置的语音活动检测资源及其预期大小（TTS 与 Whisper 模型已改为按需下载）
const VAD_ASSETS = [{ fileName: 'silero_vad.onnx', expectedSize: 643854 }]

/**
 * 读取资源文件开头，用于识别 Git LFS 指针。
 * @param {string} assetPath 资源文件绝对路径
 * @returns {string} 文件开头文本
 */
function readAssetHeader(assetPath) {
  // 待读取的文件描述符
  const fileDescriptor = fs.openSync(assetPath, 'r')
  // 足以容纳 Git LFS 指针头的缓冲区
  const headerBuffer = Buffer.alloc(128)

  try {
    // 实际读取的字节数
    const bytesRead = fs.readSync(fileDescriptor, headerBuffer, 0, headerBuffer.length, 0)
    return headerBuffer.subarray(0, bytesRead).toString('utf8')
  } finally {
    fs.closeSync(fileDescriptor)
  }
}

/**
 * 校验一组本地语音资源。
 * @param {string} assetDirectory 资源目录
 * @param {{ fileName: string, expectedSize: number }[]} assets 资源清单
 * @param {string} assetType 资源类型
 * @returns {void} 无返回值
 */
function validateAssets(assetDirectory, assets, assetType) {
  // 逐个校验打包所需资源
  for (const asset of assets) {
    // 当前资源的绝对路径
    const assetPath = path.join(assetDirectory, asset.fileName)
    if (!fs.existsSync(assetPath)) {
      throw new Error(`${assetType} 资源不存在：${assetPath}。请先执行 git lfs pull。`)
    }

    // 当前资源文件开头
    const assetHeader = readAssetHeader(assetPath)
    if (assetHeader.startsWith(GIT_LFS_POINTER_PREFIX)) {
      throw new Error(`${assetType} 资源仍是 Git LFS 指针：${assetPath}。请先执行 git lfs pull。`)
    }

    // 当前资源文件大小
    const assetSize = fs.statSync(assetPath).size
    if (assetSize !== asset.expectedSize) {
      throw new Error(
        `${assetType} 资源大小不正确：${assetPath}，预期 ${asset.expectedSize} 字节，实际 ${assetSize} 字节。请重新执行 git lfs pull。`
      )
    }
  }
}

/**
 * 在 Electron Builder 打包前校验随包内置的 VAD 资源。
 * @param {{ packager: { projectDir: string } }} context Electron Builder 打包上下文
 * @returns {void} 无返回值
 */
function validateSpeechAssets(context) {
  // 英文 ASR 内置资源根目录
  const asrRootDirectory = path.join(context.packager.projectDir, 'resources', 'asr')

  validateAssets(asrRootDirectory, VAD_ASSETS, 'VAD')
}

module.exports.default = validateSpeechAssets
