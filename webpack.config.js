const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  entry: './src/index.js',
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'Safnect',
      type: 'var',
    }
  },
  plugins: [
    new NodePolyfillPlugin(),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    // new BundleAnalyzerPlugin({
      // analyzerMode: 'json',
      // openAnalyzer: false
    // })
  ],
  resolve: {
    alias: {
      fs: false, // 或者可以设置为一个空对象 {}
      '@src': path.resolve(__dirname, 'src'),
      '@libs': path.resolve(__dirname, 'src/libs'),
      // 'bitcore-lib-inquisition': path.resolve(__dirname, 'customized-lib.js')
    },
  },
   module: {
    rules: [
      {
        test: /\.m?js$/, // 匹配.js和.mjs文件
        exclude: /node_modules/, // 排除node_modules中的文件
        use: {
          loader: 'babel-loader', // 使用babel-loader转译
        },
      },
    ],
  },
  target: 'web', // 指定打包目标为Web环境
  mode: 'production', // 或'development'根据需要选择
  optimization: {
    splitChunks: {
      cacheGroups: {
        // default: {
        //   name: 'common',
        //   chunks: 'inital',
        //   minChunks: 2,
        //   priority: -20
        // },
        vendors: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          chunks: 'initial',
          priority: -10
        }
      }
    },
    // minimize: true,
    // minimizer: [new TerserPlugin({
    //   terserOptions: {
    //     format: {
    //       comments: false
    //     }
    //   },
    //   extractComments: false
    // })],
  },
};