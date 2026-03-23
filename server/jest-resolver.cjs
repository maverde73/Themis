/**
 * Custom Jest resolver that handles ESM-only packages with "exports" field.
 * Maps subpath imports like @noble/curves/secp256k1 to their .js files.
 */
const path = require("path");
const fs = require("fs");

module.exports = (request, options) => {
  // Handle @noble/* subpath imports (ESM exports require .js extension)
  const nobleMatch = request.match(/^@noble\/(curves|hashes|ciphers)\/(.+)$/);
  if (nobleMatch && !nobleMatch[2].endsWith(".js")) {
    // Try resolving with .js extension appended, ignoring exports field
    const pkg = `@noble/${nobleMatch[1]}`;
    const subpath = nobleMatch[2];

    // Try to find the file directly in node_modules
    for (const root of options.rootDir ? [options.rootDir] : [process.cwd()]) {
      // Check in the caller's local node_modules first (for nested deps like cuid2)
      if (options.basedir) {
        const nestedPath = path.join(options.basedir, "node_modules", pkg, subpath + ".js");
        if (fs.existsSync(nestedPath)) {
          return nestedPath;
        }
        // Also check parent directories for nested node_modules
        let dir = options.basedir;
        while (dir !== path.dirname(dir)) {
          const checkPath = path.join(dir, "node_modules", pkg, subpath + ".js");
          if (fs.existsSync(checkPath)) {
            return checkPath;
          }
          dir = path.dirname(dir);
        }
      }
    }

    // Fallback: try default resolver with .js
    try {
      return options.defaultResolver(request + ".js", options);
    } catch {
      // Fall through to default
    }
  }

  return options.defaultResolver(request, options);
};
