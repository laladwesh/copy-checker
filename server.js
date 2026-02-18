const app = require("./app");
const { initializeScheduledJobs } = require("./scheduledJobs");
const { cleanupOldCachedPDFs } = require("./controllers/admin.controller");
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Clean up very old cached files on startup (older than 7 days)
  console.log('[Startup] Cleaning up very old cached PDF files...');
  try {
    const result = await cleanupOldCachedPDFs(168); // 7 days = 168 hours
    console.log(`[Startup] Cache cleanup completed: ${result.deleted} old files deleted`);
  } catch (err) {
    console.warn('[Startup] Cache cleanup failed:', err.message);
  }
  
  // Initialize scheduled jobs for automatic reallocation and maintenance
  initializeScheduledJobs();
});
