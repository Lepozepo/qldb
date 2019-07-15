module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  rootDir: 'src',
  setupFiles: ['dotenv/config'],
};
