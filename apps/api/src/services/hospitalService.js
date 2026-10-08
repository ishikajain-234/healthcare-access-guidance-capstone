const db = require('../db');

class HospitalService {
  /**
   * Retrieves list of all registered synthetic hospitals.
   * Handles GET /api/hospitals
   */
  async listHospitals() {
    const result = await db.query(
      `SELECT hospital_id, hospital_code, hospital_name, city, is_simulated, created_at
       FROM hospital
       ORDER BY hospital_name ASC;`
    );

    return {
      total_hospitals: result.rows.length,
      hospitals: result.rows,
    };
  }

  /**
   * Retrieves all departments for a given hospital.
   * Handles GET /api/hospitals/:hospitalId/departments
   */
  async listDepartmentsByHospital(hospitalId) {
    // 1. Verify parent hospital exists
    const hospRes = await db.query(
      `SELECT hospital_id, hospital_name FROM hospital WHERE hospital_id = $1;`,
      [hospitalId]
    );

    if (hospRes.rows.length === 0) {
      const error = new Error(`Hospital '${hospitalId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'HOSPITAL_NOT_FOUND';
      throw error;
    }

    // 2. Query departments
    const deptRes = await db.query(
      `SELECT department_id, hospital_id, department_code, department_name, is_simulated, created_at
       FROM department
       WHERE hospital_id = $1
       ORDER BY department_name ASC;`,
      [hospitalId]
    );

    return {
      hospital_id: hospitalId,
      hospital_name: hospRes.rows[0].hospital_name,
      total_departments: deptRes.rows.length,
      departments: deptRes.rows,
    };
  }
}

module.exports = new HospitalService();
