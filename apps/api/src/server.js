const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`[Healthcare Access Guidance API] Server running on port ${config.port} in ${config.nodeEnv} mode.`);
  console.log(`[SAFETY NOTICE] This is an academic demonstration prototype using synthetic data only.`);
});

module.exports = server;
