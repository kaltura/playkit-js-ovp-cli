const path = require('path');
const paths = require('../config/paths');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

const distFolder = path.join(process.cwd(), "/dist");
const pluginName = require(paths.appInitialConfig).pluginName;

module.exports = {
  entry: {
    [pluginName]: path.resolve(process.cwd(), "./src/index.ts")
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".scss", ".svg"],
    modules: ["node_modules", path.resolve(process.cwd(), "node_modules")],
    symlinks: false
  },
  output: {
    path: distFolder,
    filename: '[name].js',
    library: ['KalturaPlayer', 'plugins', pluginName],
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [require.resolve('source-map-loader')],
        enforce: 'pre'
      },
      {
        test: /\.tsx?$/,
        loader: require.resolve("awesome-typescript-loader"),
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: require.resolve('style-loader'),
          },
          {
            loader: require.resolve('css-loader'),
            options: {
              modules: true,
              camelCase: true,
              localIdentName: '[path][name]__[local]--[hash:base64:5]',
            }
          },
          {
            loader: require.resolve('sass-loader')
          }
        ]
      },
      {
        test: /\.svg/,
        use: {
          loader: require.resolve('svg-url-loader'),
          options: {}
        }
      }
    ]
  },
  externals: {
    '@playkit-js/playkit-js': {
      commonjs: '@playkit-js/playkit-js',
      commonjs2: '@playkit-js/playkit-js',
      amd: 'playkit-js',
      root: ['KalturaPlayer', 'core']
    }
  },
  plugins: [
    new CleanWebpackPlugin()
  ],
};
