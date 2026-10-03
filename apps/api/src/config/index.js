require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/healthcare_guidance_db',
  allowUnauthenticatedAdminDemo: process.env.ALLOW_UNAUTHENTICATED_ADMIN_DEMO === 'true',
  disclaimerText: 'This is a student prototype using simulated demonstration data. It provides general information-routing only. It does not confirm eligibility, coverage, approval, hospital availability, cashless treatment, medical need, or any legal status.'
};
