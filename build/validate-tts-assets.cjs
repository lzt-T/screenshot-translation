// Node.js 文件系统接口
const fs = require('node:fs')
// Node.js 路径接口
const path = require('node:path')

// Git LFS 指针文件的固定开头
const GIT_LFS_POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1'
// Kokoro 打包资源及其预期大小
const TTS_ASSETS = [
  { fileName: 'model.int8.onnx', expectedSize: 114299010 },
  { fileName: 'voices.bin', expectedSize: 53790720 }
]

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
 * 在 Electron Builder 打包前校验 Kokoro 二进制资源。
 * @param {{ packager: { projectDir: string } }} context Electron Builder 打包上下文
 * @returns {void} 无返回值
 */
function validateTtsAssets(context) {
  // Kokoro 模型资源目录
  const assetDirectory = path.join(
    context.packager.projectDir,
    'resources',
    'tts',
    'kokoro-int8-multi-lang-v1_1'
  )

  // 逐个校验打包所需资源
  for (const asset of TTS_ASSETS) {
    // 当前资源的绝对路径
    const assetPath = path.join(assetDirectory, asset.fileName)
    if (!fs.existsSync(assetPath)) {
      throw new Error(`TTS 资源不存在：${assetPath}。请先执行 git lfs pull。`)
    }

    // 当前资源文件开头
    const assetHeader = readAssetHeader(assetPath)
    if (assetHeader.startsWith(GIT_LFS_POINTER_PREFIX)) {
      throw new Error(`TTS 资源仍是 Git LFS 指针：${assetPath}。请先执行 git lfs pull。`)
    }

    // 当前资源文件大小
    const assetSize = fs.statSync(assetPath).size
    if (assetSize !== asset.expectedSize) {
      throw new Error(
        `TTS 资源大小不正确：${assetPath}，预期 ${asset.expectedSize} 字节，实际 ${assetSize} 字节。请重新执行 git lfs pull。`
      )
    }
  }
}

module.exports.default = validateTtsAssets
