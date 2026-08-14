'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { ValidationError } = require('../../../common/utils/errors');
const { success } = require('../../../common/utils/response');
const logger = require('../../../common/utils/logger');

/**
 * 图片上传控制器 — 供题库题干/解析/选项图片使用
 * 存储: backend/uploads/question/<uuid>.<ext>; 访问: /uploads/question/<uuid>.<ext>
 */

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'question');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
});

/** 上传单张图片(admin) → { url } */
async function uploadImage(req, res, next) {
  try {
    if (!req.file) throw new ValidationError('未收到文件, 请以 file 字段上传图片');
    const ext = path.extname(req.file.originalname).toLowerCase();
    // 扩展名白名单 + sharp 解码验证(防伪造类型), 失败则清理已落盘文件
    const removeFile = () => {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    };
    if (!ALLOWED_EXT.has(ext)) { removeFile(); throw new ValidationError('仅支持 jpg/png/webp/gif 图片'); }
    try {
      const meta = await sharp(req.file.path).metadata();
      if (!meta.width || !meta.height) { removeFile(); throw new ValidationError('图片文件无效'); }
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      removeFile();
      throw new ValidationError('图片文件无效或已损坏');
    }
    const url = '/uploads/question/' + req.file.filename;
    logger.info('图片上传', { module: 'ANSWER', userId: req.user && req.user.userId, file: req.file.filename, size: req.file.size });
    res.json(success({ url }));
  } catch (err) { next(err); }
}

module.exports = { uploadImage, uploadMiddleware: upload.single('file') };
