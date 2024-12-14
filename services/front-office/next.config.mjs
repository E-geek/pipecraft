/** @type {import('next').NextConfig} */
import addStylusSupport from './tools/stylus.mjs'

const nextConfig = {
  webpack(config) {
    return addStylusSupport(config);
  },
}

export default nextConfig;
/*

module.exports = {
  experimental: {
    turbo: {
      rules: {
        "*.react.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
        "*.styl": {
          loaders: ["stylus-loader"],
          as: "*.css",
        },
      },
    },
  },
};
*/
