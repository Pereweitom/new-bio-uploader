# Local MySQL Setup Guide

## Prerequisites

- MySQL 8.0+ installed and running on your machine
- Node.js 18+ and npm installed

## Step-by-Step Setup

### 1. Create MySQL Database

Connect to your MySQL server:

```bash
mysql -u root -p
```

Create the database:

```sql
CREATE DATABASE dlc_ui CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dlc_ui;
```

### 2. Run Database Setup Script

While connected to MySQL, run the complete setup script:

```bash
mysql -u root -p dlc_ui < database_setup.sql
```

Or copy and paste the contents of `database_setup.sql` into your MySQL client.

### 3. Update Environment Variables

Edit `.env.local` file and replace the database credentials:

```env
# Replace these with your actual MySQL credentials:
DATABASE_URL_LOCAL=mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/dlc_ui
DATABASE_URL_LIVE=mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/dlc_ui
```

**Important**: Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL root password.

### 4. Install Dependencies & Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Access the Application

1. Open your browser to: http://localhost:3000
2. Login with default credentials:
   - **Admin**: `admin@bioUploader.com` / `admin123`
   - **Staff**: `staff@bioUploader.com` / `admin123`

### 6. Test with Sample Data

Use the provided sample CSV files in the `/examples/` folder:

- `sample_students_valid.csv` - Contains valid test data
- `sample_students_with_errors.csv` - Contains errors for testing validation

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. **Check MySQL is running**:

   ```bash
   # Windows (in Command Prompt as Administrator)
   net start mysql

   # Or check MySQL service in Services.msc
   ```

2. **Verify credentials**:

   ```bash
   mysql -u root -p dlc_ui
   # Should connect without errors
   ```

3. **Check port** (default is 3306):
   ```sql
   SHOW VARIABLES WHERE Variable_name = 'port';
   ```

### Common MySQL Connection Errors

**Error**: `ER_NOT_SUPPORTED_AUTH_MODE`

```bash
# Solution: Update MySQL authentication
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

**Error**: `ECONNREFUSED`

- MySQL service is not running
- Wrong host/port in connection string
- Firewall blocking connection

**Error**: `Access denied`

- Wrong username/password
- User doesn't have privileges on the database

### Verify Database Setup

Check if tables were created successfully:

```sql
USE dlc_ui;
SHOW TABLES;

-- Should show these tables:
-- dlc_course_of_study
-- dlc_lga
-- dlc_marital_status
-- dlc_session
-- dlc_state
-- dlc_student
-- dlc_student_id
-- staff_users
```

Check sample data:

```sql
SELECT * FROM staff_users;
SELECT * FROM dlc_marital_status;
SELECT * FROM dlc_session;
```

## Testing the Application

### 1. Authentication Test

- Try logging in with the default admin credentials
- Verify you can access the dashboard

### 2. CSV Upload Test

- Use `examples/sample_students_valid.csv`
- Test both dry-run and actual upload
- Monitor real-time progress updates

### 3. Error Handling Test

- Use `examples/sample_students_with_errors.csv`
- Verify failed records are captured
- Download and review the failed records CSV

### 4. Database Verification

After successful upload, check the database:

```sql
SELECT COUNT(*) FROM dlc_student;
SELECT COUNT(*) FROM dlc_student_id;
SELECT * FROM dlc_student LIMIT 5;
```

## Default Test Credentials

The database script creates these default users:

**Administrator Account**:

- Email: `admin@bioUploader.com`
- Password: `admin123`
- Role: admin

**Staff Account**:

- Email: `staff@bioUploader.com`
- Password: `admin123`
- Role: staff

⚠️ **Security Note**: Change these passwords before production use!

## Next Steps

Once local testing is successful:

1. Test with larger CSV files
2. Verify all validation rules work correctly
3. Test job cancellation functionality
4. Review logs for any issues
5. Plan production deployment
