-- Migration: 001_create_survey_themes
-- Description: Creates the survey_themes table for storing theme configurations
-- Date: 2026-03-21

BEGIN;

-- Enum for background types
CREATE TYPE background_type AS ENUM ('solid', 'gradient', 'image', 'pattern');

CREATE TABLE IF NOT EXISTS survey_themes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    -- Ownership & visibility
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    is_builtin      BOOLEAN NOT NULL DEFAULT FALSE,       -- temi predefiniti di sistema
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,       -- visibile a tutti gli utenti
    cloned_from     UUID REFERENCES survey_themes(id) ON DELETE SET NULL,
    
    -- The full theme configuration as JSONB
    config          JSONB NOT NULL DEFAULT '{}',
    
    -- Thumbnail preview (auto-generated or uploaded)
    thumbnail_url   TEXT,
    
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Theme assets (background images, logos, patterns)
CREATE TABLE IF NOT EXISTS survey_theme_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_id        UUID NOT NULL REFERENCES survey_themes(id) ON DELETE CASCADE,
    
    asset_type      VARCHAR(50) NOT NULL,       -- 'background', 'logo', 'pattern', 'favicon'
    original_name   VARCHAR(255) NOT NULL,
    file_path       TEXT NOT NULL,              -- path relativo nella directory assets
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INTEGER NOT NULL,           -- bytes
    
    -- Image metadata
    width           INTEGER,
    height          INTEGER,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link survey <-> theme
ALTER TABLE surveys 
    ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES survey_themes(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_survey_themes_created_by ON survey_themes(created_by);
CREATE INDEX idx_survey_themes_builtin ON survey_themes(is_builtin) WHERE is_builtin = TRUE;
CREATE INDEX idx_survey_themes_public ON survey_themes(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_survey_theme_assets_theme ON survey_theme_assets(theme_id);
CREATE INDEX idx_surveys_theme ON surveys(theme_id) WHERE theme_id IS NOT NULL;

-- GIN index for querying inside JSONB config
CREATE INDEX idx_survey_themes_config ON survey_themes USING GIN (config);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_survey_themes_updated_at
    BEFORE UPDATE ON survey_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
