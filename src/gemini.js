// Runtime-safe Gemini helper.
// This file avoids importing server-only SDKs at bundle time. It works in three modes:
// 1) Server-side (Node/SSR) with VITE_GEMINI_API_KEY set: uses the official SDK via dynamic import.
// 2) Browser with VITE_GEMINI_PROXY_URL set: proxies requests to that URL (your serverless endpoint).
// 3) Fallback: returns a harmless message and logs a warning.

export const askGemini = async (prompt) => {
  try {
    const databaseBridge = (await import('./services/databaseBridge')).default;
    const corrected = await databaseBridge.correctTerm(prompt);
    
    if (corrected && corrected !== 'AI processing failed') {
      return corrected;
    }
  } catch (err) {
    console.warn('[Gemini Service] Backend proxy call failed:', err);
  }

  return 'AI currently unavailable';
};
