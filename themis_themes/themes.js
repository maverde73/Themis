const express = require('express');
const router = express.Router();
const themeService = require('../services/themeService');
const { uploadMiddleware } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth'); // il tuo middleware auth

// Tutte le route richiedono autenticazione
router.use(authenticate);

// ─── LIST THEMES ───────────────────────────────────────────
// GET /api/themes?page=1&limit=20&includeBuiltin=true&includePublic=true
router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, includeBuiltin = 'true', includePublic = 'true' } = req.query;
        const result = await themeService.list({
            userId: req.user.id,
            includeBuiltin: includeBuiltin === 'true',
            includePublic: includePublic === 'true',
            page: parseInt(page, 10),
            limit: Math.min(parseInt(limit, 10), 100),
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ─── GET DEFAULT CONFIG ────────────────────────────────────
// GET /api/themes/defaults
router.get('/defaults', (req, res) => {
    res.json(themeService.getDefaultConfig());
});

// ─── GET SINGLE THEME ──────────────────────────────────────
// GET /api/themes/:id
router.get('/:id', async (req, res, next) => {
    try {
        const theme = await themeService.getById(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: 'Theme not found' });
        }
        res.json(theme);
    } catch (err) {
        next(err);
    }
});

// ─── CREATE THEME ──────────────────────────────────────────
// POST /api/themes
router.post('/', async (req, res, next) => {
    try {
        const theme = await themeService.create(req.body, req.user.id);
        res.status(201).json(theme);
    } catch (err) {
        next(err);
    }
});

// ─── UPDATE THEME (full) ──────────────────────────────────
// PUT /api/themes/:id
router.put('/:id', async (req, res, next) => {
    try {
        const theme = await themeService.update(req.params.id, req.body, req.user.id);
        res.json(theme);
    } catch (err) {
        next(err);
    }
});

// ─── PATCH CONFIG SECTION ─────────────────────────────────
// PATCH /api/themes/:id/config/:section
// Utile per il theme editor: aggiorna solo colors, typography, ecc.
router.patch('/:id/config/:section', async (req, res, next) => {
    try {
        const theme = await themeService.patchConfigSection(
            req.params.id,
            req.params.section,
            req.body,
            req.user.id
        );
        res.json(theme);
    } catch (err) {
        next(err);
    }
});

// ─── CLONE THEME ──────────────────────────────────────────
// POST /api/themes/:id/clone
router.post('/:id/clone', async (req, res, next) => {
    try {
        const theme = await themeService.clone(req.params.id, req.user.id, req.body);
        res.status(201).json(theme);
    } catch (err) {
        next(err);
    }
});

// ─── DELETE THEME ─────────────────────────────────────────
// DELETE /api/themes/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const result = await themeService.delete(req.params.id, req.user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ─── UPLOAD ASSET ─────────────────────────────────────────
// POST /api/themes/:id/assets
// Body: multipart/form-data with field "file" + field "asset_type"
router.post('/:id/assets', uploadMiddleware.single('file'), async (req, res, next) => {
    try {
        const assetType = req.body.asset_type || 'background';
        const allowedTypes = ['background', 'logo', 'pattern', 'favicon'];

        if (!allowedTypes.includes(assetType)) {
            return res.status(400).json({ error: `Invalid asset_type. Allowed: ${allowedTypes.join(', ')}` });
        }

        const asset = await themeService.uploadAsset(req.params.id, req.file, assetType, req.user.id);
        res.status(201).json(asset);
    } catch (err) {
        next(err);
    }
});

// ─── SERVE ASSET ──────────────────────────────────────────
// GET /api/themes/:id/assets/:filename
router.get('/:id/assets/:filename', async (req, res, next) => {
    try {
        const path = require('path');
        const ASSETS_BASE_DIR = process.env.THEME_ASSETS_DIR || path.join(__dirname, '../../uploads/theme-assets');
        const filePath = path.join(ASSETS_BASE_DIR, req.params.id, req.params.filename);

        // Security: prevent path traversal
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(ASSETS_BASE_DIR))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.sendFile(resolved);
    } catch (err) {
        next(err);
    }
});

// ─── DELETE ASSET ─────────────────────────────────────────
// DELETE /api/themes/:id/assets/:assetId
router.delete('/:id/assets/:assetId', async (req, res, next) => {
    try {
        const result = await themeService.deleteAsset(req.params.id, req.params.assetId, req.user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ─── APPLY THEME TO SURVEY ────────────────────────────────
// PUT /api/surveys/:surveyId/theme
// (montare separatamente o qui con prefix diverso)
router.put('/apply/:surveyId', async (req, res, next) => {
    try {
        const { theme_id } = req.body; // null per rimuovere
        const result = await themeService.applyToSurvey(req.params.surveyId, theme_id, req.user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
