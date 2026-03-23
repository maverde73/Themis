const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const TEMP_UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || path.join(__dirname, '../../uploads/tmp');

// Allowed MIME types for theme assets
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(12).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            Object.assign(
                new Error(`Tipo file non supportato: ${file.mimetype}. Formati ammessi: JPEG, PNG, WebP, SVG, GIF.`),
                { status: 400 }
            ),
            false
        );
    }
};

const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
});

module.exports = { uploadMiddleware, ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
