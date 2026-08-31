import app from './app';
import { env } from './config/env';
import './workers/email.worker';

const startServer = async () => {
  try {
    app.listen(env.PORT, () => {
      console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
