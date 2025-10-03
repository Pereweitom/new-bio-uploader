# Student Biodata Uploader

A Next.js 14 full-stack web application for bulk uploading student biodata from CSV files with MySQL integration, authentication, and real-time progress tracking.

## Features

- **Bulk CSV Upload**: Process large CSV files with student biodata (up to 200MB)
- **Real-time Progress**: Server-Sent Events (SSE) for live progress updates
- **Batch Processing**: Configurable batch sizes for optimal performance
- **Data Validation**: Comprehensive validation with detailed error reporting
- **Failed Records Management**: Download CSV of failed records for correction
- **Dry Run Mode**: Validate data without inserting into database
- **Authentication**: JWT-based authentication for staff users
- **Database Integration**: MySQL with proper foreign key lookups
- **Password Security**: bcrypt hashing for user passwords

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database and JWT settings
   ```

3. **Set up database**

   - Create MySQL database with required tables (see Database Schema)
   - Add sample lookup data (marital status, sessions, courses, states/LGAs)
   - Create staff user for authentication

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Access application**
   Open [http://localhost:3000](http://localhost:3000) and login with staff credentials

## Architecture

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with streaming
- **Database**: MySQL with connection pooling
- **Authentication**: JWT tokens
- **File Processing**: Streaming CSV parser with batch operations

## CSV Format

Required columns: Matric Number, Last Name, First Name, Gender, DoB, Year Of Entry, Department

Sample CSV:

```csv
Matric Number,Last Name,First Name,Gender,DoB,Year Of Entry,Department
DLC/2023/001,Doe,John,Male,1995-05-15,2023,Computer Science
DLC/2023/002,Smith,Jane,Female,1996-03-20,2023,Mathematics
```

## Database Schema

Key tables required:

- `dlc_student` - Main student records
- `dlc_student_id` - Matric number mapping
- `dlc_marital_status` - Marital status lookup
- `dlc_session` - Academic sessions
- `dlc_course_of_study` - Departments/courses
- `dlc_state` - Nigerian states
- `dlc_lga` - Local government areas
- `staff_users` - Authentication

## Deployment Notes

⚠️ **Important**: Vercel serverless functions have timeout limitations unsuitable for large batch processing.

**Recommended**: Deploy frontend to Vercel, backend API to long-running Node.js host (Railway, Render, DigitalOcean).

## API Endpoints

- `POST /api/auth` - Staff login
- `POST /api/upload` - Upload CSV file
- `GET /api/progress?jobId=<id>` - Progress updates (SSE)
- `POST /api/cancel` - Cancel job
- `GET /api/download-errors?jobId=<id>` - Download failed records

## Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

For detailed documentation, database schema, and deployment instructions, see the full README sections above.
