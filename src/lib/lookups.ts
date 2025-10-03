import { executeQuery } from './database';
import { 
  DlcMaritalStatus, 
  DlcSession, 
  DlcCourseOfStudy, 
  DlcState, 
  DlcLga 
} from './types';

export class DatabaseLookups {
  
  /**
   * Lookup marital status by name (case-insensitive)
   * Returns status_serial or default 1 if not found
   */
  static async lookupMaritalStatus(statusName: string): Promise<{ statusSerial: number; isDefault: boolean }> {
    try {
      const query = 'SELECT status_serial FROM dlc_marital_status WHERE LOWER(status_name) = LOWER(?)';
      const results = await executeQuery<DlcMaritalStatus>(query, [statusName.trim()]);
      
      if (results.length > 0) {
        return { statusSerial: results[0].status_serial, isDefault: false };
      }
      
      // Return default value 1 and mark as default
      return { statusSerial: 1, isDefault: true };
    } catch (error) {
      console.error('Marital status lookup failed:', error);
      return { statusSerial: 1, isDefault: true };
    }
  }

  /**
   * Lookup session using PHP-style logic
   * Matches sessionName exactly or CONCAT pattern
   */
  static async lookupSession(yearOfEntry: string): Promise<number | null> {
    try {
      const query = `
        SELECT sessionID FROM dlc_session 
        WHERE sessionName = ? 
           OR CONCAT(sessionName, '/', CAST(CAST(sessionName AS UNSIGNED) + 1 AS CHAR)) = ?
      `;
      const results = await executeQuery<DlcSession>(query, [yearOfEntry, yearOfEntry]);
      
      return results.length > 0 ? results[0].sessionID : null;
    } catch (error) {
      console.error('Session lookup failed:', error);
      return null;
    }
  }

  /**
   * Lookup course of study by department name (case-insensitive)
   * Uses Department column, fallback to Programme if Department empty
   */
  static async lookupCourseOfStudy(department: string, programme?: string): Promise<number | null> {
    try {
      // Use department first, fallback to programme if department is empty
      const searchTerm = department?.trim() || programme?.trim();
      if (!searchTerm) {
        return null;
      }

      const query = 'SELECT serialid FROM dlc_course_of_study WHERE LOWER(course_of_study) = LOWER(?)';
      const results = await executeQuery<DlcCourseOfStudy>(query, [searchTerm]);
      
      return results.length > 0 ? results[0].serialid : null;
    } catch (error) {
      console.error('Course of study lookup failed:', error);
      return null;
    }
  }

  /**
   * Lookup state by name (case-insensitive)
   */
  static async lookupState(stateName: string): Promise<number | null> {
    try {
      if (!stateName?.trim()) {
        return null;
      }

      const query = 'SELECT state_id FROM dlc_state WHERE LOWER(state_name) = LOWER(?)';
      const results = await executeQuery<DlcState>(query, [stateName.trim()]);
      
      return results.length > 0 ? results[0].state_id : null;
    } catch (error) {
      console.error('State lookup failed:', error);
      return null;
    }
  }

  /**
   * Lookup LGA by name and state ID
   * If state not found, attempt name-only lookup as fallback
   */
  static async lookupLga(lgaName: string, stateId?: number | null): Promise<{ lgaId: number | null; usedFallback: boolean }> {
    try {
      if (!lgaName?.trim()) {
        return { lgaId: null, usedFallback: false };
      }

      // First try with state verification if state ID available
      if (stateId) {
        const queryWithState = 'SELECT lga_id FROM dlc_lga WHERE LOWER(lga_name) = LOWER(?) AND state_id = ?';
        const resultsWithState = await executeQuery<DlcLga>(queryWithState, [lgaName.trim(), stateId]);
        
        if (resultsWithState.length > 0) {
          return { lgaId: resultsWithState[0].lga_id, usedFallback: false };
        }
      }

      // Fallback: try name-only lookup
      const queryNameOnly = 'SELECT lga_id FROM dlc_lga WHERE LOWER(lga_name) = LOWER(?) LIMIT 1';
      const resultsNameOnly = await executeQuery<DlcLga>(queryNameOnly, [lgaName.trim()]);
      
      if (resultsNameOnly.length > 0) {
        return { lgaId: resultsNameOnly[0].lga_id, usedFallback: true };
      }

      return { lgaId: null, usedFallback: false };
    } catch (error) {
      console.error('LGA lookup failed:', error);
      return { lgaId: null, usedFallback: false };
    }
  }

  /**
   * Check for duplicate matric number
   */
  static async checkDuplicateMatric(matricNo: string): Promise<boolean> {
    try {
      const query = 'SELECT matric_no FROM dlc_student_id WHERE matric_no = ?';
      const results = await executeQuery(query, [matricNo.trim()]);
      
      return results.length > 0;
    } catch (error) {
      console.error('Duplicate matric check failed:', error);
      return false; // Assume no duplicate on error to avoid blocking inserts
    }
  }

  /**
   * Generate unique applicant number following PHP algorithm
   * Format: YYYY + last6ofEpochTime + 4digitRandom
   */
  static async generateApplicantNo(maxRetries: number = 20): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const currentYear = new Date().getFullYear().toString();
        const epochTime = Math.floor(Date.now() / 1000).toString();
        const last6Digits = epochTime.slice(-6);
        const random4Digits = Math.floor(Math.random() * 9000 + 1000).toString();
        
        const applicantNo = currentYear + last6Digits + random4Digits;

        // Check uniqueness in both tables
        const queries = [
          'SELECT applicantNo FROM dlc_student WHERE applicantNo = ?',
          'SELECT applicant_no FROM dlc_student_id WHERE applicant_no = ?'
        ];

        let isUnique = true;
        for (const query of queries) {
          const results = await executeQuery(query, [applicantNo]);
          if (results.length > 0) {
            isUnique = false;
            break;
          }
        }

        if (isUnique) {
          return applicantNo;
        }
      } catch (error) {
        console.error(`Applicant number generation attempt ${attempt + 1} failed:`, error);
      }
    }

    throw new Error(`Failed to generate unique applicant number after ${maxRetries} attempts`);
  }
}