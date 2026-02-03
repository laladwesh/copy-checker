const app = require("./app");
// const { initializeScheduledJobs } = require("./scheduledJobs");
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Initialize scheduled jobs for automatic copy reallocation
  // initializeScheduledJobs();
});
