const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'inline-source-map',

  entry: {
    background: './src/background/service-worker.js',
    content: './src/content/interceptor.js',
    popup: './src/popup/popup.js',
    settings: './src/settings/settings.js',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        exclude: /node_modules/,
      },
    ],
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/settings/settings.html', to: 'settings.html' },
        { from: 'icons', to: 'icons', noErrorOnMissing: true },
      ],
    }),
  ],

  resolve: {
    extensions: ['.js'],
  },

  // Service workers cannot use eval — required for MV3
  optimization: {
    minimize: isProd,
  },
};
