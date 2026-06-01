import "../server/src/loadEnv.js";
import app from "../server/src/app.js";

/** Vercel يتعامل مع تطبيق Express مُصدَّر مباشرة (أكثر موثوقية من app(req,res) اليدوي) */
export default app;
