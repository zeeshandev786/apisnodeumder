const app = require('./app');
const { port, appName, nodeEnv } = require('./src/config/config');

app.listen(port, () => {
  console.log('----------------------------------------');
  console.log(`  ${appName} server started`);
  console.log(`  ENV  : ${nodeEnv}`);
  console.log(`  URL  : http://localhost:${port}/api`);
  console.log('----------------------------------------');
});
