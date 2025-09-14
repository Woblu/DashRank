import serverless from 'serverless-http';
import app from '../../server/index.js'; // Import your Express app

// Wrap your app in the serverless handler
export const handler = serverless(app);