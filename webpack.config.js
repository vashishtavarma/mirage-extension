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

// wink-nlp requires DOM — cannot run in MV3 service worker.
// Exclude from production bundle to cut package size by ~3.5 MB.
// NER runs in the content script context instead.
if (isProd) {
  plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^wink-nlp$/ }));
  plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^wink-eng-lite-web-model$/ }));
}

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

  optimization: { minimize: isProd },
};
