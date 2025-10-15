import Papa from 'papaparse';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { executeTransaction } from './database';
import { DatabaseLookups } from './lookups';
import { 
  CsvStudentRecord, 
  DlcStudent, 
  DlcStudentId, 
  ProcessingError, 
  JobProgress 
} from './types';

export interface ProcessingOptions {
  dryRun?: boolean;
  batchSize?: number;
  onProgress?: (progress: JobProgress) => void;
  onError?: (error: ProcessingError) => void;
}

export class CsvProcessor {
  private jobId: string;
  private options: ProcessingOptions;
  private progress: JobProgress;
  private errors: ProcessingError[] = [];
  private failedCsvPath: string;
  private isCancelled = false;
  private processedMatricNumbers = new Set<string>(); // Track processed matric numbers

  constructor(jobId: string, options: ProcessingOptions = {}) {
    this.jobId = jobId;
    this.options = {
      dryRun: false,
      batchSize: parseInt(process.env.BATCH_SIZE || '500'),
      ...options
    };

    this.progress = {
      jobId,
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      insertedRecords: 0,
      failedRecordsCount: 0,
      currentRow: 0,
      message: 'Job created, waiting to start processing...',
      isComplete: false,
      startTime: new Date()
    };

    // Emit initial progress immediately
    this.emitProgress();

    // Create failed records CSV path - use system temp in production
    const tempDir = process.env.TEMP_DIR || (process.env.NODE_ENV === 'production' ? '/tmp/temp' : './temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    this.failedCsvPath = path.join(tempDir, `failed_records_${jobId}.csv`);
  }

  /**
   * Cancel the processing job
   */
  public cancel(): void {
    this.isCancelled = true;
    this.progress.message = 'Cancelling after current batch...';
    this.emitProgress();
  }

  /**
   * Count total records in CSV file for accurate progress tracking
   */
  private async countTotalRecords(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let recordCount = 0;
      const stream = fs.createReadStream(filePath);
      
      Papa.parse(stream, {
        header: true,
        skipEmptyLines: true,
        step: () => {
          recordCount++;
        },
        complete: () => {
          this.progress.totalRecords = recordCount;
          console.log(`📊 Counted ${recordCount} total records`);
          resolve();
        },
        error: (error) => {
          console.error('❌ Failed to count records:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Process CSV file from file path
   */
  public async processFile(filePath: string): Promise<void> {
    console.log(`🚀 Starting CSV processing for job ${this.jobId}`);
    console.log(`📁 File path: ${filePath}`);
    console.log(`📦 Batch size: ${this.options.batchSize}`);
    console.log(`🧪 Dry run: ${this.options.dryRun}`);
    
    // Count total records first for accurate progress tracking
    this.progress.message = 'Counting total records...';
    this.emitProgress();
    
    try {
      await this.countTotalRecords(filePath);
      console.log(`📊 Actual total records counted: ${this.progress.totalRecords}`);
    } catch {
      console.error('Failed to count records, using dynamic counting');
      this.progress.totalRecords = 0; // Will be updated as we process
    }
    
    // Brief delay to ensure everything is initialized
    console.log(`⏳ Initializing processing...`);
    this.progress.message = 'Initializing CSV processing...';
    this.emitProgress();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
    console.log(`🚀 Starting CSV parsing...`);
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const batch: CsvStudentRecord[] = [];
      let rowNumber = 0;
      let headerProcessed = false;

      Papa.parse(stream, {
        header: true,
        skipEmptyLines: true,
        step: (result: Papa.ParseStepResult<CsvStudentRecord>) => {
          if (this.isCancelled) {
            return;
          }

          rowNumber++;

          if (!headerProcessed) {
            console.log('📋 Validating CSV headers...');
            // Validate headers on first row
            const requiredFields = ['Matric Number', 'Last Name', 'First Name', 'Gender', 'DoB', 'Year Of Entry', 'Department'];
            const headers = Object.keys(result.data);
            console.log(`📋 Found headers: ${headers.join(', ')}`);
            const missingFields = requiredFields.filter(field => 
              !headers.some(header => header.toLowerCase() === field.toLowerCase())
            );

            if (missingFields.length > 0) {
              console.log(`❌ Missing headers: ${missingFields.join(', ')}`);
              reject(new Error(`Missing required CSV headers: ${missingFields.join(', ')}`));
              return;
            }

            console.log('✅ Headers validated successfully');
            headerProcessed = true;
            this.progress.message = 'Processing CSV rows...';
            this.emitProgress();
            return; // Skip header row from processing
          }

          // Add row to current batch
          batch.push({ ...result.data, rowNumber } as any);
          console.log(`� Added row ${rowNumber} to batch (batch size: ${batch.length}/${this.options.batchSize})`);
        },
        complete: async () => {
          try {
            console.log(`📊 CSV parsing complete. Processing all batches...`);
            
            // Process all collected rows in batches sequentially
            let currentBatch: CsvStudentRecord[] = [];
            let batchNumber = 1;
            
            for (let i = 0; i < batch.length; i++) {
              currentBatch.push(batch[i]);
              
              // Process batch when it reaches the configured size or we're at the end
              if (currentBatch.length >= this.options.batchSize! || i === batch.length - 1) {
                if (currentBatch.length > 0 && !this.isCancelled) {
                  console.log(`📦 Processing batch ${batchNumber} of ${currentBatch.length} records`);
                  await this.processBatch(currentBatch);
                  console.log(`✅ Batch ${batchNumber} processed successfully`);
                  currentBatch = []; // Clear batch
                  batchNumber++;
                }
              }
            }

            // If we didn't count records upfront, update total records now
            if (this.progress.totalRecords === 0) {
              this.progress.totalRecords = rowNumber - 1; // Subtract 1 for header row
              console.log(`📊 Final actual total records (dynamic count): ${this.progress.totalRecords}`);
            } else {
              console.log(`📊 Processing complete. Expected: ${this.progress.totalRecords}, Processed: ${rowNumber - 1}`);
            }

            // Finalize processing
            this.progress.isComplete = true;
            this.progress.endTime = new Date();
            this.progress.progress = 100;
            this.progress.message = this.isCancelled 
              ? 'Processing cancelled' 
              : `Processing complete. ${this.progress.insertedRecords} records updated/inserted, ${this.progress.failedRecordsCount} failed.`;
            
            this.emitProgress();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }

  /**
   * Process a batch of CSV records
   */
  private async processBatch(batch: CsvStudentRecord[]): Promise<void> {
    console.log(`🔄 Starting processBatch with ${batch.length} records`);
    this.progress.message = `Processing batch of ${batch.length} records...`;
    this.emitProgress();
    
    // Clear processed matric numbers for this batch to prevent cross-batch issues
    // Note: We want to track duplicates within the same batch, but allow processing
    // the same matric number if it appears in different batches (though it will fail at DB level)
    const batchProcessedMatricNumbers = new Set<string>();
    
    // Small delay between batches for progress updates
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between batches

    for (const row of batch) {
      if (this.isCancelled) {
        break;
      }

      // Check for duplicate within this batch
      const matricNumber = row['Matric Number']?.trim();
      if (batchProcessedMatricNumbers.has(matricNumber)) {
        console.log(`⚠️ Skipping duplicate matric number in same batch: ${matricNumber}`);
        this.progress.processedRecords++;
        continue; // Skip to next record
      }
      
      batchProcessedMatricNumbers.add(matricNumber);

      try {
        const processedRecord = await this.processRecord(row, true); // Skip duplicate check (already done)
        
        // Only increment counters if we actually processed something
        if (processedRecord) {
          if (!this.options.dryRun) {
            const wasUpdated = await this.upsertRecord(processedRecord);
            if (wasUpdated) {
              this.progress.insertedRecords++;
            }
          } else {
            // In dry run mode, count as inserted for progress tracking
            console.log(`🧪 DRY RUN: Would process record for ${row['Matric Number']} - ${row['Last Name']}, ${row['First Name']}`);
            this.progress.insertedRecords++;
          }
          this.progress.processedRecords++;
        } else {
          // If processedRecord is null (skipped duplicate), still count it as processed
          // but don't try to insert it
          this.progress.processedRecords++;
        }
        
      } catch (error) {
        await this.handleProcessingError(row, error as Error);
        // Still increment processed count for error records
        this.progress.processedRecords++;
      }

      // Update progress
      this.progress.currentRow = this.progress.processedRecords;
      if (this.progress.totalRecords > 0) {
        this.progress.progress = (this.progress.processedRecords / this.progress.totalRecords) * 100;
      }
      
      // Small delay between records for progress visibility
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms per record
    }

    this.emitProgress();
  }

  /**
   * Process and validate a single CSV record
   */
  private async processRecord(row: CsvStudentRecord, skipDuplicateCheck: boolean = false): Promise<{ student: DlcStudent; studentId: DlcStudentId } | null> {
    const matricNumber = row['Matric Number']?.trim();
    
    // Skip duplicate check if already done at batch level
    if (!skipDuplicateCheck) {
      // Skip if already processed in this batch to prevent duplicates
      if (this.processedMatricNumbers.has(matricNumber)) {
        console.log(`⚠️ Skipping duplicate matric number in same batch: ${matricNumber}`);
        return null;
      }
      
      // Mark as processed
      this.processedMatricNumbers.add(matricNumber);
    }
    
    // Validate required fields
    const requiredFields = [
      { field: 'Matric Number', value: row['Matric Number'] },
      { field: 'Last Name', value: row['Last Name'] },
      { field: 'First Name', value: row['First Name'] },
      { field: 'Gender', value: row['Gender'] },
      { field: 'DoB', value: row['DoB'] },
      { field: 'Year Of Entry', value: row['Year Of Entry'] },
      { field: 'Department', value: row['Department'] }
    ];

    for (const { field, value } of requiredFields) {
      if (!value?.trim()) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Note: We don't check for duplicates here anymore - let upsertRecord() handle it
    // This avoids double database queries and lets the transaction handle the logic

    // Normalize and validate gender
    const gender = this.normalizeGender(row['Gender']);
    if (!gender) {
      throw new Error(`Invalid gender: ${row['Gender']}`);
    }

    // Parse and validate date of birth
    const dateOfBirth = this.parseDate(row['DoB']);
    if (!dateOfBirth) {
      throw new Error(`Invalid date of birth: ${row['DoB']}`);
    }

    // Validate email if provided
    if (row['Email'] && !this.isValidEmail(row['Email'])) {
      throw new Error(`Invalid email format: ${row['Email']}`);
    }

    // Validate phone if provided
    if (row['Phone'] && !this.isValidPhone(row['Phone'])) {
      throw new Error(`Invalid phone format: ${row['Phone']}`);
    }

    // Perform database lookups
    const maritalStatusResult = await DatabaseLookups.lookupMaritalStatus(row['Marital Status'] || '');
    if (maritalStatusResult.isDefault) {
      console.warn(`Warning: Using default marital status for row ${(row as any).rowNumber || this.progress.currentRow}`);
    }

    const sessionId = await DatabaseLookups.lookupSession(row['Year Of Entry']);
    if (!sessionId) {
      throw new Error(`Session not found for year: ${row['Year Of Entry']}`);
    }

    const courseOfStudyId = await DatabaseLookups.lookupCourseOfStudy(row['Department'], row['Programme']);
    if (!courseOfStudyId) {
      throw new Error(`Course of study not found for department: ${row['Department']}`);
    }

    const stateId = await DatabaseLookups.lookupState(row['State Of Origin'] || '');
    const lgaResult = await DatabaseLookups.lookupLga(row['LGA'] || '', stateId);
    if (lgaResult.usedFallback) {
      console.warn(`Warning: LGA lookup used fallback for row ${(row as any).rowNumber || this.progress.currentRow}`);
    }

    // Generate applicant number
    const applicantNo = await DatabaseLookups.generateApplicantNo();

    // Hash password (using last name as raw password)
    const saltRounds = parseInt(process.env.SALT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(row['Last Name'].trim(), saltRounds);

    // Map study mode
    const studyMode = this.mapStudyMode(row['Programme Duration'] || '');

    // Create student record
    const student: DlcStudent = {
      applicantNo,
      lastName: row['Last Name'].trim(),
      firstName: row['First Name'].trim(),
      middleName: row['Othernames']?.trim() || undefined,
      gender,
      date_of_birth: dateOfBirth,
      maritalStatus: maritalStatusResult.statusSerial,
      religion: row['Religion']?.trim() || undefined,
      phoneNo: row['Phone']?.trim() || undefined,
      emailAddress: row['Email']?.trim() || undefined,
      application_session: sessionId,
      course_of_study: courseOfStudyId,
      country: row['Nationality']?.trim() || undefined,
      studyMode,
      password: hashedPassword,
      profession: row['Profession']?.trim() || undefined,
      lga_origin: lgaResult.lgaId || undefined
    };

    const studentId: DlcStudentId = {
      applicant_no: applicantNo,
      matric_no: row['Matric Number'].trim(),
      applicant_serial: 0, // Will be set after student insert
      emailAddress: row['Email']?.trim() || undefined, // For backward compatibility
      stud_email: row['Email']?.trim() || undefined // Actual database column
    };

    return { student, studentId };
  }

  /**
   * Insert record into database using transaction
   * @returns boolean indicating whether a database operation occurred
   */
  private async upsertRecord(record: { student: DlcStudent; studentId: DlcStudentId }): Promise<boolean> {
    return await executeTransaction(async (connection) => {
      console.log(`🔍 Checking if student exists: ${record.student.applicantNo}`);
      
      // Check if student already exists by matric number - get all relevant fields
      const checkQuery = `
        SELECT s.serialID, s.emailAddress, s.studyMode, s.password, si.matric_no, si.stud_email 
        FROM dlc_student s 
        LEFT JOIN dlc_student_id si ON s.serialID = si.applicant_serial 
        WHERE s.applicantNo = ? OR si.matric_no = ?
      `;
      
      const [existingRecords] = await connection.execute(checkQuery, [
        record.student.applicantNo, 
        record.studentId.matric_no
      ]);
      
      const existing = (existingRecords as any[])[0];
      
      if (existing) {
        console.log(`🔄 Student exists, checking what needs updating: ${record.student.applicantNo}`);
        console.log(`📋 Found existing record:`, {
          serialID: existing.serialID,
          matric_no: existing.matric_no,
          emailAddress: existing.emailAddress || '(empty)',
          stud_email: existing.stud_email || '(empty)',
          studyMode: existing.studyMode || '(empty)',
          password: existing.password ? '(has password)' : '(empty)'
        });
        
        // Check what fields need updating
        const needsPasswordUpdate = !existing.password || existing.password.trim() === '';
        const needsEmailUpdate = !existing.emailAddress || existing.emailAddress.trim() === '';
        const needsStudEmailUpdate = !existing.stud_email || existing.stud_email.trim() === '';
        const needsStudyModeUpdate = !existing.studyMode || existing.studyMode.trim() === '';
        
        console.log(`🔍 Update check:`, {
          needsPasswordUpdate,
          needsEmailUpdate, 
          needsStudEmailUpdate,
          needsStudyModeUpdate
        });
        
        // If no updates are needed, skip this record
        if (!needsPasswordUpdate && !needsEmailUpdate && !needsStudEmailUpdate && !needsStudyModeUpdate) {
          console.log(`⏭️ All fields already filled, skipping update for: ${record.student.applicantNo}`);
          return false; // No database operation occurred
        }
        
        console.log(`🔄 Updating fields for existing student: ${record.student.applicantNo}`);
        
        // Update dlc_student - only update empty fields
        const updateStudentQuery = `
          UPDATE dlc_student SET 
            emailAddress = CASE WHEN (emailAddress IS NULL OR emailAddress = '' OR emailAddress = ' ') THEN ? ELSE emailAddress END,
            studyMode = CASE WHEN (studyMode IS NULL OR studyMode = '' OR studyMode = ' ') THEN ? ELSE studyMode END,
            password = CASE WHEN (password IS NULL OR password = '' OR password = ' ') THEN ? ELSE password END
          WHERE serialID = ?
        `;
        
        // Prepare password if needed
        let updatePassword = existing.password;
        if (needsPasswordUpdate && record.student.lastName) {
          updatePassword = await bcrypt.hash(record.student.lastName.toLowerCase(), 10);
          console.log(`🔐 Setting password from lastName for existing student`);
        }
        
        await connection.execute(updateStudentQuery, [
          record.student.emailAddress || null,
          record.student.studyMode || null,
          updatePassword,
          existing.serialID
        ]);
        
        // Update dlc_student_id - only update empty stud_email field
        if (needsStudEmailUpdate && record.studentId.stud_email) {
          console.log(`📧 Updating dlc_student_id stud_email for serialID: ${existing.serialID}`);
          console.log(`📧 New email: ${record.studentId.stud_email}`);
          
          const updateStudentIdQuery = `
            UPDATE dlc_student_id SET 
              stud_email = ?
            WHERE applicant_serial = ? AND (stud_email IS NULL OR stud_email = '' OR stud_email = ' ')
          `;
          
          const [updateResult] = await connection.execute(updateStudentIdQuery, [
            record.studentId.stud_email,
            existing.serialID
          ]);
          
          console.log(`📊 stud_email update result - Affected rows: ${(updateResult as any).affectedRows}`);
        }
        
        console.log(`✅ Updated existing student: ${record.student.applicantNo}`);
        return true; // Database update occurred
        
      } else {
        console.log(`➕ Inserting new student: ${record.student.applicantNo}`);
        
        // Insert new student
        const studentQuery = `
          INSERT INTO dlc_student (
            applicantNo, lastName, firstName, middleName, gender, date_of_birth,
            maritalStatus, religion, phoneNo, emailAddress, application_session,
            course_of_study, country, studyMode, password, profession, lga_origin
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const studentValues = [
          record.student.applicantNo,
          record.student.lastName,
          record.student.firstName,
          record.student.middleName,
          record.student.gender,
          record.student.date_of_birth,
          record.student.maritalStatus,
          record.student.religion,
          record.student.phoneNo,
          record.student.emailAddress,
          record.student.application_session,
          record.student.course_of_study,
          record.student.country,
          record.student.studyMode,
          record.student.password,
          record.student.profession,
          record.student.lga_origin
        ];

        const [studentResult] = await connection.execute(studentQuery, studentValues);
        const serialID = (studentResult as any).insertId;

        // Insert into dlc_student_id
        const studentIdQuery = `
          INSERT INTO dlc_student_id (applicant_no, matric_no, applicant_serial, stud_email)
          VALUES (?, ?, ?, ?)
        `;

        await connection.execute(studentIdQuery, [
          record.studentId.applicant_no,
          record.studentId.matric_no,
          serialID,
          record.studentId.stud_email
        ]);
        
        console.log(`✅ Inserted new student: ${record.student.applicantNo}`);
        return true; // Database insert occurred
      }
    });
  }

  /**
   * Handle processing errors
   */
  private async handleProcessingError(row: CsvStudentRecord, error: Error): Promise<void> {
    const processingError: ProcessingError = {
      rowNumber: (row as any).rowNumber || this.progress.currentRow,
      originalRow: row,
      reason: error.message
    };

    this.errors.push(processingError);
    this.progress.failedRecordsCount++;

    // Write to failed CSV
    await this.writeFailedRecord(row, error.message);

    if (this.options.onError) {
      this.options.onError(processingError);
    }
  }

  /**
   * Write failed record to CSV
   */
  private async writeFailedRecord(row: CsvStudentRecord, failureReason: string): Promise<void> {
    const failedRecord = {
      ...row,
      failure_reason: failureReason,
      row_number: (row as any).rowNumber || this.progress.currentRow
    };

    const csvLine = Papa.unparse([failedRecord], { header: !fs.existsSync(this.failedCsvPath) });
    fs.appendFileSync(this.failedCsvPath, csvLine + '\n');
  }

  /**
   * Emit progress update
   */
  private emitProgress(): void {
    if (this.options.onProgress) {
      this.options.onProgress({ ...this.progress });
    }
  }

  /**
   * Utility methods
   */
  private normalizeGender(gender: string): 'Male' | 'Female' | null {
    const normalized = gender.toLowerCase().trim();
    if (normalized === 'm' || normalized === 'male') return 'Male';
    if (normalized === 'f' || normalized === 'female') return 'Female';
    return null;
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null;

    // Try different date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/ // M/D/YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        
        if (format === formats[0]) { // YYYY-MM-DD
          [, year, month, day] = match;
        } else { // DD-MM-YYYY or DD/MM/YYYY
          [, day, month, year] = match;
        }

        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
      }
    }

    // Fallback to Date.parse
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(phone);
  }

  private mapStudyMode(duration: string): 'FULL_PROGRAMME' | 'DIRECT_ENTRY' | 'FAST_TRACK' | undefined {
    if (!duration) return 'FULL_PROGRAMME'; // Default

    const durationStr = duration.toLowerCase();
    if (durationStr.includes('5')) return 'FULL_PROGRAMME';
    if (durationStr.includes('4')) return 'DIRECT_ENTRY';
    if (durationStr.includes('3')) return 'FAST_TRACK';
    
    return 'FULL_PROGRAMME'; // Default
  }

  /**
   * Get failed records CSV path
   */
  public getFailedCsvPath(): string {
    return this.failedCsvPath;
  }

  /**
   * Get processing errors
   */
  public getErrors(): ProcessingError[] {
    return this.errors;
  }

  /**
   * Get current progress
   */
  public getProgress(): JobProgress {
    return { ...this.progress };
  }
}