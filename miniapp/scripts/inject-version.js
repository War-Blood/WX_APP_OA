// scripts/inject-version.js
// 在构建/开发前自动生成 src/config/version.js
// 版本取自 manifest.json 的 versionName；构建日期为自动写入的当天
// 用法：
//   node scripts/inject-version.js            -> 仅注入（dev 用，不改 manifest）
//   node scripts/inject-version.js --bump     -> 版本号末位 +1 并写回 manifest（build 用）
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const manifestPath = path.join(root, 'src', 'manifest.json')
const outPath = path.join(root, 'src', 'config', 'version.js')

const BUMP = process.argv.includes('--bump')

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 版本号末位 +1：1.0.2.2 -> 1.0.2.3
function bumpVersion(v) {
  const parts = String(v).split('.').map(n => parseInt(n, 10) || 0)
  parts[parts.length - 1] += 1
  return parts.join('.')
}

let manifest
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
} catch (e) {
  console.warn('[inject-version] 读取 manifest.json 失败，使用默认值:', e.message)
  manifest = {}
}

let versionName = manifest.versionName || '1.0.0'
let appName = manifest.name || '贝良办公助手'
let versionCode = parseInt(manifest.versionCode, 10) || 1

if (BUMP) {
  versionName = bumpVersion(versionName)
  versionCode += 1
  let raw = fs.readFileSync(manifestPath, 'utf-8')
  raw = raw.replace(/"versionName"\s*:\s*"[^"]*"/, `"versionName" : "${versionName}"`)
  raw = raw.replace(/"versionCode"\s*:\s*"[^"]*"/, `"versionCode" : "${versionCode}"`)
  fs.writeFileSync(manifestPath, raw, 'utf-8')
  console.log(`[inject-version] 版本已递增 -> ${versionName} (versionCode ${versionCode})`)
}

const appVersion = versionName.startsWith('v') ? versionName : `v${versionName}`
const buildDate = formatDate(new Date())

const content =
`// 此文件由 scripts/inject-version.js 自动生成，请勿手动修改
// 版本取自 manifest.json 的 versionName，应用名取自 manifest.json 的 name，构建日期为每次构建自动写入
export const APP_NAME = '${appName}'
export const APP_VERSION = '${appVersion}'
export const BUILD_DATE = '${buildDate}'
`

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, content, 'utf-8')
console.log(`[inject-version] 已生成 ${path.relative(root, outPath)} -> ${appVersion} / ${buildDate}`)
