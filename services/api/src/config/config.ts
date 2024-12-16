import * as process from 'node:process';

export default () => ({
  port: parseInt(process.env.PORT ?? '8580', 10),
});
