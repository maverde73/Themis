const Joi = require('joi');

// ─── Helpers ───────────────────────────────────────────────
const cssColor = Joi.string().pattern(/^(#[0-9a-fA-F]{3,8}|rgba?\(.+\)|hsla?\(.+\)|transparent|inherit)$/);
const cssSize = Joi.string().pattern(/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/);
const cssFontWeight = Joi.alternatives().try(
    Joi.string().valid('100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold'),
    Joi.number().integer().min(100).max(900)
);

// ─── Sub-schemas ───────────────────────────────────────────

const colorsSchema = Joi.object({
    pageBackground:     cssColor.default('#f0f2f5'),
    surface:            cssColor.default('#ffffff'),
    primary:            cssColor.default('#1976d2'),
    primaryHover:       cssColor.default('#1565c0'),
    text:               cssColor.default('#212121'),
    textSecondary:      cssColor.default('#757575'),
    border:             cssColor.default('#e0e0e0'),
    error:              cssColor.default('#d32f2f'),
    success:            cssColor.default('#388e3c'),
    warning:            cssColor.default('#f57c00'),
    inputBackground:    cssColor.default('#ffffff'),
    inputBorder:        cssColor.default('#bdbdbd'),
    inputFocus:         cssColor.default('#1976d2'),
    selectionHighlight: cssColor.default('rgba(25,118,210,0.08)'),
    required:           cssColor.default('#d32f2f'),
}).default();

const typographySchema = Joi.object({
    fontFamily:         Joi.string().default('Inter, -apple-system, sans-serif'),
    fontFamilyHeading:  Joi.string().default(null).allow(null), // null = same as fontFamily
    titleSize:          cssSize.default('28px'),
    titleWeight:        cssFontWeight.default('700'),
    titleColor:         cssColor.optional(),                     // null = uses colors.text
    subtitleSize:       cssSize.default('16px'),
    subtitleWeight:     cssFontWeight.default('400'),
    sectionTitleSize:   cssSize.default('18px'),
    sectionTitleWeight: cssFontWeight.default('600'),
    labelSize:          cssSize.default('14px'),
    labelWeight:        cssFontWeight.default('600'),
    bodySize:           cssSize.default('14px'),
    bodyWeight:         cssFontWeight.default('400'),
    lineHeight:         Joi.alternatives().try(Joi.number(), Joi.string()).default('1.5'),
    letterSpacing:      cssSize.optional(),
}).default();

const spacingSchema = Joi.object({
    formMaxWidth:       cssSize.default('720px'),
    formPadding:        cssSize.default('32px'),
    formPaddingMobile:  cssSize.default('16px'),
    sectionGap:         cssSize.default('28px'),
    fieldGap:           cssSize.default('20px'),
    borderRadius:       cssSize.default('8px'),
    inputPadding:       cssSize.default('12px'),
    inputBorderRadius:  cssSize.default('6px'),
    inputBorderWidth:   cssSize.default('1px'),
}).default();

const backgroundSchema = Joi.object({
    type:       Joi.string().valid('solid', 'gradient', 'image', 'pattern').default('solid'),
    value:      Joi.string().default('#f0f2f5'),  // color | gradient CSS | asset URL
    overlay:    Joi.object({
        color:      cssColor.default('rgba(0,0,0,0.3)'),
        blendMode:  Joi.string().valid(
            'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'
        ).default('normal'),
    }).optional().allow(null).default(null),
    size:       Joi.string().valid('cover', 'contain', 'auto').default('cover'),
    position:   Joi.string().default('center center'),
    repeat:     Joi.string().valid('no-repeat', 'repeat', 'repeat-x', 'repeat-y').default('no-repeat'),
    fixed:      Joi.boolean().default(false),       // background-attachment: fixed
    blur:       cssSize.optional(),                  // backdrop blur sull'overlay
}).default();

const headerSchema = Joi.object({
    show:               Joi.boolean().default(true),
    logoUrl:            Joi.string().uri().optional().allow(null, '').default(null),
    logoPosition:       Joi.string().valid('left', 'center', 'right').default('left'),
    logoMaxHeight:      cssSize.default('60px'),
    showDivider:        Joi.boolean().default(true),
    dividerColor:       cssColor.optional(),          // null = uses colors.border
    dividerWidth:       cssSize.default('1px'),
    padding:            cssSize.default('24px'),
}).default();

const buttonsSchema = Joi.object({
    backgroundColor:        cssColor.default('#1976d2'),
    textColor:              cssColor.default('#ffffff'),
    hoverBackgroundColor:   cssColor.default('#1565c0'),
    borderRadius:           cssSize.default('6px'),
    padding:                Joi.string().default('10px 24px'),
    fontSize:               cssSize.default('14px'),
    fontWeight:             cssFontWeight.default('600'),
    textTransform:          Joi.string().valid('none', 'uppercase', 'capitalize').default('none'),
    shadow:                 Joi.string().default('none'),
    border:                 Joi.string().default('none'),
}).default();

const cardSchema = Joi.object({
    backgroundColor:    cssColor.default('#ffffff'),
    borderColor:        cssColor.default('#e0e0e0'),
    borderWidth:        cssSize.default('1px'),
    borderRadius:       cssSize.default('12px'),
    shadow:             Joi.string().default('0 2px 8px rgba(0,0,0,0.08)'),
    padding:            cssSize.default('32px'),
    paddingMobile:      cssSize.default('20px'),
}).default();

const progressBarSchema = Joi.object({
    show:               Joi.boolean().default(true),
    height:             cssSize.default('6px'),
    backgroundColor:    cssColor.default('#e0e0e0'),
    fillColor:          cssColor.optional(),      // null = uses colors.primary
    borderRadius:       cssSize.default('3px'),
    position:           Joi.string().valid('top', 'bottom').default('top'),
}).default();

const radioCheckboxSchema = Joi.object({
    size:               cssSize.default('20px'),
    borderColor:        cssColor.optional(),      // null = uses colors.inputBorder
    checkedColor:       cssColor.optional(),      // null = uses colors.primary
    borderRadius:       cssSize.default('4px'),   // for checkbox; radio always circular
    hoverBackground:    cssColor.default('rgba(25,118,210,0.04)'),
    optionPadding:      cssSize.default('10px'),
    optionBorderRadius: cssSize.default('8px'),
    optionBorder:       Joi.string().default('1px solid transparent'),
    optionSelectedBorder: Joi.string().optional(), // border when option is selected
    optionSelectedBg:   cssColor.optional(),       // background when selected
}).default();

const customCssSchema = Joi.object({
    raw:                Joi.string().max(10000).optional().allow('').default(''),
}).default();

// ─── Main Theme Config Schema ──────────────────────────────

const themeConfigSchema = Joi.object({
    colors:         colorsSchema,
    typography:     typographySchema,
    spacing:        spacingSchema,
    background:     backgroundSchema,
    header:         headerSchema,
    buttons:        buttonsSchema,
    card:           cardSchema,
    progressBar:    progressBarSchema,
    radioCheckbox:  radioCheckboxSchema,
    customCss:      customCssSchema,
}).default();

// ─── Theme Metadata Schema (for create/update API) ────────

const createThemeSchema = Joi.object({
    name:           Joi.string().trim().min(1).max(255).required(),
    description:    Joi.string().trim().max(1000).optional().allow('', null),
    is_public:      Joi.boolean().default(false),
    cloned_from:    Joi.string().uuid().optional().allow(null),
    config:         themeConfigSchema,
});

const updateThemeSchema = Joi.object({
    name:           Joi.string().trim().min(1).max(255).optional(),
    description:    Joi.string().trim().max(1000).optional().allow('', null),
    is_public:      Joi.boolean().optional(),
    config:         themeConfigSchema.optional(),
}).min(1); // at least one field

// ─── Defaults export (useful for frontend) ─────────────────

const DEFAULT_THEME_CONFIG = {
    colors: {
        pageBackground: '#f0f2f5',
        surface: '#ffffff',
        primary: '#1976d2',
        primaryHover: '#1565c0',
        text: '#212121',
        textSecondary: '#757575',
        border: '#e0e0e0',
        error: '#d32f2f',
        success: '#388e3c',
        warning: '#f57c00',
        inputBackground: '#ffffff',
        inputBorder: '#bdbdbd',
        inputFocus: '#1976d2',
        selectionHighlight: 'rgba(25,118,210,0.08)',
        required: '#d32f2f',
    },
    typography: {
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontFamilyHeading: null,
        titleSize: '28px',
        titleWeight: '700',
        subtitleSize: '16px',
        subtitleWeight: '400',
        sectionTitleSize: '18px',
        sectionTitleWeight: '600',
        labelSize: '14px',
        labelWeight: '600',
        bodySize: '14px',
        bodyWeight: '400',
        lineHeight: '1.5',
    },
    spacing: {
        formMaxWidth: '720px',
        formPadding: '32px',
        formPaddingMobile: '16px',
        sectionGap: '28px',
        fieldGap: '20px',
        borderRadius: '8px',
        inputPadding: '12px',
        inputBorderRadius: '6px',
        inputBorderWidth: '1px',
    },
    background: {
        type: 'solid',
        value: '#f0f2f5',
        overlay: null,
        size: 'cover',
        position: 'center center',
        repeat: 'no-repeat',
        fixed: false,
    },
    header: {
        show: true,
        logoUrl: null,
        logoPosition: 'left',
        logoMaxHeight: '60px',
        showDivider: true,
        dividerColor: null,
        dividerWidth: '1px',
        padding: '24px',
    },
    buttons: {
        backgroundColor: '#1976d2',
        textColor: '#ffffff',
        hoverBackgroundColor: '#1565c0',
        borderRadius: '6px',
        padding: '10px 24px',
        fontSize: '14px',
        fontWeight: '600',
        textTransform: 'none',
        shadow: 'none',
        border: 'none',
    },
    card: {
        backgroundColor: '#ffffff',
        borderColor: '#e0e0e0',
        borderWidth: '1px',
        borderRadius: '12px',
        shadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '32px',
        paddingMobile: '20px',
    },
    progressBar: {
        show: true,
        height: '6px',
        backgroundColor: '#e0e0e0',
        fillColor: null,
        borderRadius: '3px',
        position: 'top',
    },
    radioCheckbox: {
        size: '20px',
        borderColor: null,
        checkedColor: null,
        borderRadius: '4px',
        hoverBackground: 'rgba(25,118,210,0.04)',
        optionPadding: '10px',
        optionBorderRadius: '8px',
        optionBorder: '1px solid transparent',
        optionSelectedBorder: null,
        optionSelectedBg: null,
    },
    customCss: {
        raw: '',
    },
};

module.exports = {
    themeConfigSchema,
    createThemeSchema,
    updateThemeSchema,
    DEFAULT_THEME_CONFIG,
    // Export sub-schemas for partial validation in theme editor
    subSchemas: {
        colors: colorsSchema,
        typography: typographySchema,
        spacing: spacingSchema,
        background: backgroundSchema,
        header: headerSchema,
        buttons: buttonsSchema,
        card: cardSchema,
        progressBar: progressBarSchema,
        radioCheckbox: radioCheckboxSchema,
        customCss: customCssSchema,
    },
};
