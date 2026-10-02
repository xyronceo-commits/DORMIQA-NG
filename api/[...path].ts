import { createExpressApp } from '../server';

let appPromise: ReturnType<typeof createExpressApp> | undefined;

export default async function handler(req: any, res: any) {
  try {
    appPromise ??= createExpressApp();
    const app = await appPromise;
    app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    res.status(500).json({ error: 'The API service is temporarily unavailable.' });
  }
}
