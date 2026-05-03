//@ts-check

'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin'); // Tambahkan import ini

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node',
  mode: 'none',

  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode',
    'web-tree-sitter': 'commonjs web-tree-sitter'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  // TAMBAHKAN BAGIAN PLUGINS DI BAWAH INI
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // Menyalin engine inti tree-sitter.wasm dari node_modules ke dist/
        { 
          from: path.resolve(__dirname, 'node_modules/web-tree-sitter/web-tree-sitter.wasm'), 
          to: path.resolve(__dirname, 'dist') 
        },
        // Menyalin language PHP dari folder bin ke dist/
        { 
          from: path.resolve(__dirname, 'bin/tree-sitter-php.wasm'), 
          to: path.resolve(__dirname, 'dist') 
        },
      ],
    }),
  ],
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log",
  },
};

module.exports = [ extensionConfig ];