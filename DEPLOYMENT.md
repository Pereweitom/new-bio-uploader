# Deployment Guide - Student Biodata Uploader

## Quick Deploy Checklist

### 1. Database Setup

- [ ] Create MySQL database
- [ ] Run `database_setup.sql` script
- [ ] Verify all tables are created
- [ ] Test database connection

### 2. Environment Configuration

- [ ] Copy `.env.example` to `.env.local`
- [ ] Update database credentials
- [ ] Set strong JWT secret
- [ ] Configure file upload limits

### 3. Application Setup

- [ ] Install dependencies: `npm install`
- [ ] Test development: `npm run dev`
- [ ] Build production: `npm run build`
- [ ] Start production: `npm start`

### 4. Initial Data

- [ ] Login with default admin (admin@bioUploader.com / admin123)
- [ ] Create additional staff users
- [ ] Test with sample CSV files

## Production Deployment Options

### Option 1: Full Next.js Deployment (Small Scale)

```bash
# Build and deploy to single server
npm run build
npm start
```

**Limitations**: Serverless timeout issues with large files

### Option 2: Split Architecture (Recommended)

- **Frontend**: Deploy to Vercel/Netlify
- **Backend**: Deploy to Railway/Render/DigitalOcean
- **Database**: Managed MySQL (PlanetScale/AWS RDS)

```bash
# Frontend deployment
npm run build
vercel --prod

# Backend deployment (separate Node.js server)
# Host API routes on long-running server
```

### Option 3: Container Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL_LIVE=mysql://user:pass@prod-host:3306/db
JWT_SECRET=super-strong-secret-for-production
BATCH_SIZE=1000
MAX_FILE_SIZE_BYTES=209715200
```

## Default Credentials

**Admin User**:

- Email: admin@bioUploader.com
- Password: admin123

**Staff User**:

- Email: staff@bioUploader.com
- Password: admin123

⚠️ **Change these passwords immediately in production!**

## Testing the Application

1. **Start the application**

   ```bash
   npm run dev
   ```

2. **Access at**: http://localhost:3000

3. **Login** with default credentials

4. **Test CSV upload** using files in `/examples/` folder

5. **Features to test**:
   - [ ] User authentication
   - [ ] CSV file validation (dry-run)
   - [ ] Real-time progress updates
   - [ ] Error handling and failed records download
   - [ ] Batch processing with different sizes
   - [ ] Job cancellation

## Post-Deployment Tasks

### Security Hardening

- [ ] Change default passwords
- [ ] Configure HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure log monitoring
- [ ] Set file upload limits
- [ ] Enable CORS protection

### Performance Optimization

- [ ] Tune batch sizes based on server capacity
- [ ] Set up database indexing
- [ ] Configure connection pooling
- [ ] Monitor memory usage during large uploads
- [ ] Set up CDN for static assets

### Monitoring & Maintenance

- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Database backup schedule
- [ ] Log rotation setup
- [ ] Performance monitoring

## Troubleshooting Common Issues

### Database Connection Failed

```bash
# Check database credentials
# Verify database server is running
# Test connection with MySQL client
mysql -h hostname -u username -p database_name
```

### Upload Failures

- Check file size limits
- Verify CSV format matches requirements
- Check database lookup data exists
- Monitor server memory during processing

### Authentication Issues

- Verify JWT secret is set
- Check user exists and is active
- Clear browser localStorage if needed

### Performance Issues

- Reduce batch size for limited memory
- Increase database connection limits
- Monitor server resources during upload

## Support Contacts

- **Technical Issues**: Contact development team
- **Database Issues**: Contact database administrator
- **User Access**: Contact system administrator

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Status**: Production Ready ✅
