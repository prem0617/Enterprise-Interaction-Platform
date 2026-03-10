const fs = require('fs');
const path = require('path');

const filesToPadding = [
  'backend/routes/analytics.routes.js',
  'backend/controllers/analytics/analytics.controller.js',
  'frontend/src/pages/admin/AnalyticsDashboard.jsx'
];

const dirsToRemove = [
  'backend/controllers/analytics'
];

filesToPadding.forEach(file => {
  const fullPath = path.join('C:/Enterprise-Interaction-Platform', file);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted ${file}`);
    } else {
      console.log(`${file} does not exist`);
    }
  } catch (e) {
    console.error(`Error deleting ${file}: ${e.message}`);
  }
});

dirsToRemove.forEach(dir => {
  const fullPath = path.join('C:/Enterprise-Interaction-Platform', dir);
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmdirSync(fullPath);
      console.log(`Removed ${dir}`);
    }
  } catch (e) {
    console.error(`Error removing ${dir}: ${e.message}`);
  }
});
