const fs = require('fs')
const path = require('path')

function createMinimalPNG(color, size = 48) {
  const HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const IHDR = createIHDR(size, size)
  const rawData = createImageData(color, size)
  const IDAT = createIDAT(rawData)
  const IEND = createIEND()
  return Buffer.concat([HEADER, IHDR, IDAT, IEND])
}

function createIHDR(width, height) {
  const data = Buffer.alloc(13)
  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data[8] = 8 // bit depth
  data[9] = 2 // color type (RGB)
  data[10] = 0 // compression
  data[11] = 0 // filter
  data[12] = 0 // interlace
  return createChunk('IHDR', data)
}

function createImageData(color, size) {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const raw = []
  for (let y = 0; y < size; y++) {
    raw.push(0)
    for (let x = 0; x < size; x++) {
      raw.push(r, g, b)
    }
  }
  return Buffer.from(raw)
}

function createIDAT(data) {
  const zlib = require('zlib')
  const compressed = zlib.deflateSync(data)
  return createChunk('IDAT', compressed)
}

function createIEND() {
  return createChunk('IEND', Buffer.alloc(0))
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc, 0)
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const icons = [
  { name: 'tab-home.png', color: '#999999' },
  { name: 'tab-home-active.png', color: '#2B6DE8' },
  { name: 'tab-features.png', color: '#999999' },
  { name: 'tab-features-active.png', color: '#2B6DE8' },
  { name: 'tab-profile.png', color: '#999999' },
  { name: 'tab-profile-active.png', color: '#2B6DE8' }
]

const outDir = path.resolve(__dirname, '../src/static/images')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

icons.forEach(({ name, color }) => {
  const png = createMinimalPNG(color)
  fs.writeFileSync(path.join(outDir, name), png)
  console.log(`Created: ${name} (${png.length} bytes)`)
})

console.log('All tabBar icons generated!')
