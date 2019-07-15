module.exports = {
  extends: [
    'airbnb',
    'plugin:jest/recommended',
  ],
  plugins: [
    'jest',
  ],
  rules: {
    'no-underscore-dangle': 0,
    'react/jsx-filename-extension': [1, { 'extensions': ['.js', '.jsx'] }],
    'import/no-named-as-default': 0,
    'react/forbid-prop-types': 0,
    'react/no-array-index-key': 0,
  },
  parser: 'babel-eslint',
  env: {
    // node: true,
    'jest/globals': true,
    browser: true,
  },
};
