// Vercel serverless function that wraps the Express app
import app from '../server/src/index.js';

// Vercel expects the handler to be the default export
export default async (req, res) => {
  return app(req, res);
};
