module.exports = function (api) {
  api.cache(true);

  const plugins = [
    'react-native-reanimated/plugin', // Must be last
  ];

  if (process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_ENV === 'prod') {
    plugins.unshift('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};

