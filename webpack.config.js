const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const isProd = process.env.NODE_ENV === 'production';

const plugins = [
  new CopyPlugin({
    patterns: [
      { from: 'src/popup/popup.html',       to: 'popup.html' },
      { from: 'src/popup/popup.css',        to: 'popup.css' },
      { from: 'src/settings/settings.html', to: 'settings.html' },
      { from: 'src/settings/settings.css',  to: 'settings.css' },
      { from: 'icons', to: 'icons', noErrorOnMissing: true },
    ],
  }),
];


module.exports = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'inline-source-map',

  entry: {
    background: './src/background/service-worker.js',
    content:    './src/content/interceptor.js',
    popup:      './src/popup/popup.js',
    settings:   './src/settings/settings.js',
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

  plugins,

  resolve: { extensions: ['.js'] },

  optimization: {
    minimize: isProd,
    splitChunks: false,
    runtimeChunk: false,
  },
};
