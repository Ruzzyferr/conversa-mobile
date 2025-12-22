const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Monorepo’da root node_modules watch hatasını önlemek için:
// root'ta BOŞ node_modules klasörü kalsın (sen zaten yaptın)

module.exports = config;
