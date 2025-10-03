// Database table interfaces matching the schema

export interface DlcStudent {
  serialID?: number;
  applicantNo: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  gender: 'Male' | 'Female';
  date_of_birth: string; // YYYY-MM-DD format
  maritalStatus: number; // FK to dlc_marital_status.status_serial
  religion?: string;
  phoneNo?: string;
  emailAddress?: string;
  application_session?: number; // FK to dlc_session.sessionID
  course_of_study?: number; // FK to dlc_course_of_study.serialid
  country?: string;
  studyMode?: 'FULL_PROGRAMME' | 'DIRECT_ENTRY' | 'FAST_TRACK';
  password: string; // bcrypt hashed
  profession?: string;
  lga_origin?: number; // FK to dlc_lga.lga_id
}

export interface DlcStudentId {
  id?: number;
  applicant_no: string;
  matric_no: string;
  applicant_serial: number; // FK to dlc_student.serialID
  emailAddress?: string; // For backward compatibility in code
  stud_email?: string; // Actual database column name
}

export interface DlcMaritalStatus {
  status_serial: number;
  status_name: string;
}

export interface DlcSession {
  sessionID: number;
  sessionName: string;
}

export interface DlcCourseOfStudy {
  serialid: number;
  course_of_study: string;
}

export interface DlcState {
  state_id: number;
  state_name: string;
}

export interface DlcLga {
  lga_id: number;
  lga_name: string;
  state_id: number;
}

// CSV input mapping interface
export interface CsvStudentRecord {
  'S/N'?: string;
  'Application Number'?: string;
  'Matric Number': string;
  'Last Name': string;
  'First Name': string;
  'Othernames'?: string;
  'Gender': string;
  'DoB': string;
  'Marital Status'?: string;
  'Religion'?: string;
  'Phone'?: string;
  'Email'?: string;
  'Contact Address'?: string;
  'Postal Address'?: string;
  'Profession'?: string;
  'Year Of Entry': string;
  'State Of Origin'?: string;
  'LGA'?: string;
  'Nationality'?: string;
  'Faculty'?: string;
  'Department': string;
  'Programme'?: string;
  'Programme Duration'?: string;
  'Entry Mode'?: string;
  'Current Level'?: string;
  'Mode Of Study'?: string;
  'Interective Center'?: string;
  'Exam Center'?: string;
  'Teaching Subject'?: string;
  'Verification Status'?: string;
}

// Processing result interfaces
export interface ProcessingResult {
  success: boolean;
  insertedRecords: number;
  failedRecords: number;
  totalRecords: number;
  errors: ProcessingError[];
  jobId: string;
}

export interface ProcessingError {
  rowNumber: number;
  originalRow: CsvStudentRecord;
  reason: string;
  field?: string;
}

export interface JobProgress {
  jobId: string;
  progress: number; // percentage
  totalRecords: number;
  processedRecords: number;
  insertedRecords: number;
  failedRecordsCount: number;
  currentRow: number;
  message: string;
  isComplete: boolean;
  startTime: Date;
  endTime?: Date;
}