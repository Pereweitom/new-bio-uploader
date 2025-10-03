import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { withAuth } from '@/lib/auth';
import { CsvStudentRecord } from '@/lib/types';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get('csvFile') as File;
    const previewRows = parseInt(formData.get('previewRows') as string) || 10;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE_BYTES || '209715200');
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed size' },
        { status: 400 }
      );
    }

    // Parse CSV content
    const text = await file.text();
    const parseResult = Papa.parse<CsvStudentRecord>(text, {
      header: true,
      skipEmptyLines: true,
      preview: previewRows + 1 // +1 to check if there are more rows
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json({
        error: 'CSV parsing errors',
        details: parseResult.errors.map(err => ({
          row: err.row,
          type: err.type,
          message: err.message
        }))
      }, { status: 400 });
    }

    // Validate required headers
    const requiredFields = [
      'Matric Number', 'Last Name', 'First Name', 'Gender', 
      'DoB', 'Year Of Entry', 'Department'
    ];
    
    const headers = parseResult.meta.fields || [];
    const missingFields = requiredFields.filter(field => 
      !headers.some(header => header.toLowerCase() === field.toLowerCase())
    );

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required CSV headers',
        missingFields
      }, { status: 400 });
    }

    // Basic validation on preview rows
    const validationResults = parseResult.data.slice(0, previewRows).map((row, index) => {
      const errors: string[] = [];
      
      // Check required fields
      requiredFields.forEach(field => {
        const value = (row as any)[field];
        if (!value || !value.toString().trim()) {
          errors.push(`Missing ${field}`);
        }
      });

      // Validate gender
      const gender = row['Gender']?.toLowerCase().trim();
      if (gender && !['m', 'male', 'f', 'female'].includes(gender)) {
        errors.push('Invalid gender format');
      }

      // Validate email format if provided
      const email = row['Email'];
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format');
      }

      return {
        rowNumber: index + 1,
        data: row,
        errors,
        isValid: errors.length === 0
      };
    });

    // Count total rows in file
    const fullParseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true
    });
    
    const totalRows = fullParseResult.data.length;
    const validRows = validationResults.filter(r => r.isValid).length;
    const invalidRows = validationResults.filter(r => !r.isValid).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalRows,
        previewRows: validationResults.length,
        validPreviewRows: validRows,
        invalidPreviewRows: invalidRows,
        hasMoreRows: totalRows > previewRows
      },
      headers,
      missingFields,
      preview: validationResults,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    console.error('Dry run API error:', error);
    return NextResponse.json(
      { error: 'Failed to process dry run' },
      { status: 500 }
    );
  }
});