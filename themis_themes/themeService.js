const { pool } = require('../db'); // il tuo pool pg
const { createThemeSchema, updateThemeSchema, DEFAULT_THEME_CONFIG } = require('../schemas/themeConfig');
const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');

const ASSETS_BASE_DIR = process.env.THEME_ASSETS_DIR || path.join(__dirname, '../../uploads/theme-assets');

class ThemeService {

    // ─── LIST ──────────────────────────────────────────────
    async list({ userId, includeBuiltin = true, includePublic = true, page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramIdx = 1;

        // User's own themes
        const ownershipClauses = [`created_by = $${paramIdx++}`];
        params.push(userId);

        if (includeBuiltin) {
            ownershipClauses.push('is_builtin = TRUE');
        }
        if (includePublic) {
            ownershipClauses.push('is_public = TRUE');
        }

        const whereClause = `WHERE (${ownershipClauses.join(' OR ')})`;

        const countQuery = `SELECT COUNT(*) FROM survey_themes ${whereClause}`;
        const dataQuery = `
            SELECT id, name, description, is_builtin, is_public, cloned_from,
                   config, thumbnail_url, created_by, created_at, updated_at
            FROM survey_themes
            ${whereClause}
            ORDER BY is_builtin DESC, updated_at DESC
            LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `;
        params.push(limit, offset);

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params.slice(0, ownershipClauses.length > 1 ? 1 : 1)),
            pool.query(dataQuery, params),
        ]);

        // Simplified: re-run count with same params
        const total = parseInt(
            (await pool.query(`SELECT COUNT(*) FROM survey_themes ${whereClause}`, [userId])).rows[0].count,
            10
        );

        return {
            themes: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ─── GET BY ID ─────────────────────────────────────────
    async getById(themeId) {
        const result = await pool.query(
            `SELECT t.*, 
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', a.id,
                                'asset_type', a.asset_type,
                                'original_name', a.original_name,
                                'file_path', a.file_path,
                                'mime_type', a.mime_type,
                                'width', a.width,
                                'height', a.height
                            )
                        ) FILTER (WHERE a.id IS NOT NULL),
                        '[]'::json
                    ) AS assets
             FROM survey_themes t
             LEFT JOIN survey_theme_assets a ON a.theme_id = t.id
             WHERE t.id = $1
             GROUP BY t.id`,
            [themeId]
        );
        return result.rows[0] || null;
    }

    // ─── CREATE ────────────────────────────────────────────
    async create(data, userId) {
        const { error, value } = createThemeSchema.validate(data, { stripUnknown: true });
        if (error) {
            throw Object.assign(new Error(error.details[0].message), { status: 400 });
        }

        const result = await pool.query(
            `INSERT INTO survey_themes (name, description, is_public, cloned_from, config, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                value.name,
                value.description || null,
                value.is_public,
                value.cloned_from || null,
                JSON.stringify(value.config),
                userId,
            ]
        );

        return result.rows[0];
    }

    // ─── UPDATE ────────────────────────────────────────────
    async update(themeId, data, userId) {
        // Verify ownership (non si possono modificare i builtin)
        const existing = await this.getById(themeId);
        if (!existing) {
            throw Object.assign(new Error('Theme not found'), { status: 404 });
        }
        if (existing.is_builtin) {
            throw Object.assign(new Error('Cannot modify built-in themes. Clone it first.'), { status: 403 });
        }
        if (existing.created_by !== userId) {
            throw Object.assign(new Error('Not authorized'), { status: 403 });
        }

        const { error, value } = updateThemeSchema.validate(data, { stripUnknown: true });
        if (error) {
            throw Object.assign(new Error(error.details[0].message), { status: 400 });
        }

        // Deep merge config if partial update
        let finalConfig = existing.config;
        if (value.config) {
            finalConfig = deepMerge(existing.config, value.config);
        }

        const result = await pool.query(
            `UPDATE survey_themes
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 is_public = COALESCE($3, is_public),
                 config = $4
             WHERE id = $5
             RETURNING *`,
            [
                value.name || null,
                value.description !== undefined ? value.description : null,
                value.is_public !== undefined ? value.is_public : null,
                JSON.stringify(finalConfig),
                themeId,
            ]
        );

        return result.rows[0];
    }

    // ─── PATCH CONFIG (singola sezione) ────────────────────
    async patchConfigSection(themeId, section, sectionData, userId) {
        const existing = await this.getById(themeId);
        if (!existing) throw Object.assign(new Error('Theme not found'), { status: 404 });
        if (existing.is_builtin) throw Object.assign(new Error('Cannot modify built-in themes'), { status: 403 });
        if (existing.created_by !== userId) throw Object.assign(new Error('Not authorized'), { status: 403 });

        const { subSchemas } = require('../schemas/themeConfig');
        const subSchema = subSchemas[section];
        if (!subSchema) {
            throw Object.assign(new Error(`Invalid config section: ${section}`), { status: 400 });
        }

        const { error, value } = subSchema.validate(
            { ...existing.config[section], ...sectionData },
            { stripUnknown: true }
        );
        if (error) {
            throw Object.assign(new Error(error.details[0].message), { status: 400 });
        }

        const result = await pool.query(
            `UPDATE survey_themes
             SET config = jsonb_set(config, $1, $2::jsonb)
             WHERE id = $3
             RETURNING *`,
            [
                `{${section}}`,
                JSON.stringify(value),
                themeId,
            ]
        );

        return result.rows[0];
    }

    // ─── CLONE ─────────────────────────────────────────────
    async clone(themeId, userId, overrides = {}) {
        const source = await this.getById(themeId);
        if (!source) {
            throw Object.assign(new Error('Source theme not found'), { status: 404 });
        }

        const cloneName = overrides.name || `${source.name} (copia)`;

        const result = await pool.query(
            `INSERT INTO survey_themes (name, description, is_public, cloned_from, config, created_by)
             VALUES ($1, $2, FALSE, $3, $4, $5)
             RETURNING *`,
            [
                cloneName,
                overrides.description || source.description,
                source.id,
                JSON.stringify(source.config),
                userId,
            ]
        );

        // Clone assets too
        if (source.assets && source.assets.length > 0) {
            for (const asset of source.assets) {
                const newAssetId = uuidv4();
                const ext = path.extname(asset.file_path);
                const newFilePath = `${result.rows[0].id}/${newAssetId}${ext}`;

                const srcFullPath = path.join(ASSETS_BASE_DIR, asset.file_path);
                const dstFullPath = path.join(ASSETS_BASE_DIR, newFilePath);

                await fs.mkdir(path.dirname(dstFullPath), { recursive: true });
                await fs.copyFile(srcFullPath, dstFullPath);

                await pool.query(
                    `INSERT INTO survey_theme_assets (id, theme_id, asset_type, original_name, file_path, mime_type, file_size, width, height)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [newAssetId, result.rows[0].id, asset.asset_type, asset.original_name, newFilePath, asset.mime_type, 0, asset.width, asset.height]
                );
            }
        }

        return result.rows[0];
    }

    // ─── DELETE ─────────────────────────────────────────────
    async delete(themeId, userId) {
        const existing = await this.getById(themeId);
        if (!existing) throw Object.assign(new Error('Theme not found'), { status: 404 });
        if (existing.is_builtin) throw Object.assign(new Error('Cannot delete built-in themes'), { status: 403 });
        if (existing.created_by !== userId) throw Object.assign(new Error('Not authorized'), { status: 403 });

        // Remove assets from disk
        const assetDir = path.join(ASSETS_BASE_DIR, themeId);
        try {
            await fs.rm(assetDir, { recursive: true, force: true });
        } catch { /* directory may not exist */ }

        await pool.query('DELETE FROM survey_themes WHERE id = $1', [themeId]);
        return { deleted: true };
    }

    // ─── ASSET UPLOAD ──────────────────────────────────────
    async uploadAsset(themeId, file, assetType, userId) {
        const existing = await this.getById(themeId);
        if (!existing) throw Object.assign(new Error('Theme not found'), { status: 404 });
        if (existing.is_builtin) throw Object.assign(new Error('Cannot modify built-in themes'), { status: 403 });
        if (existing.created_by !== userId) throw Object.assign(new Error('Not authorized'), { status: 403 });

        const assetId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        const relativePath = `${themeId}/${assetId}${ext}`;
        const fullPath = path.join(ASSETS_BASE_DIR, relativePath);

        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.rename(file.path, fullPath);

        const result = await pool.query(
            `INSERT INTO survey_theme_assets (id, theme_id, asset_type, original_name, file_path, mime_type, file_size, width, height)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [assetId, themeId, assetType, file.originalname, relativePath, file.mimetype, file.size, null, null]
        );

        // Update config reference if applicable
        const configPath = assetType === 'background' ? 'background.value'
            : assetType === 'logo' ? 'header.logoUrl'
            : null;

        if (configPath) {
            const assetUrl = `/api/themes/${themeId}/assets/${assetId}${ext}`;
            const [section, key] = configPath.split('.');
            await this.patchConfigSection(themeId, section, { [key]: assetUrl }, userId);
        }

        return result.rows[0];
    }

    // ─── DELETE ASSET ──────────────────────────────────────
    async deleteAsset(themeId, assetId, userId) {
        const theme = await this.getById(themeId);
        if (!theme) throw Object.assign(new Error('Theme not found'), { status: 404 });
        if (theme.created_by !== userId) throw Object.assign(new Error('Not authorized'), { status: 403 });

        const assetResult = await pool.query(
            'SELECT * FROM survey_theme_assets WHERE id = $1 AND theme_id = $2',
            [assetId, themeId]
        );
        const asset = assetResult.rows[0];
        if (!asset) throw Object.assign(new Error('Asset not found'), { status: 404 });

        const fullPath = path.join(ASSETS_BASE_DIR, asset.file_path);
        try { await fs.unlink(fullPath); } catch { /* file may already be gone */ }

        await pool.query('DELETE FROM survey_theme_assets WHERE id = $1', [assetId]);
        return { deleted: true };
    }

    // ─── APPLY THEME TO SURVEY ─────────────────────────────
    async applyToSurvey(surveyId, themeId, userId) {
        if (themeId) {
            const theme = await this.getById(themeId);
            if (!theme) throw Object.assign(new Error('Theme not found'), { status: 404 });
            // Check visibility: user owns it, or it's public/builtin
            if (theme.created_by !== userId && !theme.is_public && !theme.is_builtin) {
                throw Object.assign(new Error('Not authorized to use this theme'), { status: 403 });
            }
        }

        const result = await pool.query(
            `UPDATE surveys SET theme_id = $1 WHERE id = $2 AND created_by = $3 RETURNING id, theme_id`,
            [themeId, surveyId, userId]
        );

        if (result.rowCount === 0) {
            throw Object.assign(new Error('Survey not found or not authorized'), { status: 404 });
        }
        return result.rows[0];
    }

    // ─── GET DEFAULT CONFIG ────────────────────────────────
    getDefaultConfig() {
        return { ...DEFAULT_THEME_CONFIG };
    }
}

// ─── Utility: deep merge objects ───────────────────────────
function deepMerge(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === 'object'
        ) {
            output[key] = deepMerge(target[key], source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

module.exports = new ThemeService();
