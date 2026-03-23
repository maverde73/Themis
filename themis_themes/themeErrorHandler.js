/**
 * Error handler middleware per le API temi.
 * Da montare DOPO le routes in app.js:
 * 
 *   app.use('/api/themes', require('./routes/themes'));
 *   app.use(themeErrorHandler);
 */

function themeErrorHandler(err, req, res, next) {
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'File troppo grande. Dimensione massima: 5 MB.',
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            error: 'Campo file non valido. Usa il campo "file".',
        });
    }

    // Custom errors with status
    if (err.status) {
        return res.status(err.status).json({
            error: err.message,
        });
    }

    // Unexpected errors
    console.error('[ThemeError]', err);
    res.status(500).json({
        error: 'Errore interno del server.',
    });
}

module.exports = { themeErrorHandler };
