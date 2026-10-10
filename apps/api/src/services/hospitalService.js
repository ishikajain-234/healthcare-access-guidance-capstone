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

  /**
   * Retrieves all consultation counters for a given hospital department.
   * Handles GET /api/hospitals/:hospitalId/departments/:departmentId/counters
   */
  async listCountersByDepartment(hospitalId, departmentId) {
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

    // 2. Verify department belongs to hospital
    const deptRes = await db.query(
      `SELECT department_id, department_name FROM department WHERE hospital_id = $1 AND department_id = $2;`,
      [hospitalId, departmentId]
    );

    if (deptRes.rows.length === 0) {
      const anyDept = await db.query(
        `SELECT hospital_id FROM department WHERE department_id = $1;`,
        [departmentId]
      );
      if (anyDept.rows.length > 0) {
        const error = new Error(`Department '${departmentId}' does not belong to hospital '${hospitalId}'.`);
        error.statusCode = 400;
        error.errorCode = 'DEPARTMENT_HOSPITAL_MISMATCH';
        throw error;
      } else {
        const error = new Error(`Department '${departmentId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'DEPARTMENT_NOT_FOUND';
        throw error;
      }
    }

    // 3. Query counters
    const counterRes = await db.query(
      `SELECT counter_id, hospital_id, department_id, counter_number, counter_name, is_active, is_simulated, created_at
       FROM opd_queue_counter
       WHERE hospital_id = $1 AND department_id = $2
       ORDER BY counter_number ASC;`,
      [hospitalId, departmentId]
    );

    return {
      hospital_id: hospitalId,
      department_id: departmentId,
      department_name: deptRes.rows[0].department_name,
      total_counters: counterRes.rows.length,
      counters: counterRes.rows,
    };
  }
}

module.exports = new HospitalService();
