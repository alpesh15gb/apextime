ApexTime Attendance System - Development Prompt
Project Overview
Build a comprehensive attendance management system called "ApexTime" that pulls punch logs from a Windows SQL Server 2008 R2 database and provides modern web-based attendance tracking and reporting capabilities.
Database Configuration
Source Database (On-Premise SQL Server)

Server: 115.98.2.20
Database: etimetracklite1
Username: essl
Password: Keystone@456
Version: SQL Server 2008 R2

Key Database Tables
Master Data Tables:

Employees - Employee master data (names, codes, etc.)
Departments - Department list
Designations - Job designations
Companies - Company details
Categories - Employee categories (Staff, Worker, etc.)
EmployeeDepartments - Employee-department mapping
EmployeesBio - Biometric information

Attendance & Logging Tables:

DeviceLogs - Master table for raw punch data
DeviceLogs_M_YYYY - Monthly partitioned logs (e.g., DeviceLogs_1_2026, DeviceLogs_12_2025)
AttendanceLogs - Processed attendance records
PunchTimeDetails - Detailed punch breakdown

Device Management:

Devices - Biometric device list
DeviceUsers - Device user ID to employee ID mapping
DevicesStatus - Device connectivity status
DeviceCommands - Queued device commands

Shift & Leave Management:

Shifts - Shift definitions (start/end times, grace periods)
EmployeeShift - Employee shift assignments
Holidays - Holiday calendar
LeaveEntries - Leave records
LeaveTypes - Leave type definitions

Hosting Infrastructure
Application Server (Hostinger VPS)

IP: 82.112.236.81
Technology Stack: Docker + Nginx
Database Server: 115.98.2.20 (on-premise)

Core Features Required
1. Authentication

Login page with ApexTime logo
Default credentials:

Username: admin
Password: admin



2. Master Data Management

Locations - Manage geographic locations
Branches - Manage company branches
Departments - Department management
Shifts - Shift configuration and assignment

3. Attendance Processing

Automated Log Collection Service

Runs every 15 minutes
Pulls data from DeviceLogs and monthly partition tables (DeviceLogs_M_YYYY)
Processes raw punches into attendance records


Smart Attendance Logic

Automatically identify First IN punch of the day
Automatically identify Last OUT punch of the day
Handle multiple punches throughout the day
Calculate working hours based on first IN and last OUT



4. Reporting Module
Generate comprehensive reports with the following options:
Report Types:

Daily Attendance Report
Weekly Attendance Report
Monthly Attendance Report

Export Formats:

PDF export
XLSX (Excel) export

Report Contents:

Employee name and code
Department/Branch
Date
First IN time
Last OUT time
Total working hours
Shift information
Late arrival indicators
Early departure indicators
Absent/Present status

Technical Requirements
Backend

RESTful API architecture
Database connection pool for SQL Server
Background service/cron job for 15-minute log sync
Business logic for attendance calculation:

First punch of the day = IN time
Last punch of the day = OUT time
Calculate duration between first IN and last OUT
Apply shift rules and grace periods
Handle overnight shifts



Frontend

Modern, responsive web interface
Login page with ApexTime branding
Dashboard with key metrics
Master data management screens
Report generation interface with date range selection
Export buttons for PDF and Excel

Data Sync Service

Frequency: Every 15 minutes
Source: Query DeviceLogs and DeviceLogs_M_YYYY tables
Process:

Fetch new logs since last sync
Map device user IDs to employee IDs using DeviceUsers table
Group punches by employee and date
Identify first IN and last OUT
Store processed attendance in application database
Handle errors and log sync status



Deployment

Dockerized application
Nginx reverse proxy configuration
Environment variables for database credentials
SSL/TLS configuration for secure access
Automated deployment pipeline

Smart Attendance Logic Details
First IN / Last OUT Algorithm
For each employee on a given date:
1. Retrieve all punch logs ordered by timestamp
2. First record = IN time (arrival)
3. Last record = OUT time (departure)
4. Calculate: Working Hours = OUT time - IN time
5. Compare with assigned shift:
   - Late arrival if IN > Shift Start + Grace Period
   - Early departure if OUT < Shift End - Grace Period
6. Handle special cases:
   - Missing OUT punch (assume end of shift)
   - Missing IN punch (mark as absent or irregular)
   - Punches spanning midnight (overnight shifts)
Security Considerations

Secure database connection (encrypted connection string)
SQL injection prevention
Authentication token management
Role-based access control (future enhancement)
Audit trail for data changes

Deliverables

Dockerized web application
Nginx configuration files
Database migration scripts
Automated log sync service
User documentation
API documentation
Deployment guide

Success Criteria

Successfully connect to on-premise SQL Server database
Sync logs every 15 minutes without errors
Accurately calculate first IN and last OUT times
Generate reports in PDF and XLSX formats
Secure login with ApexTime branding
Responsive UI accessible from desktop and mobile devices


Technology Recommendations:

Backend: Node.js (Express) or Python (FastAPI/Django) or .NET Core
Frontend: React, Vue, or Angular
Database Driver: mssql (Node.js), pyodbc/pymssql (Python), or Entity Framework (.NET)
Report Generation: jsPDF + ExcelJS (Node.js) or ReportLab + openpyxl (Python)
Containerization: Docker + Docker Compose
Scheduler: node-cron, APScheduler, or Windows Task Scheduler wrapper