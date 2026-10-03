const db = require('../db');

class ReferencePackageService {
  async getAllPackages() {
    const queryText = `
      SELECT package_id, source_id, import_run_id, category_id, specialty_name, procedure_name, procedure_code,
             is_simulated_reference, data_status, simulation_notice,
             official_verification_channel, help_desk_contact, seed_version
      FROM package_reference
      ORDER BY package_id ASC;
    `;
    const result = await db.query(queryText);
    return {
      total_packages: result.rows.length,
      packages: result.rows,
      disclaimer: 'Demonstration synthetic records only. Does not determine eligibility, coverage, or legal entitlement.',
    };
  }
}

module.exports = new ReferencePackageService();
