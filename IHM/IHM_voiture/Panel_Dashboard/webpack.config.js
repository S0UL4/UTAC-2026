const path = require("path");
module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "extension.js",
    path: path.resolve(__dirname, "dist"),
    library: { type: "commonjs2" },
  },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  module: {
    rules: [{ test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ }],
  },
  externals: { react: "react", "react-dom": "react-dom" },
  mode: "production",
};
