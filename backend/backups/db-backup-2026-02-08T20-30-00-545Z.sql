--
-- PostgreSQL database dump
--

\restrict USejlY3RnoTGG10DoGh9SKgzbsrGiKYC8WposRCKQQQ9F2mELVLsdPb0zTKBm7w

-- Dumped from database version 15.15 (Debian 15.15-0+deb12u1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AcademicSession; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."AcademicSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isCurrent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AcademicSession" OWNER TO apextime;

--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'GENERAL'::text NOT NULL,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Announcement" OWNER TO apextime;

--
-- Name: Appraisal; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Appraisal" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    rating double precision,
    "managerComment" text,
    "employeeComment" text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Appraisal" OWNER TO apextime;

--
-- Name: Asset; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Asset" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "categoryId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "serialNumber" text,
    brand text,
    model text,
    "purchaseDate" timestamp(3) without time zone,
    "purchaseCost" double precision,
    currency text DEFAULT 'INR'::text NOT NULL,
    "vendorName" text,
    "warrantyExpiry" timestamp(3) without time zone,
    status text DEFAULT 'AVAILABLE'::text NOT NULL,
    condition text DEFAULT 'GOOD'::text NOT NULL,
    "parentAssetId" text,
    "vendorId" text,
    "qrCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Asset" OWNER TO apextime;

--
-- Name: AssetAssignment; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."AssetAssignment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "assetId" text NOT NULL,
    "employeeId" text NOT NULL,
    "assignedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "returnDate" timestamp(3) without time zone,
    "expectedReturnDate" timestamp(3) without time zone,
    remarks text,
    "returnCondition" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AssetAssignment" OWNER TO apextime;

--
-- Name: AssetCategory; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."AssetCategory" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AssetCategory" OWNER TO apextime;

--
-- Name: AssetRequest; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."AssetRequest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "assetCategoryId" text NOT NULL,
    description text,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AssetRequest" OWNER TO apextime;

--
-- Name: AttendanceLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."AttendanceLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    date date NOT NULL,
    "firstIn" timestamp(3) without time zone,
    "lastOut" timestamp(3) without time zone,
    "totalHours" double precision DEFAULT 0 NOT NULL,
    "workingHours" double precision DEFAULT 0 NOT NULL,
    "lateArrival" double precision DEFAULT 0 NOT NULL,
    "earlyDeparture" double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'Absent'::text NOT NULL,
    logs text,
    "totalPunches" integer DEFAULT 0 NOT NULL,
    "shiftStart" timestamp(3) without time zone,
    "shiftEnd" timestamp(3) without time zone,
    "rawData" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AttendanceLog" OWNER TO apextime;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    action text NOT NULL,
    module text NOT NULL,
    "userId" text,
    details text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO apextime;

--
-- Name: Batch; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Batch" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "courseId" text NOT NULL,
    "sessionId" text NOT NULL,
    name text NOT NULL,
    "maxStrength" integer,
    "inchargeId" text,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Batch" OWNER TO apextime;

--
-- Name: Branch; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Branch" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "locationId" text
);


ALTER TABLE public."Branch" OWNER TO apextime;

--
-- Name: CTCStructure; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."CTCStructure" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "basicSalary" double precision NOT NULL,
    hra double precision NOT NULL,
    "specialAllowance" double precision DEFAULT 0 NOT NULL,
    conveyance double precision DEFAULT 0 NOT NULL,
    medical double precision DEFAULT 0 NOT NULL,
    lta double precision DEFAULT 0 NOT NULL,
    "otherAllowances" double precision DEFAULT 0 NOT NULL,
    "employerPF" double precision DEFAULT 0 NOT NULL,
    "employerESI" double precision DEFAULT 0 NOT NULL,
    gratuity double precision DEFAULT 0 NOT NULL,
    "totalMonthlyGross" double precision NOT NULL,
    "totalAnnualCTC" double precision NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CTCStructure" OWNER TO apextime;

--
-- Name: Candidate; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Candidate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "jobId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "resumeUrl" text,
    status text DEFAULT 'NEW'::text NOT NULL,
    source text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Candidate" OWNER TO apextime;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Category" OWNER TO apextime;

--
-- Name: CompanyProfile; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."CompanyProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "legalName" text,
    logo text,
    address text,
    city text,
    state text,
    country text,
    pincode text,
    phone text,
    email text,
    website text,
    "taxId" text,
    "registrationId" text,
    gstin text,
    pan text,
    "pfCode" text,
    "esiCode" text,
    tan text,
    "bankName" text,
    "accountNumber" text,
    "ifscCode" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CompanyProfile" OWNER TO apextime;

--
-- Name: Course; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Course" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    duration integer,
    type text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Course" OWNER TO apextime;

--
-- Name: Department; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "branchId" text,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Department" OWNER TO apextime;

--
-- Name: Designation; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Designation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Designation" OWNER TO apextime;

--
-- Name: Device; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Device" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    protocol text DEFAULT 'ESSL_ADMS'::text NOT NULL,
    "ipAddress" text,
    port integer,
    "deviceId" text NOT NULL,
    username text,
    password text,
    location text,
    status text DEFAULT 'offline'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastSeen" timestamp(3) without time zone,
    config text
);


ALTER TABLE public."Device" OWNER TO apextime;

--
-- Name: DeviceCommand; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."DeviceCommand" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "deviceId" text NOT NULL,
    "commandType" text NOT NULL,
    payload text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    response text,
    result text,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."DeviceCommand" OWNER TO apextime;

--
-- Name: DeviceLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."DeviceLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "deviceId" text,
    "employeeId" text,
    "deviceUserId" text NOT NULL,
    "punchTime" timestamp(3) without time zone NOT NULL,
    "punchType" text NOT NULL,
    source text DEFAULT 'DEVICE'::text NOT NULL,
    "verifyMode" integer,
    "rawData" text,
    processed boolean DEFAULT false NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DeviceLog" OWNER TO apextime;

--
-- Name: Employee; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Employee" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeCode" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text,
    email text,
    phone text,
    gender text,
    "dateOfBirth" timestamp(3) without time zone,
    address text,
    city text,
    state text,
    pincode text,
    "branchId" text,
    "departmentId" text,
    "designationId" text,
    "locationId" text,
    "reportToId" text,
    "managerOfDeptId" text,
    "deviceUserId" text,
    "sourceEmployeeId" text,
    "dateOfJoining" timestamp(3) without time zone,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "bankName" text,
    "categoryId" text,
    "shiftId" text,
    "basicSalary" double precision DEFAULT 0 NOT NULL,
    hra double precision DEFAULT 0 NOT NULL,
    "otherAllowances" double precision DEFAULT 0 NOT NULL,
    "monthlyCtc" double precision DEFAULT 0 NOT NULL,
    "retentionAmount" double precision DEFAULT 0 NOT NULL,
    "standardDeductions" double precision DEFAULT 0 NOT NULL,
    "isOTEnabled" boolean DEFAULT true NOT NULL,
    "otRateMultiplier" double precision DEFAULT 1.0 NOT NULL,
    "isPFEnabled" boolean DEFAULT true NOT NULL,
    "isESIEnabled" boolean DEFAULT true NOT NULL,
    "isPTEnabled" boolean DEFAULT true NOT NULL,
    "accountNumber" text,
    "ifscCode" text,
    "panNumber" text,
    "aadhaarNumber" text,
    "cardNumber" text
);


ALTER TABLE public."Employee" OWNER TO apextime;

--
-- Name: EmployeeDocument; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."EmployeeDocument" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    "mimeType" text,
    size integer,
    "uploadedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmployeeDocument" OWNER TO apextime;

--
-- Name: EmployeeSalaryComponent; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."EmployeeSalaryComponent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "componentId" text NOT NULL,
    "monthlyAmount" double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    formula text
);


ALTER TABLE public."EmployeeSalaryComponent" OWNER TO apextime;

--
-- Name: EmployeeShift; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."EmployeeShift" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "shiftId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isDefault" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmployeeShift" OWNER TO apextime;

--
-- Name: ExamMark; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."ExamMark" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "studentId" text NOT NULL,
    "subjectId" text NOT NULL,
    "examName" text NOT NULL,
    "marksObtained" double precision NOT NULL,
    "totalMarks" double precision NOT NULL,
    grade text,
    date timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ExamMark" OWNER TO apextime;

--
-- Name: FeeHead; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."FeeHead" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'RECURRING'::text NOT NULL,
    frequency text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FeeHead" OWNER TO apextime;

--
-- Name: FeeRecord; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."FeeRecord" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "studentId" text NOT NULL,
    "structureId" text,
    title text NOT NULL,
    amount double precision NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paidDate" timestamp(3) without time zone,
    "paymentMode" text,
    "transactionId" text,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FeeRecord" OWNER TO apextime;

--
-- Name: FeeStructure; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."FeeStructure" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "courseId" text,
    "headId" text NOT NULL,
    amount double precision NOT NULL,
    "dueDateOffset" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FeeStructure" OWNER TO apextime;

--
-- Name: Feedback; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Feedback" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "fromEmployeeId" text NOT NULL,
    "toEmployeeId" text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'GENERAL'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Feedback" OWNER TO apextime;

--
-- Name: FieldLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."FieldLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "projectId" text,
    type text DEFAULT 'IN'::text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    location text,
    image text,
    remarks text,
    status text DEFAULT 'pending'::text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FieldLog" OWNER TO apextime;

--
-- Name: Goal; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Goal" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    title text NOT NULL,
    description text,
    category text DEFAULT 'INDIVIDUAL'::text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ON_TRACK'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Goal" OWNER TO apextime;

--
-- Name: Guardian; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Guardian" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    relation text NOT NULL,
    "desc" text,
    email text,
    phone text NOT NULL,
    "altPhone" text,
    address text,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Guardian" OWNER TO apextime;

--
-- Name: HikvisionLogs; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."HikvisionLogs" (
    id text NOT NULL,
    person_id text,
    access_datetime text,
    access_date text,
    access_time text,
    auth_result text,
    device_name text,
    serial_no text,
    person_name text,
    emp_dept text,
    card_no text,
    direction text,
    mask_status text,
    is_processed boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HikvisionLogs" OWNER TO apextime;

--
-- Name: Holiday; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Holiday" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    date date NOT NULL,
    type text DEFAULT 'Public'::text NOT NULL,
    description text,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Holiday" OWNER TO apextime;

--
-- Name: JobOpening; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."JobOpening" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    department text,
    location text,
    type text NOT NULL,
    experience text,
    "salaryRange" text,
    description text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JobOpening" OWNER TO apextime;

--
-- Name: LeaveBalance; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."LeaveBalance" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    code text NOT NULL,
    description text,
    "employeeId" text NOT NULL,
    year integer NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    used double precision DEFAULT 0 NOT NULL,
    balance double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public."LeaveBalance" OWNER TO apextime;

--
-- Name: LeaveBalanceTransaction; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."LeaveBalanceTransaction" (
    id text NOT NULL,
    "leaveBalanceId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    type text NOT NULL,
    amount double precision NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LeaveBalanceTransaction" OWNER TO apextime;

--
-- Name: LeaveEntry; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."LeaveEntry" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "leaveTypeId" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    days integer DEFAULT 1 NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    "managerApproval" boolean DEFAULT false NOT NULL,
    "managerApprovedAt" timestamp(3) without time zone,
    "managerId" text,
    "ceoApproval" boolean DEFAULT false NOT NULL,
    "ceoApprovedAt" timestamp(3) without time zone,
    "ceoId" text,
    "rejectionReason" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LeaveEntry" OWNER TO apextime;

--
-- Name: LeaveType; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."LeaveType" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "isPaid" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LeaveType" OWNER TO apextime;

--
-- Name: LibraryBook; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."LibraryBook" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    author text,
    isbn text,
    category text,
    quantity integer DEFAULT 1 NOT NULL,
    available integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LibraryBook" OWNER TO apextime;

--
-- Name: Loan; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Loan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    amount double precision NOT NULL,
    "interestRate" double precision DEFAULT 0 NOT NULL,
    "tenureMonths" integer NOT NULL,
    "monthlyDeduction" double precision NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "repaidAmount" double precision DEFAULT 0 NOT NULL,
    "balanceAmount" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Loan" OWNER TO apextime;

--
-- Name: LoanDeduction; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."LoanDeduction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "loanId" text NOT NULL,
    "payrollId" text NOT NULL,
    amount double precision NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoanDeduction" OWNER TO apextime;

--
-- Name: Location; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Location" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    address text,
    city text,
    state text,
    country text,
    "zipCode" text,
    latitude double precision,
    longitude double precision,
    radius integer DEFAULT 100 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Location" OWNER TO apextime;

--
-- Name: MaintenanceLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."MaintenanceLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "assetId" text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    cost double precision DEFAULT 0 NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "performedBy" text,
    status text DEFAULT 'COMPLETED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MaintenanceLog" OWNER TO apextime;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    link text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO apextime;

--
-- Name: OnboardingTask; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."OnboardingTask" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    title text NOT NULL,
    description text,
    category text DEFAULT 'GENERAL'::text NOT NULL,
    "dueDate" timestamp(3) without time zone,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OnboardingTask" OWNER TO apextime;

--
-- Name: Payroll; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Payroll" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    "totalWorkingDays" integer DEFAULT 0 NOT NULL,
    "actualPresentDays" double precision DEFAULT 0 NOT NULL,
    "lopDays" double precision DEFAULT 0 NOT NULL,
    "paidDays" double precision DEFAULT 0 NOT NULL,
    "grossSalary" double precision DEFAULT 0 NOT NULL,
    "basicPaid" double precision DEFAULT 0 NOT NULL,
    "hraPaid" double precision DEFAULT 0 NOT NULL,
    "allowancesPaid" double precision DEFAULT 0 NOT NULL,
    "otHours" double precision DEFAULT 0 NOT NULL,
    "otPay" double precision DEFAULT 0 NOT NULL,
    bonus double precision DEFAULT 0 NOT NULL,
    incentives double precision DEFAULT 0 NOT NULL,
    "leaveEncashment" double precision DEFAULT 0 NOT NULL,
    reimbursements double precision DEFAULT 0 NOT NULL,
    arrears double precision DEFAULT 0 NOT NULL,
    "totalDeductions" double precision DEFAULT 0 NOT NULL,
    "pfDeduction" double precision DEFAULT 0 NOT NULL,
    "esiDeduction" double precision DEFAULT 0 NOT NULL,
    "ptDeduction" double precision DEFAULT 0 NOT NULL,
    "tdsDeduction" double precision DEFAULT 0 NOT NULL,
    "loanDeduction" double precision DEFAULT 0 NOT NULL,
    "advanceDeduction" double precision DEFAULT 0 NOT NULL,
    "otherDeductions" double precision DEFAULT 0 NOT NULL,
    "employerPF" double precision DEFAULT 0 NOT NULL,
    "employerESI" double precision DEFAULT 0 NOT NULL,
    "gratuityAccrual" double precision DEFAULT 0 NOT NULL,
    "netSalary" double precision DEFAULT 0 NOT NULL,
    details text,
    "retentionDeduction" double precision DEFAULT 0 NOT NULL,
    "finalTakeHome" double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'generated'::text NOT NULL,
    "isHold" boolean DEFAULT false NOT NULL,
    "holdReason" text,
    "stateCode" text,
    "payrollRunId" text,
    "processedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payroll" OWNER TO apextime;

--
-- Name: PayrollRun; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."PayrollRun" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    "periodStart" timestamp(3) without time zone,
    "periodEnd" timestamp(3) without time zone,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "processedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "totalNet" double precision DEFAULT 0 NOT NULL,
    "totalEmployees" integer DEFAULT 0 NOT NULL,
    "totalGross" double precision DEFAULT 0 NOT NULL,
    "batchName" text,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PayrollRun" OWNER TO apextime;

--
-- Name: PayrollSetting; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."PayrollSetting" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PayrollSetting" OWNER TO apextime;

--
-- Name: Payslip; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Payslip" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "payrollRunId" text NOT NULL,
    "employeeId" text NOT NULL,
    "grossSalary" double precision NOT NULL,
    "totalDeductions" double precision NOT NULL,
    "netSalary" double precision NOT NULL,
    details text NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Payslip" OWNER TO apextime;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "clientName" text,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    latitude double precision,
    longitude double precision,
    radius integer DEFAULT 200 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO apextime;

--
-- Name: RawDeviceLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."RawDeviceLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "deviceId" text NOT NULL,
    "deviceUserId" text NOT NULL,
    "userId" text,
    "userName" text,
    "timestamp" timestamp(3) without time zone NOT NULL,
    "punchTime" timestamp(3) without time zone,
    "punchType" text,
    "isProcessed" boolean DEFAULT false NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RawDeviceLog" OWNER TO apextime;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO apextime;

--
-- Name: ReimbursementEntry; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."ReimbursementEntry" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "payrollId" text,
    type text NOT NULL,
    amount double precision NOT NULL,
    "billDate" timestamp(3) without time zone NOT NULL,
    "billNumber" text,
    description text,
    attachment text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ReimbursementEntry" OWNER TO apextime;

--
-- Name: SalaryComponent; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."SalaryComponent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    "calculationType" text NOT NULL,
    value double precision,
    formula text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isEPFApplicable" boolean DEFAULT false NOT NULL,
    "isESIApplicable" boolean DEFAULT false NOT NULL,
    "isVariable" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."SalaryComponent" OWNER TO apextime;

--
-- Name: SalaryRevision; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."SalaryRevision" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "oldCTC" double precision NOT NULL,
    "newCTC" double precision NOT NULL,
    "oldBasic" double precision NOT NULL,
    "newBasic" double precision NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    reason text,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SalaryRevision" OWNER TO apextime;

--
-- Name: Shift; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Shift" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    "startTime" time without time zone NOT NULL,
    "endTime" time without time zone NOT NULL,
    "breakDuration" integer DEFAULT 60 NOT NULL,
    "gracePeriodIn" integer DEFAULT 0 NOT NULL,
    "gracePeriodOut" integer DEFAULT 0 NOT NULL,
    "isNightShift" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Shift" OWNER TO apextime;

--
-- Name: Student; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Student" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "sessionId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "admissionNo" text NOT NULL,
    "rollNo" text,
    email text,
    phone text,
    gender text,
    dob timestamp(3) without time zone,
    "bloodGroup" text,
    "biometricId" text,
    "batchId" text NOT NULL,
    "guardianId" text,
    "dateOfAdmission" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    address text,
    city text,
    state text,
    "zipCode" text,
    photo text,
    "transportRouteId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Student" OWNER TO apextime;

--
-- Name: StudentAttendance; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."StudentAttendance" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "studentId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StudentAttendance" OWNER TO apextime;

--
-- Name: StudentDocument; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."StudentDocument" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    url text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StudentDocument" OWNER TO apextime;

--
-- Name: StudentFieldLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."StudentFieldLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "studentId" text NOT NULL,
    type text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    location text,
    image text,
    remarks text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "routeId" text,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StudentFieldLog" OWNER TO apextime;

--
-- Name: Subject; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Subject" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "courseId" text,
    name text NOT NULL,
    code text,
    type text DEFAULT 'THEORY'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Subject" OWNER TO apextime;

--
-- Name: SyncLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."SyncLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    status text NOT NULL,
    message text,
    "recordCount" integer DEFAULT 0 NOT NULL,
    "lastSyncTime" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SyncLog" OWNER TO apextime;

--
-- Name: TDSDeclaration; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."TDSDeclaration" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    "financialYear" text NOT NULL,
    ppf double precision DEFAULT 0 NOT NULL,
    elss double precision DEFAULT 0 NOT NULL,
    "lifeInsurance" double precision DEFAULT 0 NOT NULL,
    "homeLoanPrincipal" double precision DEFAULT 0 NOT NULL,
    "tuitionFees" double precision DEFAULT 0 NOT NULL,
    nsc double precision DEFAULT 0 NOT NULL,
    "section80D" double precision DEFAULT 0 NOT NULL,
    "section80E" double precision DEFAULT 0 NOT NULL,
    "section80G" double precision DEFAULT 0 NOT NULL,
    section24 double precision DEFAULT 0 NOT NULL,
    "rentPaid" double precision DEFAULT 0 NOT NULL,
    "landlordPAN" text,
    "taxRegime" text DEFAULT 'OLD'::text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TDSDeclaration" OWNER TO apextime;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    code text NOT NULL,
    domain text,
    type text DEFAULT 'CORPORATE'::text NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    modules text[] DEFAULT ARRAY['attendance'::text, 'leaves'::text, 'employees'::text],
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    settings jsonb
);


ALTER TABLE public."Tenant" OWNER TO apextime;

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "employeeId" text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'HR'::text NOT NULL,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "assignedTo" text,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO apextime;

--
-- Name: TimetableEntry; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."TimetableEntry" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "batchId" text NOT NULL,
    "subjectId" text NOT NULL,
    "teacherId" text,
    "dayOfWeek" integer NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TimetableEntry" OWNER TO apextime;

--
-- Name: TrainingCourse; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."TrainingCourse" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    duration text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TrainingCourse" OWNER TO apextime;

--
-- Name: TrainingSession; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."TrainingSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "courseId" text NOT NULL,
    "trainerName" text,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    location text,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TrainingSession" OWNER TO apextime;

--
-- Name: TransportRoute; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."TransportRoute" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "vehicleNo" text,
    "driverName" text,
    "driverPhone" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TransportRoute" OWNER TO apextime;

--
-- Name: User; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    username text NOT NULL,
    email text,
    password text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "employeeId" text
);


ALTER TABLE public."User" OWNER TO apextime;

--
-- Name: Vendor; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."Vendor" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "contactPerson" text,
    email text,
    phone text,
    address text,
    "taxId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Vendor" OWNER TO apextime;

--
-- Name: VisitorLog; Type: TABLE; Schema: public; Owner: apextime
--

CREATE TABLE public."VisitorLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "fullName" text NOT NULL,
    phone text,
    email text,
    company text,
    purpose text NOT NULL,
    "hostId" text,
    "checkIn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "checkOut" timestamp(3) without time zone,
    "idProofType" text,
    "idProofNumber" text,
    status text DEFAULT 'IN'::text NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VisitorLog" OWNER TO apextime;

--
-- Data for Name: AcademicSession; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."AcademicSession" (id, "tenantId", name, code, "startDate", "endDate", "isCurrent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Announcement" (id, "tenantId", title, content, category, priority, "expiresAt", "publishedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Appraisal; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Appraisal" (id, "tenantId", "employeeId", "periodStart", "periodEnd", rating, "managerComment", "employeeComment", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Asset; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Asset" (id, "tenantId", "categoryId", name, code, description, "serialNumber", brand, model, "purchaseDate", "purchaseCost", currency, "vendorName", "warrantyExpiry", status, condition, "parentAssetId", "vendorId", "qrCode", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AssetAssignment; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."AssetAssignment" (id, "tenantId", "assetId", "employeeId", "assignedDate", "returnDate", "expectedReturnDate", remarks, "returnCondition", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AssetCategory; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."AssetCategory" (id, "tenantId", name, description, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AssetRequest; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."AssetRequest" (id, "tenantId", "employeeId", "assetCategoryId", description, priority, status, "approvedBy", "approvedAt", "rejectionReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AttendanceLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."AttendanceLog" (id, "tenantId", "employeeId", date, "firstIn", "lastOut", "totalHours", "workingHours", "lateArrival", "earlyDeparture", status, logs, "totalPunches", "shiftStart", "shiftEnd", "rawData", "createdAt", "updatedAt") FROM stdin;
2a619e03-d7ad-49df-a8aa-b8069cd347bd	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-02-09	2026-02-09 04:37:00	2026-02-09 13:14:00	8.62	8.62	0	0	Present	["2026-02-09T04:37:00.000Z","2026-02-09T13:14:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.75	2026-02-08 20:27:59.914
19f2cb4d-aa49-4db7-a5a7-38a6f7ffca3d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-02-09	2026-02-09 03:50:00	2026-02-09 13:06:00	9.27	9.27	0	0	Present	["2026-02-09T03:50:00.000Z","2026-02-09T13:06:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.751	2026-02-08 20:27:59.915
0428b26d-346c-445c-96ad-3b76878a8384	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-02-09	2026-02-09 04:42:00	2026-02-09 12:07:00	7.42	7.42	0	0	Present	["2026-02-09T04:42:00.000Z","2026-02-09T07:46:00.000Z","2026-02-09T08:40:00.000Z","2026-02-09T12:07:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.753	2026-02-08 20:27:59.916
cfd4a06c-a9ef-4506-8066-795ffc579f31	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-02-07	2026-02-07 03:51:00	2026-02-07 12:48:00	8.95	8.95	0	0	Present	["2026-02-07T03:51:00.000Z","2026-02-07T12:48:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.754	2026-02-08 20:27:59.918
21d0040b-1630-4c6c-ac0d-6cc77ff93a46	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-02-07	2026-02-07 04:44:00	2026-02-07 14:09:00	9.42	9.42	0	0	Present	["2026-02-07T04:44:00.000Z","2026-02-07T07:37:00.000Z","2026-02-07T08:32:00.000Z","2026-02-07T14:09:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.755	2026-02-08 20:27:59.919
d6a5129a-5c2b-449e-8d0f-f2f4e6b0b076	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-02-07	2026-02-07 03:47:00	2026-02-07 11:31:00	7.73	7.73	0	0	Present	["2026-02-07T03:47:00.000Z","2026-02-07T07:40:00.000Z","2026-02-07T08:38:00.000Z","2026-02-07T11:31:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.757	2026-02-08 20:27:59.92
142245fd-e7cc-44c3-9c23-c51fc715414f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-02-07	2026-02-07 03:33:00	2026-02-07 12:58:00	9.42	9.42	0	0	Present	["2026-02-07T03:33:00.000Z","2026-02-07T07:39:00.000Z","2026-02-07T08:35:00.000Z","2026-02-07T12:58:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.759	2026-02-08 20:27:59.921
bb309a3c-a4bf-46f2-ae36-1b502d6996e9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-02-07	2026-02-07 03:52:00	2026-02-07 11:50:00	7.97	7.97	0	0	Present	["2026-02-07T03:52:00.000Z","2026-02-07T07:45:00.000Z","2026-02-07T08:35:00.000Z","2026-02-07T11:50:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.76	2026-02-08 20:27:59.923
a255d494-0143-4c4d-bdcb-d1ce823d4d24	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-02-07	2026-02-07 04:33:00	2026-02-07 11:35:00	7.03	7.03	0	0	Present	["2026-02-07T04:33:00.000Z","2026-02-07T11:35:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.761	2026-02-08 20:27:59.924
1eb1cffa-52c1-412b-a517-90436e9a9ec8	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-02-07	2026-02-07 04:41:00	2026-02-07 12:23:00	7.7	7.7	0	0	Present	["2026-02-07T04:41:00.000Z","2026-02-07T07:38:00.000Z","2026-02-07T08:40:00.000Z","2026-02-07T12:23:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.762	2026-02-08 20:27:59.925
8ff717f8-6eea-4a8d-a9b2-0ffca9036e6f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-02-06	2026-02-06 03:48:00	2026-02-06 11:50:00	8.03	8.03	0	0	Present	["2026-02-06T03:48:00.000Z","2026-02-06T07:48:00.000Z","2026-02-06T08:52:00.000Z","2026-02-06T11:50:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.764	2026-02-08 20:27:59.926
81b3270a-1dec-46e7-b7e2-9b97f93cac88	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-02-06	2026-02-06 04:58:00	2026-02-06 13:51:00	8.88	8.88	0	0	Present	["2026-02-06T04:58:00.000Z","2026-02-06T13:51:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.765	2026-02-08 20:27:59.927
ba20ba34-c501-4412-a38f-b9e188199cf5	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-02-06	2026-02-06 04:32:00	2026-02-06 08:58:00	4.43	4.43	0	0	Present	["2026-02-06T04:32:00.000Z","2026-02-06T07:36:00.000Z","2026-02-06T08:58:00.000Z"]	3	\N	\N	\N	2026-02-08 19:18:00.767	2026-02-08 20:27:59.928
35b99ad8-f374-43ff-a95f-7ec1917e43d9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-02-06	2026-02-06 03:49:00	\N	0	0	0	0	Shift Incomplete	["2026-02-06T03:49:00.000Z"]	1	\N	\N	\N	2026-02-08 19:18:00.768	2026-02-08 20:27:59.929
f14b7eac-db27-4500-ace8-f2b81ff7a463	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-02-06	2026-02-06 04:55:00	2026-02-06 12:21:00	7.43	7.43	0	0	Present	["2026-02-06T04:55:00.000Z","2026-02-06T07:45:00.000Z","2026-02-06T08:41:00.000Z","2026-02-06T12:21:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.77	2026-02-08 20:27:59.93
dc3a6bb5-bc0a-4093-b761-44152b7fa6ff	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-02-06	2026-02-06 04:49:00	2026-02-06 12:01:00	7.2	7.2	0	0	Present	["2026-02-06T04:49:00.000Z","2026-02-06T07:41:00.000Z","2026-02-06T08:49:00.000Z","2026-02-06T12:01:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.771	2026-02-08 20:27:59.932
4e4ee596-eb2e-4657-a828-1dbd317e42a9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-02-06	2026-02-06 04:51:00	2026-02-06 13:02:00	8.18	8.18	0	0	Present	["2026-02-06T04:51:00.000Z","2026-02-06T13:02:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.772	2026-02-08 20:27:59.933
71d032cc-6335-49ee-9498-95699ba6425d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-02-05	2026-02-05 04:40:00	2026-02-05 13:20:00	8.67	8.67	0	0	Present	["2026-02-05T04:40:00.000Z","2026-02-05T07:55:00.000Z","2026-02-05T08:57:00.000Z","2026-02-05T13:20:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.773	2026-02-08 20:27:59.934
309b0407-1737-46dc-b560-a358f1ee0d50	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-02-05	2026-02-05 03:50:00	2026-02-05 14:01:00	10.18	10.18	0	0	Present	["2026-02-05T03:50:00.000Z","2026-02-05T07:31:00.000Z","2026-02-05T08:59:00.000Z","2026-02-05T14:01:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.775	2026-02-08 20:27:59.935
45f90e3a-6123-4557-bd70-a804da44126e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-02-05	2026-02-05 03:30:00	2026-02-05 13:33:00	10.05	10.05	0	0	Present	["2026-02-05T03:30:00.000Z","2026-02-05T07:48:00.000Z","2026-02-05T08:58:00.000Z","2026-02-05T13:33:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.776	2026-02-08 20:27:59.936
b664270a-24cf-4615-a9f3-e73751c6ad10	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-02-05	2026-02-05 04:51:00	2026-02-05 14:25:00	9.57	9.57	0	0	Present	["2026-02-05T04:51:00.000Z","2026-02-05T14:25:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.777	2026-02-08 20:27:59.937
dd5c34ab-828b-450d-862e-b99299c71049	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-02-09	2026-02-09 04:46:00	2026-02-09 12:47:00	8.02	8.02	0	0	Present	["2026-02-09T04:46:00.000Z","2026-02-09T12:47:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.748	2026-02-08 20:27:59.938
bc0d8375-57ae-4b9b-a0b4-c99a541211c2	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-02-09	2026-02-09 03:39:00	2026-02-09 13:34:00	9.92	9.92	0	0	Present	["2026-02-09T03:39:00.000Z","2026-02-09T07:43:00.000Z","2026-02-09T08:42:00.000Z","2026-02-09T13:34:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.749	2026-02-08 20:27:59.912
5be52129-f1bd-4e4b-9c8d-82ab4c440f03	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-02-04	2026-02-04 03:37:00	2026-02-04 11:56:00	8.32	8.32	0	0	Present	["2026-02-04T03:37:00.000Z","2026-02-04T07:30:00.000Z","2026-02-04T08:38:00.000Z","2026-02-04T11:56:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.784	2026-02-08 20:27:59.941
89f194f2-c8e3-41ca-b9c4-fa869fd473ec	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-02-04	2026-02-04 04:47:00	2026-02-04 13:43:00	8.93	8.93	0	0	Present	["2026-02-04T04:47:00.000Z","2026-02-04T07:57:00.000Z","2026-02-04T08:48:00.000Z","2026-02-04T13:43:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.785	2026-02-08 20:27:59.942
b502fc4b-3ca1-4e63-b8b9-0454972d7691	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-02-04	2026-02-04 03:49:00	2026-02-04 13:49:00	10	10	0	0	Present	["2026-02-04T03:49:00.000Z","2026-02-04T07:47:00.000Z","2026-02-04T08:32:00.000Z","2026-02-04T13:49:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.786	2026-02-08 20:27:59.943
6acfa276-b122-49bb-a0e5-af961c036615	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-02-04	2026-02-04 03:57:00	2026-02-04 13:31:00	9.57	9.57	0	0	Present	["2026-02-04T03:57:00.000Z","2026-02-04T13:31:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.788	2026-02-08 20:27:59.944
b012d438-df0e-4031-9f4a-8b714f6f63bb	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-02-04	2026-02-04 04:32:00	2026-02-04 11:50:00	7.3	7.3	0	0	Present	["2026-02-04T04:32:00.000Z","2026-02-04T07:50:00.000Z","2026-02-04T08:41:00.000Z","2026-02-04T11:50:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.789	2026-02-08 20:27:59.945
9774e640-774c-441d-8618-0c08338e7bd5	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-02-04	2026-02-04 04:43:00	2026-02-04 11:30:00	6.78	6.78	0	0	Present	["2026-02-04T04:43:00.000Z","2026-02-04T07:31:00.000Z","2026-02-04T08:50:00.000Z","2026-02-04T11:30:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.79	2026-02-08 20:27:59.946
d0c152b2-850e-41df-8a0c-c3a842f616e7	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-02-03	2026-02-03 04:49:00	2026-02-03 11:53:00	7.07	7.07	0	0	Present	["2026-02-03T04:49:00.000Z","2026-02-03T07:34:00.000Z","2026-02-03T08:52:00.000Z","2026-02-03T11:53:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.791	2026-02-08 20:27:59.947
ec74f830-95ee-4ac3-828b-804167a2493b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-02-03	2026-02-03 04:33:00	2026-02-03 12:05:00	7.53	7.53	0	0	Present	["2026-02-03T04:33:00.000Z","2026-02-03T12:05:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.792	2026-02-08 20:27:59.948
4122417f-10b9-46f2-bf75-9c77305155bb	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-02-03	2026-02-03 03:31:00	2026-02-03 11:55:00	8.4	8.4	0	0	Present	["2026-02-03T03:31:00.000Z","2026-02-03T11:55:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.794	2026-02-08 20:27:59.949
1e95e34d-298c-433d-a9a3-39eedbe368f3	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-02-03	2026-02-03 04:47:00	\N	0	0	0	0	Shift Incomplete	["2026-02-03T04:47:00.000Z"]	1	\N	\N	\N	2026-02-08 19:18:00.795	2026-02-08 20:27:59.95
7011379a-b045-497d-a2a7-a47e1f663fb9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-02-03	2026-02-03 04:33:00	2026-02-03 08:58:00	4.42	4.42	0	0	Present	["2026-02-03T04:33:00.000Z","2026-02-03T07:33:00.000Z","2026-02-03T08:58:00.000Z"]	3	\N	\N	\N	2026-02-08 19:18:00.796	2026-02-08 20:27:59.951
31ff989a-8ed0-4fda-8690-49da1305b030	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-02-03	2026-02-03 04:45:00	2026-02-03 12:36:00	7.85	7.85	0	0	Present	["2026-02-03T04:45:00.000Z","2026-02-03T12:36:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.798	2026-02-08 20:27:59.952
d54625ad-7261-4a0c-8c5c-208e5fb89f86	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-02-03	2026-02-03 03:58:00	2026-02-03 11:36:00	7.63	7.63	0	0	Present	["2026-02-03T03:58:00.000Z","2026-02-03T11:36:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.799	2026-02-08 20:27:59.953
c0883bfe-f4c2-4951-8a25-79fc9477c990	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-02-03	2026-02-03 04:34:00	2026-02-03 12:48:00	8.23	8.23	0	0	Present	["2026-02-03T04:34:00.000Z","2026-02-03T12:48:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.8	2026-02-08 20:27:59.954
e5e89824-39a3-4b62-9b2b-c72820d251c6	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-02-02	2026-02-02 04:50:00	2026-02-02 12:50:00	8	8	0	0	Present	["2026-02-02T04:50:00.000Z","2026-02-02T07:45:00.000Z","2026-02-02T08:41:00.000Z","2026-02-02T12:50:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.801	2026-02-08 20:27:59.955
12209b0e-0c07-45f5-bd3c-5bac2cf1bd07	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-02-02	2026-02-02 03:31:00	\N	0	0	0	0	Shift Incomplete	["2026-02-02T03:31:00.000Z"]	1	\N	\N	\N	2026-02-08 19:18:00.803	2026-02-08 20:27:59.956
170f0c48-53cf-43ee-af0c-a5efe9da1ab4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-02-02	2026-02-02 04:59:00	2026-02-02 11:32:00	6.55	6.55	0	0	Present	["2026-02-02T04:59:00.000Z","2026-02-02T11:32:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.804	2026-02-08 20:27:59.957
6906c3cc-b9c0-4ebb-8cea-b73030002d15	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-02-02	2026-02-02 04:57:00	2026-02-02 12:21:00	7.4	7.4	0	0	Present	["2026-02-02T04:57:00.000Z","2026-02-02T07:42:00.000Z","2026-02-02T08:42:00.000Z","2026-02-02T12:21:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.805	2026-02-08 20:27:59.958
f4b83dde-7348-4643-ac63-d0fdd8007fe6	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-02-02	2026-02-02 04:52:00	2026-02-02 12:11:00	7.32	7.32	0	0	Present	["2026-02-02T04:52:00.000Z","2026-02-02T07:30:00.000Z","2026-02-02T08:34:00.000Z","2026-02-02T12:11:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.807	2026-02-08 20:27:59.96
d030f04c-3d1d-4e62-9148-dc6dff9d8588	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-02-02	2026-02-02 04:33:00	2026-02-02 08:41:00	4.13	4.13	0	0	Present	["2026-02-02T04:33:00.000Z","2026-02-02T07:46:00.000Z","2026-02-02T08:41:00.000Z"]	3	\N	\N	\N	2026-02-08 19:18:00.808	2026-02-08 20:27:59.96
d0e9e8a9-1dc7-4ba9-890a-fee820c13cda	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-02-02	2026-02-02 04:39:00	2026-02-02 12:21:00	7.7	7.7	0	0	Present	["2026-02-02T04:39:00.000Z","2026-02-02T07:46:00.000Z","2026-02-02T08:33:00.000Z","2026-02-02T12:21:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.81	2026-02-08 20:27:59.961
7357ba3a-828a-4173-b13a-6aee1f98feb5	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-31	2026-01-31 04:48:00	2026-01-31 11:48:00	7	7	0	0	Present	["2026-01-31T04:48:00.000Z","2026-01-31T07:30:00.000Z","2026-01-31T08:57:00.000Z","2026-01-31T11:48:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.811	2026-02-08 20:27:59.962
0eaa6e18-6441-4b0b-a126-d7fe40f13a89	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-02-05	2026-02-05 04:57:00	2026-02-05 12:07:00	7.17	7.17	0	0	Present	["2026-02-05T04:57:00.000Z","2026-02-05T12:07:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.781	2026-02-08 20:27:59.963
40a4b3fa-8347-4307-92c7-acd788a68767	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-02-04	2026-02-04 04:33:00	2026-02-04 14:11:00	9.63	9.63	0	0	Present	["2026-02-04T04:33:00.000Z","2026-02-04T07:34:00.000Z","2026-02-04T08:45:00.000Z","2026-02-04T14:11:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.782	2026-02-08 20:27:59.939
e23d97b8-c94e-48d3-b045-a777da648781	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-31	2026-01-31 03:54:00	2026-01-31 14:28:00	10.57	10.57	0	0	Present	["2026-01-31T03:54:00.000Z","2026-01-31T07:55:00.000Z","2026-01-31T08:31:00.000Z","2026-01-31T14:28:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.817	2026-02-08 20:27:59.966
4e88bea0-1a6d-4085-84c8-b21fa56b8b70	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-31	2026-01-31 03:41:00	2026-01-31 12:27:00	8.77	8.77	0	0	Present	["2026-01-31T03:41:00.000Z","2026-01-31T07:45:00.000Z","2026-01-31T08:31:00.000Z","2026-01-31T12:27:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.818	2026-02-08 20:27:59.967
a74f5581-6dbc-4951-88ca-2fd81e5f5f44	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-31	2026-01-31 03:40:00	2026-01-31 13:09:00	9.48	9.48	0	0	Present	["2026-01-31T03:40:00.000Z","2026-01-31T07:35:00.000Z","2026-01-31T08:37:00.000Z","2026-01-31T13:09:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.819	2026-02-08 20:27:59.968
09748759-1360-4864-932a-9bd11ac88810	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-30	2026-01-30 03:55:00	2026-01-30 13:39:00	9.73	9.73	0	0	Present	["2026-01-30T03:55:00.000Z","2026-01-30T07:57:00.000Z","2026-01-30T08:47:00.000Z","2026-01-30T13:39:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.82	2026-02-08 20:27:59.969
28900054-83bb-4618-aadc-cc1fa0136d8d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-30	2026-01-30 04:56:00	\N	0	0	0	0	Shift Incomplete	["2026-01-30T04:56:00.000Z"]	1	\N	\N	\N	2026-02-08 19:18:00.822	2026-02-08 20:27:59.97
a797c112-8873-4500-929b-f8d0022392e8	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-30	2026-01-30 04:47:00	2026-01-30 13:02:00	8.25	8.25	0	0	Present	["2026-01-30T04:47:00.000Z","2026-01-30T07:50:00.000Z","2026-01-30T08:34:00.000Z","2026-01-30T13:02:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.823	2026-02-08 20:27:59.972
a4d98cd8-af70-4598-8a4b-82d2002ec6e0	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-30	2026-01-30 03:31:00	2026-01-30 12:02:00	8.52	8.52	0	0	Present	["2026-01-30T03:31:00.000Z","2026-01-30T12:02:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.824	2026-02-08 20:27:59.974
1002d3c7-d218-4113-a53d-93ccac58f176	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-30	2026-01-30 03:44:00	2026-01-30 13:08:00	9.4	9.4	0	0	Present	["2026-01-30T03:44:00.000Z","2026-01-30T07:35:00.000Z","2026-01-30T08:33:00.000Z","2026-01-30T13:08:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.826	2026-02-08 20:27:59.976
5bbb6dd7-84e5-466e-a3f6-0efa53c37154	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-30	2026-01-30 03:58:00	2026-01-30 13:39:00	9.68	9.68	0	0	Present	["2026-01-30T03:58:00.000Z","2026-01-30T13:39:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.827	2026-02-08 20:27:59.977
cdf3976e-2ccd-4789-915d-b3644a0b4ef2	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-29	2026-01-29 04:31:00	2026-01-29 12:17:00	7.77	7.77	0	0	Present	["2026-01-29T04:31:00.000Z","2026-01-29T12:17:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.829	2026-02-08 20:27:59.978
12550bff-4122-46b9-8552-37af4af7a8d9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-29	2026-01-29 04:31:00	2026-01-29 13:52:00	9.35	9.35	0	0	Present	["2026-01-29T04:31:00.000Z","2026-01-29T13:52:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.83	2026-02-08 20:27:59.979
19faa253-9ea0-4ac5-aac0-65611941e04c	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-29	2026-01-29 04:32:00	2026-01-29 14:12:00	9.67	9.67	0	0	Present	["2026-01-29T04:32:00.000Z","2026-01-29T07:54:00.000Z","2026-01-29T08:53:00.000Z","2026-01-29T14:12:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.831	2026-02-08 20:27:59.981
923c9f7b-660a-4fa7-82f5-f5fe83c6ec51	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-29	2026-01-29 03:47:00	2026-01-29 12:26:00	8.65	8.65	0	0	Present	["2026-01-29T03:47:00.000Z","2026-01-29T12:26:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.833	2026-02-08 20:27:59.982
f8bf943f-f6cd-4bf1-b058-61e417ebec3b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-29	2026-01-29 04:35:00	2026-01-29 12:47:00	8.2	8.2	0	0	Present	["2026-01-29T04:35:00.000Z","2026-01-29T07:59:00.000Z","2026-01-29T08:31:00.000Z","2026-01-29T12:47:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.834	2026-02-08 20:27:59.983
7fe0ef52-d183-4941-b9a3-ae90b77e0f27	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-29	2026-01-29 04:34:00	2026-01-29 14:22:00	9.8	9.8	0	0	Present	["2026-01-29T04:34:00.000Z","2026-01-29T14:22:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.835	2026-02-08 20:27:59.984
4e142e5a-9050-4de6-9b78-38d1a1f1882d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-29	2026-01-29 03:30:00	\N	0	0	0	0	Shift Incomplete	["2026-01-29T03:30:00.000Z"]	1	\N	\N	\N	2026-02-08 19:18:00.837	2026-02-08 20:27:59.985
0ed97de2-4218-4509-9dc9-97a599fd4384	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-29	2026-01-29 03:50:00	2026-01-29 14:17:00	10.45	10.45	0	0	Present	["2026-01-29T03:50:00.000Z","2026-01-29T14:17:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.838	2026-02-08 20:27:59.986
0ccca0f0-5d42-421d-bcd8-9e73930f2d7d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-28	2026-01-28 03:34:00	2026-01-28 11:33:00	7.98	7.98	0	0	Present	["2026-01-28T03:34:00.000Z","2026-01-28T07:47:00.000Z","2026-01-28T08:55:00.000Z","2026-01-28T11:33:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.839	2026-02-08 20:27:59.987
679c8bf2-3d0c-4d2f-bcec-d27f76d5ba62	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-28	2026-01-28 04:53:00	2026-01-28 14:13:00	9.33	9.33	0	0	Present	["2026-01-28T04:53:00.000Z","2026-01-28T14:13:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.84	2026-02-08 20:27:59.988
90d6827a-cd92-4516-a991-ffdd7e4ea4d3	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-28	2026-01-28 04:37:00	2026-01-28 13:08:00	8.52	8.52	0	0	Present	["2026-01-28T04:37:00.000Z","2026-01-28T07:57:00.000Z","2026-01-28T08:34:00.000Z","2026-01-28T13:08:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.841	2026-02-08 20:27:59.989
380db074-1d31-45b7-9b57-c8375ba78dec	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-28	2026-01-28 03:50:00	2026-01-28 11:42:00	7.87	7.87	0	0	Present	["2026-01-28T03:50:00.000Z","2026-01-28T07:30:00.000Z","2026-01-28T08:41:00.000Z","2026-01-28T11:42:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.843	2026-02-08 20:27:59.99
9041145c-1121-4d2f-bc04-dd8dec81f3b8	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-28	2026-01-28 04:37:00	2026-01-28 13:42:00	9.08	9.08	0	0	Present	["2026-01-28T04:37:00.000Z","2026-01-28T13:42:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.844	2026-02-08 20:27:59.991
5b8fb6a9-5c54-4978-8652-bc53d47575d3	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-31	2026-01-31 03:38:00	2026-01-31 12:21:00	8.72	8.72	0	0	Present	["2026-01-31T03:38:00.000Z","2026-01-31T07:53:00.000Z","2026-01-31T08:53:00.000Z","2026-01-31T12:21:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.814	2026-02-08 20:27:59.992
7f5eaf8c-e1bd-490c-852f-949b843640ef	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-31	2026-01-31 03:48:00	2026-01-31 13:19:00	9.52	9.52	0	0	Present	["2026-01-31T03:48:00.000Z","2026-01-31T13:19:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.815	2026-02-08 20:27:59.965
3f9f0bf0-a04b-409a-9a63-c6df5f9c9663	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-27	2026-01-27 03:36:00	2026-01-27 14:13:00	10.62	10.62	0	0	Present	["2026-01-27T03:36:00.000Z","2026-01-27T07:46:00.000Z","2026-01-27T08:47:00.000Z","2026-01-27T14:13:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.849	2026-02-08 20:27:59.994
63f47da2-a278-4f0a-a390-e2da37ef3b1e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-27	2026-01-27 03:43:00	2026-01-27 11:54:00	8.18	8.18	0	0	Present	["2026-01-27T03:43:00.000Z","2026-01-27T11:54:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.85	2026-02-08 20:27:59.995
89d4a90d-3192-4ea4-a583-fcf88cb8c219	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-27	2026-01-27 03:47:00	2026-01-27 11:32:00	7.75	7.75	0	0	Present	["2026-01-27T03:47:00.000Z","2026-01-27T07:51:00.000Z","2026-01-27T08:30:00.000Z","2026-01-27T11:32:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.851	2026-02-08 20:27:59.996
b675476d-6d77-4270-8bd2-d9ff5e8c9dfa	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-27	2026-01-27 03:48:00	2026-01-27 13:21:00	9.55	9.55	0	0	Present	["2026-01-27T03:48:00.000Z","2026-01-27T13:21:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.853	2026-02-08 20:27:59.997
57e1221e-c30b-4f41-948c-a0a2fb44e75f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-27	2026-01-27 04:59:00	2026-01-27 13:40:00	8.68	8.68	0	0	Present	["2026-01-27T04:59:00.000Z","2026-01-27T13:40:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.854	2026-02-08 20:27:59.998
6a9730e5-0c82-4e49-8c97-58ca587ce177	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-27	2026-01-27 04:43:00	2026-01-27 12:07:00	7.4	7.4	0	0	Present	["2026-01-27T04:43:00.000Z","2026-01-27T07:43:00.000Z","2026-01-27T08:51:00.000Z","2026-01-27T12:07:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.856	2026-02-08 20:27:59.999
510dc219-09b9-40f8-82e7-e22646f6ff0e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-26	2026-01-26 03:48:00	2026-01-26 13:20:00	9.53	9.53	0	0	Present	["2026-01-26T03:48:00.000Z","2026-01-26T07:52:00.000Z","2026-01-26T08:31:00.000Z","2026-01-26T13:20:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.857	2026-02-08 20:28:00.002
785e5e00-8af2-48ad-bbee-3118374bc14f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-26	2026-01-26 04:53:00	2026-01-26 11:39:00	6.77	6.77	0	0	Present	["2026-01-26T04:53:00.000Z","2026-01-26T11:39:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.858	2026-02-08 20:28:00.003
cb63622d-e151-45bf-ac68-7393dbc98f39	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-26	2026-01-26 03:40:00	2026-01-26 12:19:00	8.65	8.65	0	0	Present	["2026-01-26T03:40:00.000Z","2026-01-26T07:35:00.000Z","2026-01-26T08:53:00.000Z","2026-01-26T12:19:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.859	2026-02-08 20:28:00.005
e7bc5761-c91a-4196-9328-2fa6056bcb83	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-26	2026-01-26 04:36:00	2026-01-26 14:19:00	9.72	9.72	0	0	Present	["2026-01-26T04:36:00.000Z","2026-01-26T14:19:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.86	2026-02-08 20:28:00.006
855fcdb2-4dbb-411c-9bb2-d19d8ad90bb6	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-26	2026-01-26 03:47:00	2026-01-26 12:19:00	8.53	8.53	0	0	Present	["2026-01-26T03:47:00.000Z","2026-01-26T07:45:00.000Z","2026-01-26T08:57:00.000Z","2026-01-26T12:19:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.862	2026-02-08 20:28:00.007
b24b7703-9671-474e-8362-b758b1331e9e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-26	2026-01-26 04:54:00	2026-01-26 12:28:00	7.57	7.57	0	0	Present	["2026-01-26T04:54:00.000Z","2026-01-26T07:37:00.000Z","2026-01-26T08:36:00.000Z","2026-01-26T12:28:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.863	2026-02-08 20:28:00.008
a64d2ed9-ac52-43cc-b153-fa1ffaebec67	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-24	2026-01-24 04:49:00	2026-01-24 11:46:00	6.95	6.95	0	0	Present	["2026-01-24T04:49:00.000Z","2026-01-24T11:46:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.864	2026-02-08 20:28:00.009
65fdaa2b-ac11-4ad3-a126-289f246aabe8	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-24	2026-01-24 04:46:00	2026-01-24 12:53:00	8.12	8.12	0	0	Present	["2026-01-24T04:46:00.000Z","2026-01-24T12:53:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.865	2026-02-08 20:28:00.011
ab1b768d-1277-40c2-8f18-2a92d419a4ce	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-24	2026-01-24 03:45:00	2026-01-24 14:06:00	10.35	10.35	0	0	Present	["2026-01-24T03:45:00.000Z","2026-01-24T07:36:00.000Z","2026-01-24T08:50:00.000Z","2026-01-24T14:06:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.867	2026-02-08 20:28:00.012
425df527-bcfa-447d-a52a-fe76299b314b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-24	2026-01-24 03:48:00	2026-01-24 14:22:00	10.57	10.57	0	0	Present	["2026-01-24T03:48:00.000Z","2026-01-24T07:48:00.000Z","2026-01-24T08:32:00.000Z","2026-01-24T14:22:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.868	2026-02-08 20:28:00.013
c9d633fa-511a-4296-921e-16db7836f3fa	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-24	2026-01-24 04:52:00	2026-01-24 13:50:00	8.97	8.97	0	0	Present	["2026-01-24T04:52:00.000Z","2026-01-24T13:50:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.87	2026-02-08 20:28:00.014
8abab6a3-6035-4d2d-a50f-e79158792b8e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-24	2026-01-24 04:33:00	2026-01-24 13:38:00	9.08	9.08	0	0	Present	["2026-01-24T04:33:00.000Z","2026-01-24T07:45:00.000Z","2026-01-24T08:48:00.000Z","2026-01-24T13:38:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.871	2026-02-08 20:28:00.015
6c333b6d-6e60-4588-aad2-76b522ef16a7	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-24	2026-01-24 04:43:00	2026-01-24 13:24:00	8.68	8.68	0	0	Present	["2026-01-24T04:43:00.000Z","2026-01-24T07:30:00.000Z","2026-01-24T08:35:00.000Z","2026-01-24T13:24:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.872	2026-02-08 20:28:00.016
ae67683f-3c6d-401c-bac8-8ef88c8a4cbe	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-24	2026-01-24 03:40:00	2026-01-24 14:12:00	10.53	10.53	0	0	Present	["2026-01-24T03:40:00.000Z","2026-01-24T14:12:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.874	2026-02-08 20:28:00.017
bc8d838a-e36c-4b47-868e-fbd02f8309f3	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-23	2026-01-23 04:51:00	2026-01-23 13:36:00	8.75	8.75	0	0	Present	["2026-01-23T04:51:00.000Z","2026-01-23T13:36:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.875	2026-02-08 20:28:00.018
37b9551e-a13f-42af-9f4c-2fd520a1b63e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-23	2026-01-23 04:50:00	2026-01-23 12:43:00	7.88	7.88	0	0	Present	["2026-01-23T04:50:00.000Z","2026-01-23T12:43:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.876	2026-02-08 20:28:00.02
da2cf990-2a07-4d2a-b30c-1ac565b316b6	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-28	2026-01-28 04:35:00	2026-01-28 12:48:00	8.22	8.22	0	0	Present	["2026-01-28T04:35:00.000Z","2026-01-28T07:45:00.000Z","2026-01-28T08:41:00.000Z","2026-01-28T12:48:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.846	2026-02-08 20:28:00.025
090129ef-ea83-43b9-a537-d709300d7b09	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-28	2026-01-28 04:48:00	2026-01-28 13:59:00	9.18	9.18	0	0	Present	["2026-01-28T04:48:00.000Z","2026-01-28T13:59:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.848	2026-02-08 20:27:59.993
00acb996-5224-4db8-8a01-0657bcd7a016	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-23	2026-01-23 04:35:00	\N	0	0	0	0	Shift Incomplete	["2026-01-23T04:35:00.000Z"]	1	\N	\N	\N	2026-02-08 19:18:00.881	2026-02-08 20:28:00.029
94c7c4f5-892e-4706-b15f-f70b4e068f5d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-23	2026-01-23 03:34:00	2026-01-23 14:06:00	10.53	10.53	0	0	Present	["2026-01-23T03:34:00.000Z","2026-01-23T14:06:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.883	2026-02-08 20:28:00.033
b9b2a424-7a11-4d91-8853-b41486994773	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-23	2026-01-23 03:47:00	\N	0	0	0	0	Shift Incomplete	["2026-01-23T03:47:00.000Z"]	1	\N	\N	\N	2026-02-08 19:18:00.884	2026-02-08 20:28:00.036
df536c3b-fc66-4c10-b1ea-e514d2c7a334	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-22	2026-01-22 04:37:00	2026-01-22 12:49:00	8.2	8.2	0	0	Present	["2026-01-22T04:37:00.000Z","2026-01-22T12:49:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.885	2026-02-08 20:28:00.037
3a2c4058-9d17-4508-9764-35465bf8e76d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-22	2026-01-22 03:30:00	2026-01-22 12:48:00	9.3	9.3	0	0	Present	["2026-01-22T03:30:00.000Z","2026-01-22T07:44:00.000Z","2026-01-22T08:44:00.000Z","2026-01-22T12:48:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.886	2026-02-08 20:28:00.039
55f00699-08e6-403b-8f33-7762edd83923	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-22	2026-01-22 03:53:00	2026-01-22 12:51:00	8.97	8.97	0	0	Present	["2026-01-22T03:53:00.000Z","2026-01-22T07:48:00.000Z","2026-01-22T08:38:00.000Z","2026-01-22T12:51:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.887	2026-02-08 20:28:00.04
aaa3ba0b-33e0-4e52-bebd-24aca5648660	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-22	2026-01-22 03:52:00	2026-01-22 14:00:00	10.13	10.13	0	0	Present	["2026-01-22T03:52:00.000Z","2026-01-22T07:38:00.000Z","2026-01-22T08:39:00.000Z","2026-01-22T14:00:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.888	2026-02-08 20:28:00.041
95529c2f-88c3-45f4-94a1-4553e82c7df0	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-22	2026-01-22 04:43:00	2026-01-22 14:19:00	9.6	9.6	0	0	Present	["2026-01-22T04:43:00.000Z","2026-01-22T14:19:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.889	2026-02-08 20:28:00.042
c57281eb-d879-49f4-af59-5c2179808349	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-22	2026-01-22 04:58:00	2026-01-22 14:07:00	9.15	9.15	0	0	Present	["2026-01-22T04:58:00.000Z","2026-01-22T14:07:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.89	2026-02-08 20:28:00.043
f81c8554-0e15-4c39-9c21-2f80be727332	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-21	2026-01-21 04:55:00	2026-01-21 13:58:00	9.05	9.05	0	0	Present	["2026-01-21T04:55:00.000Z","2026-01-21T07:55:00.000Z","2026-01-21T08:38:00.000Z","2026-01-21T13:58:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.892	2026-02-08 20:28:00.044
3effcc2e-4ff6-46dc-85e1-7ecae327e351	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-21	2026-01-21 03:50:00	2026-01-21 12:39:00	8.82	8.82	0	0	Present	["2026-01-21T03:50:00.000Z","2026-01-21T07:43:00.000Z","2026-01-21T08:54:00.000Z","2026-01-21T12:39:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.893	2026-02-08 20:28:00.045
f2db93d5-ef1f-496d-a8d8-e4008bf995a1	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-21	2026-01-21 03:55:00	2026-01-21 12:22:00	8.45	8.45	0	0	Present	["2026-01-21T03:55:00.000Z","2026-01-21T12:22:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.894	2026-02-08 20:28:00.046
6621facc-8b9b-4d2c-921a-15af601feab4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-21	2026-01-21 04:43:00	2026-01-21 14:01:00	9.3	9.3	0	0	Present	["2026-01-21T04:43:00.000Z","2026-01-21T14:01:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.895	2026-02-08 20:28:00.047
c98de663-50ae-4ed8-bfc7-36108b78d369	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-21	2026-01-21 04:32:00	2026-01-21 13:01:00	8.48	8.48	0	0	Present	["2026-01-21T04:32:00.000Z","2026-01-21T07:30:00.000Z","2026-01-21T08:32:00.000Z","2026-01-21T13:01:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.896	2026-02-08 20:28:00.048
7aa2cc8a-6a8e-4917-a560-0bb336b11824	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-21	2026-01-21 04:58:00	2026-01-21 13:18:00	8.33	8.33	0	0	Present	["2026-01-21T04:58:00.000Z","2026-01-21T07:30:00.000Z","2026-01-21T08:52:00.000Z","2026-01-21T13:18:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.897	2026-02-08 20:28:00.049
117e82bc-0267-4fc7-bc13-bb217ea43704	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-21	2026-01-21 03:47:00	2026-01-21 14:17:00	10.5	10.5	0	0	Present	["2026-01-21T03:47:00.000Z","2026-01-21T07:55:00.000Z","2026-01-21T08:46:00.000Z","2026-01-21T14:17:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.898	2026-02-08 20:28:00.05
3cb70efb-7366-4031-afa1-b9b896b8ba6e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-21	2026-01-21 04:35:00	2026-01-21 13:35:00	9	9	0	0	Present	["2026-01-21T04:35:00.000Z","2026-01-21T07:51:00.000Z","2026-01-21T08:37:00.000Z","2026-01-21T13:35:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.9	2026-02-08 20:28:00.051
63732e86-22d1-4bdf-9dbe-30b27aa8acae	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-20	2026-01-20 04:32:00	2026-01-20 12:24:00	7.87	7.87	0	0	Present	["2026-01-20T04:32:00.000Z","2026-01-20T07:41:00.000Z","2026-01-20T08:59:00.000Z","2026-01-20T12:24:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.901	2026-02-08 20:28:00.052
cc2f000b-d7bd-426b-925e-a87141b9290f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-20	2026-01-20 04:33:00	2026-01-20 11:56:00	7.38	7.38	0	0	Present	["2026-01-20T04:33:00.000Z","2026-01-20T11:56:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.902	2026-02-08 20:28:00.053
e3a66ce4-4e9a-40e5-8bd1-f6cf3f2e6352	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-20	2026-01-20 04:35:00	2026-01-20 11:45:00	7.17	7.17	0	0	Present	["2026-01-20T04:35:00.000Z","2026-01-20T11:45:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.903	2026-02-08 20:28:00.054
718fb16e-2b79-45e7-844e-8a4010ebb368	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-20	2026-01-20 03:53:00	2026-01-20 08:55:00	5.03	5.03	0	0	Present	["2026-01-20T03:53:00.000Z","2026-01-20T07:55:00.000Z","2026-01-20T08:55:00.000Z"]	3	\N	\N	\N	2026-02-08 19:18:00.904	2026-02-08 20:28:00.055
787c273c-e35a-431e-ba6b-3b84c63b675f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-20	2026-01-20 04:55:00	2026-01-20 14:26:00	9.52	9.52	0	0	Present	["2026-01-20T04:55:00.000Z","2026-01-20T14:26:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.906	2026-02-08 20:28:00.056
93b3e292-c9ce-4bce-ae72-da0cdcd88780	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-23	2026-01-23 04:50:00	2026-01-23 12:29:00	7.65	7.65	0	0	Present	["2026-01-23T04:50:00.000Z","2026-01-23T12:29:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.879	2026-02-08 20:28:00.057
d2558feb-1f9e-404a-be31-d5faee8970bb	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-23	2026-01-23 04:52:00	2026-01-23 08:45:00	3.88	3.88	0	0	Half Day	["2026-01-23T04:52:00.000Z","2026-01-23T07:48:00.000Z","2026-01-23T08:45:00.000Z"]	3	\N	\N	\N	2026-02-08 19:18:00.88	2026-02-08 20:28:00.026
fa775f9d-4cdf-4a5f-85cb-9982c75ed7ff	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-19	2026-01-19 03:39:00	2026-01-19 13:27:00	9.8	9.8	0	0	Present	["2026-01-19T03:39:00.000Z","2026-01-19T07:53:00.000Z","2026-01-19T08:44:00.000Z","2026-01-19T13:27:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.91	2026-02-08 20:28:00.059
1fc6f014-6f56-4c31-b737-74734b6dc608	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-19	2026-01-19 04:51:00	2026-01-19 12:29:00	7.63	7.63	0	0	Present	["2026-01-19T04:51:00.000Z","2026-01-19T12:29:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.912	2026-02-08 20:28:00.06
a147acfb-7fc1-46c7-bf7d-e5e8353114f4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-19	2026-01-19 03:53:00	2026-01-19 13:14:00	9.35	9.35	0	0	Present	["2026-01-19T03:53:00.000Z","2026-01-19T07:32:00.000Z","2026-01-19T08:39:00.000Z","2026-01-19T13:14:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.913	2026-02-08 20:28:00.061
cc0df218-ba70-40eb-ab7b-28a419c5ae87	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-19	2026-01-19 04:50:00	2026-01-19 12:23:00	7.55	7.55	0	0	Present	["2026-01-19T04:50:00.000Z","2026-01-19T12:23:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.914	2026-02-08 20:28:00.061
6b8cb68a-3d8d-4cb3-a863-43dba135c3f4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-19	2026-01-19 04:49:00	2026-01-19 12:25:00	7.6	7.6	0	0	Present	["2026-01-19T04:49:00.000Z","2026-01-19T07:57:00.000Z","2026-01-19T08:43:00.000Z","2026-01-19T12:25:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.915	2026-02-08 20:28:00.062
fbe66ecd-57b6-496c-8c5f-c2fa6a82737b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-19	2026-01-19 03:32:00	2026-01-19 13:41:00	10.15	10.15	0	0	Present	["2026-01-19T03:32:00.000Z","2026-01-19T13:41:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.916	2026-02-08 20:28:00.063
9fff2447-ac13-4f8b-a975-def893ce4ef6	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-17	2026-01-17 03:51:00	2026-01-17 14:01:00	10.17	10.17	0	0	Present	["2026-01-17T03:51:00.000Z","2026-01-17T07:30:00.000Z","2026-01-17T08:49:00.000Z","2026-01-17T14:01:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.919	2026-02-08 20:28:00.064
0ddfc969-6413-4789-acb8-b31a4c2dcef4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-17	2026-01-17 03:57:00	2026-01-17 13:32:00	9.58	9.58	0	0	Present	["2026-01-17T03:57:00.000Z","2026-01-17T13:32:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.92	2026-02-08 20:28:00.066
866da471-6102-42ba-8cfd-f966d6a647b2	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-17	2026-01-17 04:43:00	2026-01-17 12:55:00	8.2	8.2	0	0	Present	["2026-01-17T04:43:00.000Z","2026-01-17T07:53:00.000Z","2026-01-17T08:46:00.000Z","2026-01-17T12:55:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.921	2026-02-08 20:28:00.067
882c215f-9c38-4f7c-b511-366f20733a8d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-17	2026-01-17 04:47:00	2026-01-17 13:46:00	8.98	8.98	0	0	Present	["2026-01-17T04:47:00.000Z","2026-01-17T07:42:00.000Z","2026-01-17T08:49:00.000Z","2026-01-17T13:46:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.922	2026-02-08 20:28:00.068
c2e9705d-5e88-4c5b-92f8-75c1577c2278	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-17	2026-01-17 04:59:00	2026-01-17 13:00:00	8.02	8.02	0	0	Present	["2026-01-17T04:59:00.000Z","2026-01-17T07:30:00.000Z","2026-01-17T08:35:00.000Z","2026-01-17T13:00:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.923	2026-02-08 20:28:00.069
0b89572b-33b6-48e4-b176-569385886053	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-17	2026-01-17 03:45:00	2026-01-17 11:33:00	7.8	7.8	0	0	Present	["2026-01-17T03:45:00.000Z","2026-01-17T11:33:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.924	2026-02-08 20:28:00.07
8aec41b1-0648-4159-8f9f-d914e5eb809d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-17	2026-01-17 03:36:00	2026-01-17 12:53:00	9.28	9.28	0	0	Present	["2026-01-17T03:36:00.000Z","2026-01-17T07:52:00.000Z","2026-01-17T08:41:00.000Z","2026-01-17T12:53:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.925	2026-02-08 20:28:00.071
d6548d56-7fb5-4864-ab6f-a24663d5e244	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-17	2026-01-17 04:59:00	2026-01-17 13:23:00	8.4	8.4	0	0	Present	["2026-01-17T04:59:00.000Z","2026-01-17T07:41:00.000Z","2026-01-17T08:47:00.000Z","2026-01-17T13:23:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.926	2026-02-08 20:28:00.072
11ed5b48-5d96-4d9d-947d-20e8865c18a2	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-16	2026-01-16 04:55:00	2026-01-16 13:39:00	8.73	8.73	0	0	Present	["2026-01-16T04:55:00.000Z","2026-01-16T13:39:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.928	2026-02-08 20:28:00.073
9c3969e1-afad-466c-93e2-92125d01a634	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-16	2026-01-16 04:43:00	2026-01-16 14:06:00	9.38	9.38	0	0	Present	["2026-01-16T04:43:00.000Z","2026-01-16T07:47:00.000Z","2026-01-16T08:58:00.000Z","2026-01-16T14:06:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.929	2026-02-08 20:28:00.074
fe11c15f-71f6-4642-91a9-b93cd77513d4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-16	2026-01-16 04:44:00	2026-01-16 14:05:00	9.35	9.35	0	0	Present	["2026-01-16T04:44:00.000Z","2026-01-16T14:05:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.931	2026-02-08 20:28:00.075
f553590e-6be9-4196-a269-a28f9f504073	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-16	2026-01-16 03:38:00	2026-01-16 13:48:00	10.17	10.17	0	0	Present	["2026-01-16T03:38:00.000Z","2026-01-16T13:48:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.932	2026-02-08 20:28:00.076
771ced22-3da7-451c-9dab-bedc5cd4ae25	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-16	2026-01-16 04:40:00	2026-01-16 13:31:00	8.85	8.85	0	0	Present	["2026-01-16T04:40:00.000Z","2026-01-16T13:31:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.933	2026-02-08 20:28:00.077
9b85b47b-9f7e-4c43-9ae3-7ef7f921408a	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-16	2026-01-16 03:45:00	2026-01-16 13:36:00	9.85	9.85	0	0	Present	["2026-01-16T03:45:00.000Z","2026-01-16T07:52:00.000Z","2026-01-16T08:40:00.000Z","2026-01-16T13:36:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.934	2026-02-08 20:28:00.078
70df8b55-7307-4f9a-a407-54ab421ba27b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-12	2026-01-12 04:55:00	2026-01-12 11:49:00	6.9	6.9	0	0	Present	["2026-01-12T04:55:00.000Z","2026-01-12T11:49:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.967	2026-02-08 20:28:00.079
19ba91b2-59c5-44bb-a2df-9b9c3db50545	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-20	2026-01-20 04:39:00	2026-01-20 13:00:00	8.35	8.35	0	0	Present	["2026-01-20T04:39:00.000Z","2026-01-20T07:44:00.000Z","2026-01-20T08:45:00.000Z","2026-01-20T13:00:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.908	2026-02-08 20:28:00.08
e85d5bab-f959-4d1b-81e6-6729fe912da4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-19	2026-01-19 04:49:00	2026-01-19 12:46:00	7.95	7.95	0	0	Present	["2026-01-19T04:49:00.000Z","2026-01-19T07:56:00.000Z","2026-01-19T08:47:00.000Z","2026-01-19T12:46:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.909	2026-02-08 20:28:00.058
8b9b30d8-6a1c-433f-bf13-83bf82ca0822	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-15	2026-01-15 04:39:00	2026-01-15 12:56:00	8.28	8.28	0	0	Present	["2026-01-15T04:39:00.000Z","2026-01-15T07:44:00.000Z","2026-01-15T08:44:00.000Z","2026-01-15T12:56:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.939	2026-02-08 20:28:00.083
edc04dd6-a273-4a5f-922c-fe5ee3ef7bfa	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-15	2026-01-15 03:41:00	2026-01-15 11:43:00	8.03	8.03	0	0	Present	["2026-01-15T03:41:00.000Z","2026-01-15T07:40:00.000Z","2026-01-15T08:46:00.000Z","2026-01-15T11:43:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.94	2026-02-08 20:28:00.084
dd5dee1d-781d-426b-b9ab-a90165dcfae9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-15	2026-01-15 04:37:00	2026-01-15 13:19:00	8.7	8.7	0	0	Present	["2026-01-15T04:37:00.000Z","2026-01-15T13:19:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.941	2026-02-08 20:28:00.085
f2031677-0627-4f17-9255-c35e623aa527	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-15	2026-01-15 03:37:00	2026-01-15 11:55:00	8.3	8.3	0	0	Present	["2026-01-15T03:37:00.000Z","2026-01-15T11:55:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.942	2026-02-08 20:28:00.086
e4a932e6-f69a-4649-99f2-5650a40afecb	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-15	2026-01-15 04:36:00	2026-01-15 08:41:00	4.08	4.08	0	0	Present	["2026-01-15T04:36:00.000Z","2026-01-15T07:43:00.000Z","2026-01-15T08:41:00.000Z"]	3	\N	\N	\N	2026-02-08 19:18:00.944	2026-02-08 20:28:00.087
01385075-5b0f-43a7-8bcd-8a9c53b92afc	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-15	2026-01-15 03:52:00	2026-01-15 13:21:00	9.48	9.48	0	0	Present	["2026-01-15T03:52:00.000Z","2026-01-15T13:21:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.945	2026-02-08 20:28:00.088
6b4bda3e-bf7c-43de-a4e0-0b85a8985925	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-15	2026-01-15 03:54:00	2026-01-15 11:53:00	7.98	7.98	0	0	Present	["2026-01-15T03:54:00.000Z","2026-01-15T11:53:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.946	2026-02-08 20:28:00.089
0118f043-4d99-4c58-9437-83212c758b40	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-14	2026-01-14 04:58:00	2026-01-14 12:32:00	7.57	7.57	0	0	Present	["2026-01-14T04:58:00.000Z","2026-01-14T07:53:00.000Z","2026-01-14T08:34:00.000Z","2026-01-14T12:32:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.948	2026-02-08 20:28:00.09
4e8b6c62-c2fe-43b8-bf22-36420f0b6b46	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-14	2026-01-14 04:38:00	2026-01-14 14:04:00	9.43	9.43	0	0	Present	["2026-01-14T04:38:00.000Z","2026-01-14T07:44:00.000Z","2026-01-14T08:53:00.000Z","2026-01-14T14:04:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.949	2026-02-08 20:28:00.091
7bc81fc1-23d0-4b83-82f0-7925975f6cc7	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-14	2026-01-14 04:52:00	2026-01-14 14:25:00	9.55	9.55	0	0	Present	["2026-01-14T04:52:00.000Z","2026-01-14T07:49:00.000Z","2026-01-14T08:39:00.000Z","2026-01-14T14:25:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.95	2026-02-08 20:28:00.092
cfce6ef4-f85e-410b-9823-c56c4622be1d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-14	2026-01-14 03:44:00	2026-01-14 12:51:00	9.12	9.12	0	0	Present	["2026-01-14T03:44:00.000Z","2026-01-14T12:51:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.952	2026-02-08 20:28:00.093
74258ce3-2821-473a-bd38-48b8d8414ef5	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-14	2026-01-14 03:34:00	2026-01-14 13:11:00	9.62	9.62	0	0	Present	["2026-01-14T03:34:00.000Z","2026-01-14T07:59:00.000Z","2026-01-14T08:55:00.000Z","2026-01-14T13:11:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.953	2026-02-08 20:28:00.094
357cb720-247c-4423-aa5f-a88a873c726e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-14	2026-01-14 03:31:00	2026-01-14 12:29:00	8.97	8.97	0	0	Present	["2026-01-14T03:31:00.000Z","2026-01-14T07:49:00.000Z","2026-01-14T08:36:00.000Z","2026-01-14T12:29:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.954	2026-02-08 20:28:00.095
279705e0-9abd-4c90-9618-7f5cb60423bd	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-14	2026-01-14 03:43:00	2026-01-14 12:48:00	9.08	9.08	0	0	Present	["2026-01-14T03:43:00.000Z","2026-01-14T12:48:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.956	2026-02-08 20:28:00.096
af4653e2-9453-49a1-87ba-ae4f9fc8922e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-13	2026-01-13 03:39:00	2026-01-13 11:33:00	7.9	7.9	0	0	Present	["2026-01-13T03:39:00.000Z","2026-01-13T07:51:00.000Z","2026-01-13T08:44:00.000Z","2026-01-13T11:33:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.957	2026-02-08 20:28:00.097
28084a30-15b9-4ab0-94f8-4ef266f09784	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-13	2026-01-13 04:39:00	2026-01-13 11:52:00	7.22	7.22	0	0	Present	["2026-01-13T04:39:00.000Z","2026-01-13T07:45:00.000Z","2026-01-13T08:54:00.000Z","2026-01-13T11:52:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.958	2026-02-08 20:28:00.098
3e0ab152-7beb-41bb-bd91-f385cecd728e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-13	2026-01-13 04:53:00	2026-01-13 13:42:00	8.82	8.82	0	0	Present	["2026-01-13T04:53:00.000Z","2026-01-13T13:42:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.96	2026-02-08 20:28:00.099
9e571369-a1bc-4678-969c-e9c0e5ffd131	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	5ee54f18-52b3-4298-9717-4fe761f3b973	2026-01-13	2026-01-13 03:40:00	2026-01-13 08:40:00	5	5	0	0	Present	["2026-01-13T03:40:00.000Z","2026-01-13T07:55:00.000Z","2026-01-13T08:40:00.000Z"]	3	\N	\N	\N	2026-02-08 19:18:00.961	2026-02-08 20:28:00.1
850ce94d-22f5-4079-bbde-807d0abb859a	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-13	2026-01-13 03:54:00	2026-01-13 13:30:00	9.6	9.6	0	0	Present	["2026-01-13T03:54:00.000Z","2026-01-13T13:30:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.962	2026-02-08 20:28:00.101
c6bbb719-1dca-4e67-86b0-73cb8b5d0a79	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-13	2026-01-13 03:51:00	2026-01-13 12:15:00	8.4	8.4	0	0	Present	["2026-01-13T03:51:00.000Z","2026-01-13T12:15:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.964	2026-02-08 20:28:00.102
ab6c684b-ee5f-42de-904f-15101ae9c20b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-13	2026-01-13 03:41:00	2026-01-13 12:37:00	8.93	8.93	0	0	Present	["2026-01-13T03:41:00.000Z","2026-01-13T12:37:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.965	2026-02-08 20:28:00.103
6496a864-7a34-4290-abf5-bf01c600bdff	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-12	2026-01-12 04:48:00	2026-01-12 12:33:00	7.75	7.75	0	0	Present	["2026-01-12T04:48:00.000Z","2026-01-12T12:33:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.966	2026-02-08 20:28:00.104
6c712b9b-f16c-4cb9-ad3e-a3487543daa9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-16	2026-01-16 03:52:00	2026-01-16 12:53:00	9.02	9.02	0	0	Present	["2026-01-16T03:52:00.000Z","2026-01-16T07:52:00.000Z","2026-01-16T08:32:00.000Z","2026-01-16T12:53:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.937	2026-02-08 20:28:00.105
b707fbb6-6aaa-422c-878b-6d1c23e8b9c7	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-01-15	2026-01-15 04:48:00	2026-01-15 14:27:00	9.65	9.65	0	0	Present	["2026-01-15T04:48:00.000Z","2026-01-15T14:27:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.938	2026-02-08 20:28:00.082
1c2974fb-719b-496e-9ad7-261446eb4e95	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	152c4820-33ca-4be1-8c23-445f0c7655a9	2026-01-31	2026-01-31 04:57:00	2026-01-31 11:42:00	6.75	6.75	0	0	Present	["2026-01-31T04:57:00.000Z","2026-01-31T11:42:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.813	2026-02-08 20:28:00.109
fd687936-26be-4902-9e7d-4414ac2dd98e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-28	2026-01-28 03:51:00	2026-01-28 14:21:00	10.5	10.5	0	0	Present	["2026-01-28T03:51:00.000Z","2026-01-28T14:21:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.845	2026-02-08 20:28:00.11
2a6c7e02-23c8-492c-bf46-ed3fb1bb0ff8	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-23	2026-01-23 03:33:00	2026-01-23 13:49:00	10.27	10.27	0	0	Present	["2026-01-23T03:33:00.000Z","2026-01-23T07:57:00.000Z","2026-01-23T08:36:00.000Z","2026-01-23T13:49:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.877	2026-02-08 20:28:00.111
2b4941f0-5991-4555-b632-25d1339c130f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-20	2026-01-20 04:55:00	2026-01-20 13:57:00	9.03	9.03	0	0	Present	["2026-01-20T04:55:00.000Z","2026-01-20T07:34:00.000Z","2026-01-20T08:58:00.000Z","2026-01-20T13:57:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.907	2026-02-08 20:28:00.112
cc133c5e-f213-4601-9148-e422a7234a75	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	2026-01-19	2026-01-19 04:36:00	2026-01-19 13:12:00	8.6	8.6	0	0	Present	["2026-01-19T04:36:00.000Z","2026-01-19T07:57:00.000Z","2026-01-19T08:53:00.000Z","2026-01-19T13:12:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.917	2026-02-08 20:28:00.113
24d54de7-0c2e-42f1-bf49-571cecc65672	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-16	2026-01-16 04:33:00	2026-01-16 12:19:00	7.77	7.77	0	0	Present	["2026-01-16T04:33:00.000Z","2026-01-16T07:45:00.000Z","2026-01-16T08:31:00.000Z","2026-01-16T12:19:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.936	2026-02-08 20:28:00.114
dd7ce2d4-a7f3-4cb7-a8d0-6bf85cc962f4	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-01-12	2026-01-12 04:41:00	2026-01-12 12:55:00	8.23	8.23	0	0	Present	["2026-01-12T04:41:00.000Z","2026-01-12T07:40:00.000Z","2026-01-12T08:55:00.000Z","2026-01-12T12:55:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.969	2026-02-08 20:28:00.115
029c4a0b-5dd3-4f84-b21d-d7a133512471	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ea891b7b-32a4-4387-a371-8944d1689fe0	2026-02-09	2026-02-09 03:50:00	2026-02-09 14:29:00	10.65	10.65	0	0	Present	["2026-02-09T03:50:00.000Z","2026-02-09T07:57:00.000Z","2026-02-09T08:46:00.000Z","2026-02-09T14:29:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.745	2026-02-08 20:28:00.106
7a2d110a-78ce-451f-b464-2d539dc3ca5d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	589cc62b-fe8e-406f-bda5-a856b1fa7bd0	2026-02-07	2026-02-07 04:35:00	2026-02-07 12:46:00	8.18	8.18	0	0	Present	["2026-02-07T04:35:00.000Z","2026-02-07T07:38:00.000Z","2026-02-07T08:31:00.000Z","2026-02-07T12:46:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.756	2026-02-08 20:28:00.107
10b9b815-5a27-4bc2-a25a-21087b57be35	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-02-05	2026-02-05 03:48:00	2026-02-05 11:51:00	8.05	8.05	0	0	Present	["2026-02-05T03:48:00.000Z","2026-02-05T07:45:00.000Z","2026-02-05T08:52:00.000Z","2026-02-05T11:51:00.000Z"]	4	\N	\N	\N	2026-02-08 19:18:00.779	2026-02-08 20:28:00.108
128e452f-5b6e-4ce2-90e3-68b6696790be	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	f5bb8adb-b358-497b-a9c2-aca11a805730	2026-01-12	2026-01-12 03:44:00	2026-01-12 12:33:00	8.82	8.82	0	0	Present	["2026-01-12T03:44:00.000Z","2026-01-12T12:33:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.97	2026-02-08 20:28:00.116
b2222e73-ef38-4ef2-a8d5-9691bc334207	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	d6b3f141-55bb-4660-95e2-4a3b8d9233f9	2026-01-12	2026-01-12 03:50:00	2026-01-12 11:52:00	8.03	8.03	0	0	Present	["2026-01-12T03:50:00.000Z","2026-01-12T11:52:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.971	2026-02-08 20:28:00.117
ba9c3163-62cd-431f-89ff-0b5f762a66a8	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	92e858d0-b6a0-4762-a9e8-0ba650ea91ee	2026-01-12	2026-01-12 03:54:00	2026-01-12 14:13:00	10.32	10.32	0	0	Present	["2026-01-12T03:54:00.000Z","2026-01-12T14:13:00.000Z"]	2	\N	\N	\N	2026-02-08 19:18:00.973	2026-02-08 20:28:00.118
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."AuditLog" (id, "tenantId", action, module, "userId", details, description, "createdAt") FROM stdin;
\.


--
-- Data for Name: Batch; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Batch" (id, "tenantId", "courseId", "sessionId", name, "maxStrength", "inchargeId", "startDate", "endDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Branch; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Branch" (id, "tenantId", name, code, address, "isActive", "createdAt", "updatedAt", "locationId") FROM stdin;
\.


--
-- Data for Name: CTCStructure; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."CTCStructure" (id, "tenantId", "employeeId", "effectiveFrom", "effectiveTo", "basicSalary", hra, "specialAllowance", conveyance, medical, lta, "otherAllowances", "employerPF", "employerESI", gratuity, "totalMonthlyGross", "totalAnnualCTC", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Candidate; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Candidate" (id, "tenantId", "jobId", "firstName", "lastName", email, phone, "resumeUrl", status, source, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Category" (id, "tenantId", name, code, description, "createdAt", "updatedAt") FROM stdin;
5d81684f-e79b-4c43-b081-c45a467fb2da	global	Staff	STAFF	\N	2026-02-08 19:17:22.683	2026-02-08 19:17:22.683
2c0da5a4-cc3b-4ff8-ac77-4f58868162fa	global	Worker	WORKER	\N	2026-02-08 19:17:22.685	2026-02-08 19:17:22.685
1a577480-9fc5-42b9-8125-bd7a907114d5	global	Contract	CONTRACT	\N	2026-02-08 19:17:22.687	2026-02-08 19:17:22.687
c45ac362-0726-4369-b3fe-edc65c3f8cd7	global	Intern	INTERN	\N	2026-02-08 19:17:22.688	2026-02-08 19:17:22.688
27e26023-e961-46e5-b35f-f85fa192d7e9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Staff	STAFF	\N	2026-02-08 19:17:22.791	2026-02-08 19:17:22.791
a5ad0819-9838-4351-ae25-d724265a13aa	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Worker	WORKER	\N	2026-02-08 19:17:22.792	2026-02-08 19:17:22.792
b7f54c61-1857-4080-b3f4-435bee2d7ce2	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Contract	CONTRACT	\N	2026-02-08 19:17:22.793	2026-02-08 19:17:22.793
5961868a-68a8-46f6-bc17-d3eb867bfdca	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Intern	INTERN	\N	2026-02-08 19:17:22.795	2026-02-08 19:17:22.795
\.


--
-- Data for Name: CompanyProfile; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."CompanyProfile" (id, "tenantId", name, "legalName", logo, address, city, state, country, pincode, phone, email, website, "taxId", "registrationId", gstin, pan, "pfCode", "esiCode", tan, "bankName", "accountNumber", "ifscCode", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Course; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Course" (id, "tenantId", name, code, description, duration, type, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Department" (id, "tenantId", name, code, "branchId", description, "isActive", "createdAt", "updatedAt") FROM stdin;
946f299e-6647-418a-8592-5e56ef3e1a78	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Engineering	ENG	\N	\N	t	2026-02-08 20:25:40.27	2026-02-08 20:25:40.27
618bdcfa-19ad-4896-811f-264c53c09c43	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Human Resources	HR	\N	\N	t	2026-02-08 20:25:40.27	2026-02-08 20:25:40.27
2fe0a004-4bde-4a6b-bbdf-6295cc252f0e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Finance	FIN	\N	\N	t	2026-02-08 20:25:40.27	2026-02-08 20:25:40.27
\.


--
-- Data for Name: Designation; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Designation" (id, "tenantId", name, code, description, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Device; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Device" (id, "tenantId", name, protocol, "ipAddress", port, "deviceId", username, password, location, status, "isActive", "lastSeen", config) FROM stdin;
\.


--
-- Data for Name: DeviceCommand; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."DeviceCommand" (id, "tenantId", "deviceId", "commandType", payload, status, priority, response, result, error, "createdAt", "updatedAt", "sentAt", "completedAt") FROM stdin;
\.


--
-- Data for Name: DeviceLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."DeviceLog" (id, "tenantId", "deviceId", "employeeId", "deviceUserId", "punchTime", "punchType", source, "verifyMode", "rawData", processed, "processedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Employee" (id, "tenantId", "employeeCode", "firstName", "lastName", email, phone, gender, "dateOfBirth", address, city, state, pincode, "branchId", "departmentId", "designationId", "locationId", "reportToId", "managerOfDeptId", "deviceUserId", "sourceEmployeeId", "dateOfJoining", status, "createdAt", "updatedAt", "isActive", "bankName", "categoryId", "shiftId", "basicSalary", hra, "otherAllowances", "monthlyCtc", "retentionAmount", "standardDeductions", "isOTEnabled", "otRateMultiplier", "isPFEnabled", "isESIEnabled", "isPTEnabled", "accountNumber", "ifscCode", "panNumber", "aadhaarNumber", "cardNumber") FROM stdin;
ea891b7b-32a4-4387-a371-8944d1689fe0	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP001	Rahul	Sharma	\N	\N	\N	\N	\N	\N	\N	\N	\N	946f299e-6647-418a-8592-5e56ef3e1a78	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.725	2026-02-08 19:18:00.725	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
152c4820-33ca-4be1-8c23-445f0c7655a9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP002	Priya	Patel	\N	\N	\N	\N	\N	\N	\N	\N	\N	946f299e-6647-418a-8592-5e56ef3e1a78	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.729	2026-02-08 19:18:00.729	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
92e858d0-b6a0-4762-a9e8-0ba650ea91ee	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP007	Karan	Joshi	\N	\N	\N	\N	\N	\N	\N	\N	\N	946f299e-6647-418a-8592-5e56ef3e1a78	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.74	2026-02-08 19:18:00.74	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
589cc62b-fe8e-406f-bda5-a856b1fa7bd0	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP003	Arun	Kumar	\N	\N	\N	\N	\N	\N	\N	\N	\N	618bdcfa-19ad-4896-811f-264c53c09c43	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.731	2026-02-08 19:18:00.731	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
f5bb8adb-b358-497b-a9c2-aca11a805730	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP004	Sneha	Reddy	\N	\N	\N	\N	\N	\N	\N	\N	\N	618bdcfa-19ad-4896-811f-264c53c09c43	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.734	2026-02-08 19:18:00.734	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
191b1ec4-b02a-4c90-93e9-86acbbd6fd4b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP008	Anita	Desai	\N	\N	\N	\N	\N	\N	\N	\N	\N	618bdcfa-19ad-4896-811f-264c53c09c43	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.742	2026-02-08 19:18:00.742	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
5ee54f18-52b3-4298-9717-4fe761f3b973	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP005	Vikram	Singh	\N	\N	\N	\N	\N	\N	\N	\N	\N	2fe0a004-4bde-4a6b-bbdf-6295cc252f0e	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.736	2026-02-08 19:18:00.736	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
d6b3f141-55bb-4660-95e2-4a3b8d9233f9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	EMP006	Meera	Nair	\N	\N	\N	\N	\N	\N	\N	\N	\N	2fe0a004-4bde-4a6b-bbdf-6295cc252f0e	\N	\N	\N	\N	\N	\N	\N	active	2026-02-08 19:18:00.738	2026-02-08 19:18:00.738	t	\N	\N	\N	0	0	0	0	0	0	t	1	t	t	t	\N	\N	\N	\N	\N
\.


--
-- Data for Name: EmployeeDocument; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."EmployeeDocument" (id, "tenantId", "employeeId", type, name, url, "mimeType", size, "uploadedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmployeeSalaryComponent; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."EmployeeSalaryComponent" (id, "tenantId", "employeeId", "componentId", "monthlyAmount", "isActive", formula) FROM stdin;
\.


--
-- Data for Name: EmployeeShift; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."EmployeeShift" (id, "tenantId", "employeeId", "shiftId", "startDate", "endDate", "isDefault", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ExamMark; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."ExamMark" (id, "tenantId", "studentId", "subjectId", "examName", "marksObtained", "totalMarks", grade, date) FROM stdin;
\.


--
-- Data for Name: FeeHead; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."FeeHead" (id, "tenantId", name, type, frequency, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FeeRecord; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."FeeRecord" (id, "tenantId", "studentId", "structureId", title, amount, "dueDate", status, "paidAmount", "paidDate", "paymentMode", "transactionId", remarks, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FeeStructure; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."FeeStructure" (id, "tenantId", "courseId", "headId", amount, "dueDateOffset", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Feedback; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Feedback" (id, "tenantId", "fromEmployeeId", "toEmployeeId", content, type, "createdAt") FROM stdin;
\.


--
-- Data for Name: FieldLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."FieldLog" (id, "tenantId", "employeeId", "projectId", type, "timestamp", location, image, remarks, status, "approvedBy", "approvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Goal; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Goal" (id, "tenantId", "employeeId", title, description, category, "startDate", "dueDate", progress, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Guardian; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Guardian" (id, "tenantId", "firstName", "lastName", relation, "desc", email, phone, "altPhone", address, "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HikvisionLogs; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."HikvisionLogs" (id, person_id, access_datetime, access_date, access_time, auth_result, device_name, serial_no, person_name, emp_dept, card_no, direction, mask_status, is_processed, created_at) FROM stdin;
\.


--
-- Data for Name: Holiday; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Holiday" (id, "tenantId", name, date, type, description, "isRecurring", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JobOpening; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."JobOpening" (id, "tenantId", title, department, location, type, experience, "salaryRange", description, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LeaveBalance; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."LeaveBalance" (id, "tenantId", code, description, "employeeId", year, total, used, balance) FROM stdin;
\.


--
-- Data for Name: LeaveBalanceTransaction; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."LeaveBalanceTransaction" (id, "leaveBalanceId", date, type, amount, reason, "createdAt") FROM stdin;
\.


--
-- Data for Name: LeaveEntry; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."LeaveEntry" (id, "tenantId", "employeeId", "leaveTypeId", "startDate", "endDate", days, reason, status, "managerApproval", "managerApprovedAt", "managerId", "ceoApproval", "ceoApprovedAt", "ceoId", "rejectionReason", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LeaveType; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."LeaveType" (id, "tenantId", name, code, description, "isPaid", "isActive", "createdAt", "updatedAt") FROM stdin;
8cdee111-5773-4e99-a2a9-05e2535d0db5	global	Casual Leave	CL	\N	t	t	2026-02-08 19:17:22.69	2026-02-08 19:17:22.69
d48c299f-58c0-4a5c-b7c2-9549c3ba4692	global	Sick Leave	SL	\N	t	t	2026-02-08 19:17:22.692	2026-02-08 19:17:22.692
81b6caa9-bb53-4165-970d-8e2be932c56d	global	Earned Leave	EL	\N	t	t	2026-02-08 19:17:22.693	2026-02-08 19:17:22.693
4d473663-49e2-4b8a-9c88-57faa652db63	global	Unpaid Leave	UL	\N	f	t	2026-02-08 19:17:22.695	2026-02-08 19:17:22.695
cd447a8f-81d9-4d53-8a32-fb0453e242a1	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Casual Leave	CL	\N	t	t	2026-02-08 19:17:22.796	2026-02-08 19:17:22.796
a3fa1bc1-3d75-497b-8184-5bfd5b18199d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Sick Leave	SL	\N	t	t	2026-02-08 19:17:22.797	2026-02-08 19:17:22.797
bf1026be-bdff-4252-93eb-0f9ba35884f9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Earned Leave	EL	\N	t	t	2026-02-08 19:17:22.798	2026-02-08 19:17:22.798
e11a85a8-c7ae-46da-a7ab-e47c6a59522c	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Unpaid Leave	UL	\N	f	t	2026-02-08 19:17:22.799	2026-02-08 19:17:22.799
\.


--
-- Data for Name: LibraryBook; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."LibraryBook" (id, "tenantId", title, author, isbn, category, quantity, available, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Loan; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Loan" (id, "tenantId", "employeeId", amount, "interestRate", "tenureMonths", "monthlyDeduction", "startDate", status, "repaidAmount", "balanceAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LoanDeduction; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."LoanDeduction" (id, "tenantId", "loanId", "payrollId", amount, date) FROM stdin;
\.


--
-- Data for Name: Location; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Location" (id, "tenantId", name, code, address, city, state, country, "zipCode", latitude, longitude, radius, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MaintenanceLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."MaintenanceLog" (id, "tenantId", "assetId", type, description, cost, "startDate", "endDate", "performedBy", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Notification" (id, "tenantId", "userId", title, message, type, "isRead", link, "createdAt") FROM stdin;
\.


--
-- Data for Name: OnboardingTask; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."OnboardingTask" (id, "tenantId", "employeeId", title, description, category, "dueDate", status, "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payroll; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Payroll" (id, "tenantId", "employeeId", month, year, "totalWorkingDays", "actualPresentDays", "lopDays", "paidDays", "grossSalary", "basicPaid", "hraPaid", "allowancesPaid", "otHours", "otPay", bonus, incentives, "leaveEncashment", reimbursements, arrears, "totalDeductions", "pfDeduction", "esiDeduction", "ptDeduction", "tdsDeduction", "loanDeduction", "advanceDeduction", "otherDeductions", "employerPF", "employerESI", "gratuityAccrual", "netSalary", details, "retentionDeduction", "finalTakeHome", status, "isHold", "holdReason", "stateCode", "payrollRunId", "processedAt", "approvedAt", "approvedBy", "paidAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PayrollRun; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."PayrollRun" (id, "tenantId", month, year, "periodStart", "periodEnd", status, "processedAt", "processedBy", "approvedAt", "totalNet", "totalEmployees", "totalGross", "batchName", "approvedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: PayrollSetting; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."PayrollSetting" (id, "tenantId", key, value, description, "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payslip; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Payslip" (id, "tenantId", name, "payrollRunId", "employeeId", "grossSalary", "totalDeductions", "netSalary", details, "generatedAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Project" (id, "tenantId", name, code, description, "clientName", "startDate", "endDate", status, latitude, longitude, radius, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RawDeviceLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."RawDeviceLog" (id, "tenantId", "deviceId", "deviceUserId", "userId", "userName", "timestamp", "punchTime", "punchType", "isProcessed", "processedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."RefreshToken" (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ReimbursementEntry; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."ReimbursementEntry" (id, "tenantId", "employeeId", "payrollId", type, amount, "billDate", "billNumber", description, attachment, status, "approvedBy", "approvedAt", "rejectedReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalaryComponent; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."SalaryComponent" (id, "tenantId", name, code, type, "calculationType", value, formula, "isActive", "isEPFApplicable", "isESIApplicable", "isVariable") FROM stdin;
c8c905e2-6002-4a49-8747-3a49c1bb0d5b	global	Basic	BASIC	EARNING	PERCENTAGE	40	CTC * 0.40	t	t	t	f
14639fbe-589c-42da-ba54-e21f72d7fcc2	global	House Rent Allowance	HRA	EARNING	PERCENTAGE	20	CTC * 0.20	t	f	t	f
a48128ea-b326-4b91-95ff-5e49f35e3303	global	Conveyance Allowance	CONVEYANCE_ALLOWANCE	EARNING	PERCENTAGE	5	CTC * 0.05	t	t	f	f
d97f190d-c693-4605-9839-2d556b7c4aab	global	Education Allowance	EDUCATION_ALLOWANCE	EARNING	PERCENTAGE	5	CTC * 0.05	t	t	t	f
04486fd3-c22a-458d-a7ab-bf86588921dc	global	Medical Allowance	MEDICAL_ALLOWANCE	EARNING	PERCENTAGE	10	CTC * 0.10	t	t	t	f
4fd75301-162e-4621-a3e7-8e5c4f688b2f	global	L.T.A	LTA	EARNING	PERCENTAGE	10	CTC * 0.10	t	t	t	f
7a001619-aa8a-4968-b609-794866281ef8	global	Other Allowance	OTHER_ALLOWANCE	EARNING	PERCENTAGE	10	CTC * 0.10	t	f	f	f
72e812ec-de0d-48ef-9254-549ab3a76a14	global	Bonus	BONUS	EARNING	FLAT	0	\N	t	f	f	t
f8c1ea73-f52a-4b9f-8f14-892cbe96e5e1	global	Commission	COMMISSION	EARNING	FLAT	0	\N	t	f	t	t
c8af357b-a7b7-4f5e-a374-fa937eeac1c3	global	Leave Encashment	LEAVE_ENCASHMENT	EARNING	FLAT	0	\N	t	f	f	t
bd10a29f-2adf-4a40-b47f-25624a6dabfb	global	Gratuity	GRATUITY	EARNING	FLAT	0	\N	t	f	f	t
89c05e7b-8d91-4b84-9a10-f007af27bd2f	global	Overtime Allowance	OVERTIME_ALLOWANCE	EARNING	FLAT	0	\N	f	f	t	t
41428464-ee36-462c-9472-69dbe828afb5	global	Notice Pay	NOTICE_PAY	EARNING	FLAT	0	\N	t	f	f	t
fd958e5c-7a32-45ff-a532-c77d2aad0376	global	Hold Salary	HOLD_SALARY	EARNING	FLAT	0	\N	t	f	f	t
c003ff29-b7d1-40c8-b847-815fb2ce104d	global	Provident Fund	PF_EMP	DEDUCTION	PERCENTAGE	12	BASIC * 0.12	t	f	f	f
e1966eec-9255-406a-9bf8-a85baced48bc	global	ESI	ESI_EMP	DEDUCTION	PERCENTAGE	0.75	GROSS * 0.0075	t	f	f	f
594da6c2-59c3-471d-8715-ba866af8651c	global	Professional Tax	PT	DEDUCTION	FLAT	0	SLAB_BASED	t	f	f	f
eff83f78-1afc-444a-985e-749dff4e9e9b	global	TDS	TDS	DEDUCTION	FLAT	0	SLAB_BASED	t	f	f	f
ad9d7631-d2b4-4327-bdad-3569087b8f9f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Basic	BASIC	EARNING	PERCENTAGE	40	CTC * 0.40	t	t	t	f
77e56ae8-1fed-45e6-a323-cc2bb65aa8af	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	House Rent Allowance	HRA	EARNING	PERCENTAGE	20	CTC * 0.20	t	f	t	f
ccd69b56-13d9-40e8-ae14-5057e68b0b14	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Conveyance Allowance	CONVEYANCE_ALLOWANCE	EARNING	PERCENTAGE	5	CTC * 0.05	t	t	f	f
e7edbca7-f80a-4e03-83fa-f0c66614615f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Education Allowance	EDUCATION_ALLOWANCE	EARNING	PERCENTAGE	5	CTC * 0.05	t	t	t	f
0116ddfb-6680-4471-ad95-292af3fea3e2	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Medical Allowance	MEDICAL_ALLOWANCE	EARNING	PERCENTAGE	10	CTC * 0.10	t	t	t	f
24cc2956-c1a5-46a3-bc40-d13a1d9477be	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	L.T.A	LTA	EARNING	PERCENTAGE	10	CTC * 0.10	t	t	t	f
a9bf4625-1bf5-4064-8cbb-7ab71cbb5ba9	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Other Allowance	OTHER_ALLOWANCE	EARNING	PERCENTAGE	10	CTC * 0.10	t	f	f	f
0be92a59-c89c-497d-8fd3-07d06104fd0e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Bonus	BONUS	EARNING	FLAT	0	\N	t	f	f	t
17c2d1b2-d275-453f-b2ac-bff7cb9a0fbe	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Commission	COMMISSION	EARNING	FLAT	0	\N	t	f	t	t
60eec0e7-4d1f-4916-99ec-ae050002f09e	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Leave Encashment	LEAVE_ENCASHMENT	EARNING	FLAT	0	\N	t	f	f	t
ef121df4-2cc9-4592-81e7-6f1bc2f2acec	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Gratuity	GRATUITY	EARNING	FLAT	0	\N	t	f	f	t
51f35819-b732-498d-aefd-4563feec931f	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Overtime Allowance	OVERTIME_ALLOWANCE	EARNING	FLAT	0	\N	f	f	t	t
e5b0092f-709e-478f-9445-020223176e02	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Notice Pay	NOTICE_PAY	EARNING	FLAT	0	\N	t	f	f	t
0690a661-ab30-46d2-bcad-a8d22f1524a6	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Hold Salary	HOLD_SALARY	EARNING	FLAT	0	\N	t	f	f	t
ac6584e8-2cdc-4ecf-b94c-2afb60c6d297	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Provident Fund	PF_EMP	DEDUCTION	PERCENTAGE	12	BASIC * 0.12	t	f	f	f
bea304fe-2239-4d03-8aef-fa7dd7233592	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ESI	ESI_EMP	DEDUCTION	PERCENTAGE	0.75	GROSS * 0.0075	t	f	f	f
d15b49db-194c-4432-bf2f-e23707ca0234	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	Professional Tax	PT	DEDUCTION	FLAT	0	SLAB_BASED	t	f	f	f
8487d5ba-49a8-4494-9600-46691350d396	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	TDS	TDS	DEDUCTION	FLAT	0	SLAB_BASED	t	f	f	f
\.


--
-- Data for Name: SalaryRevision; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."SalaryRevision" (id, "tenantId", "employeeId", "oldCTC", "newCTC", "oldBasic", "newBasic", "effectiveFrom", reason, "approvedBy", "approvedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Shift; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Shift" (id, "tenantId", name, code, "startTime", "endTime", "breakDuration", "gracePeriodIn", "gracePeriodOut", "isNightShift", "isActive", "createdAt", "updatedAt") FROM stdin;
a3b2e79d-6d0c-4352-9047-78299bed272d	global	General Shift	GS	09:00:00	18:00:00	60	15	15	f	t	2026-02-08 19:17:22.681	2026-02-08 19:17:22.681
d3ed25c5-4729-4e82-a617-06f6ebe8b85a	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	General Shift	GS	09:00:00	18:00:00	60	15	15	f	t	2026-02-08 19:17:22.789	2026-02-08 19:17:22.789
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Student" (id, "tenantId", "sessionId", "firstName", "lastName", "admissionNo", "rollNo", email, phone, gender, dob, "bloodGroup", "biometricId", "batchId", "guardianId", "dateOfAdmission", status, address, city, state, "zipCode", photo, "transportRouteId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudentAttendance; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."StudentAttendance" (id, "tenantId", "studentId", date, status, remarks, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudentDocument; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."StudentDocument" (id, "studentId", "tenantId", title, type, url, "uploadedAt") FROM stdin;
\.


--
-- Data for Name: StudentFieldLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."StudentFieldLog" (id, "tenantId", "studentId", type, "timestamp", location, image, remarks, status, "routeId", "approvedBy", "approvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Subject; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Subject" (id, "tenantId", "courseId", name, code, type, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SyncLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."SyncLog" (id, "tenantId", status, message, "recordCount", "lastSyncTime", "createdAt") FROM stdin;
1f311b60-dd1d-4eac-a885-a9d671215f55	global	success	No new logs found	0	2026-02-08 19:30:00.887	2026-02-08 19:30:00.889
7001c1cf-5677-4dc6-b0ab-9ef114ea19ed	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	success	No new logs found	0	2026-02-08 19:30:00.891	2026-02-08 19:30:00.892
6574fe05-4a5f-4612-9b4f-f0f3b994228b	global	success	No new logs found	0	2026-02-08 19:45:00.896	2026-02-08 19:45:00.899
d51d4254-2de2-416d-91a6-6d4c051c5a7b	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	success	No new logs found	0	2026-02-08 19:45:00.9	2026-02-08 19:45:00.901
ce892097-2dff-4467-9860-d399941c1658	global	success	No new logs found	0	2026-02-08 20:00:00.741	2026-02-08 20:00:00.743
214175d4-bc97-4af2-b6aa-91bdeea44d1d	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	success	No new logs found	0	2026-02-08 20:00:00.744	2026-02-08 20:00:00.746
62b986ba-d407-4384-8b08-9b523e0a993d	global	success	No new logs found	0	2026-02-08 20:15:00.621	2026-02-08 20:15:00.624
b5b3c0e0-dbe9-487a-85fa-4cc036c53289	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	success	No new logs found	0	2026-02-08 20:15:00.625	2026-02-08 20:15:00.627
eb522540-5ff4-4f19-8fa7-b3ac9b6efe18	global	success	No new logs found	0	2026-02-08 20:30:00.55	2026-02-08 20:30:00.553
29bba8a7-ac2d-4f2f-9a97-b824393dd676	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	success	No new logs found	0	2026-02-08 20:30:00.554	2026-02-08 20:30:00.555
\.


--
-- Data for Name: TDSDeclaration; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."TDSDeclaration" (id, "tenantId", "employeeId", "financialYear", ppf, elss, "lifeInsurance", "homeLoanPrincipal", "tuitionFees", nsc, "section80D", "section80E", "section80G", section24, "rentPaid", "landlordPAN", "taxRegime", status, "submittedAt", "approvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Tenant" (id, name, slug, code, domain, type, plan, modules, "isActive", "createdAt", "updatedAt", settings) FROM stdin;
global	System Global	system	SYS	\N	CORPORATE	free	{attendance,leaves,employees}	t	2026-02-08 19:17:22.509	2026-02-08 19:17:22.509	\N
ec2b4fd7-453b-417b-80a1-6be1f14a4c48	ApexTime Default	apextime	AT	\N	CORPORATE	free	{attendance,leaves,employees,reports,core,payroll,devices}	t	2026-02-08 19:17:22.602	2026-02-08 19:17:22.602	{"biometric": {"port": 1433, "user": "essl", "server": "115.98.2.20", "database": "etimetracklite1"}}
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Ticket" (id, "tenantId", "employeeId", subject, description, category, priority, status, "assignedTo", resolution, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TimetableEntry; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."TimetableEntry" (id, "tenantId", "batchId", "subjectId", "teacherId", "dayOfWeek", "startTime", "endTime", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TrainingCourse; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."TrainingCourse" (id, "tenantId", title, description, category, duration, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TrainingSession; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."TrainingSession" (id, "tenantId", "courseId", "trainerName", "scheduledAt", location, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: TransportRoute; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."TransportRoute" (id, "tenantId", name, "vehicleNo", "driverName", "driverPhone", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."User" (id, "tenantId", username, email, password, role, "isActive", "createdAt", "updatedAt", "employeeId") FROM stdin;
1c6626e6-a7e9-409c-a050-aa9606e9fbbe	global	superadmin	\N	$2a$10$s4agJPS74TrLK5UgE9NOdeCzwcJqn4QRK344HswsKMKZIfLodPdJW	superadmin	t	2026-02-08 19:17:22.599	2026-02-08 19:17:22.599	\N
11a39d10-2e4f-4915-8d51-f8008578ecce	global	admin	\N	$2a$10$YOx85gN01FEkokDjCWBoVOUEhUIBBT8fl/oiW3d0NJbCynaWN4kcO	admin	t	2026-02-08 19:17:22.678	2026-02-08 19:17:22.678	\N
a62ee267-6557-4396-a1fc-21a5ea88ccb1	ec2b4fd7-453b-417b-80a1-6be1f14a4c48	admin	\N	$2a$10$ANe4oJq/whiuvYR9kn6q/OaZhXzorCY6AUJ8hVUkRKUCSnUqQAtsu	admin	t	2026-02-08 19:17:22.787	2026-02-08 19:17:22.787	\N
\.


--
-- Data for Name: Vendor; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."Vendor" (id, "tenantId", name, "contactPerson", email, phone, address, "taxId", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: VisitorLog; Type: TABLE DATA; Schema: public; Owner: apextime
--

COPY public."VisitorLog" (id, "tenantId", "fullName", phone, email, company, purpose, "hostId", "checkIn", "checkOut", "idProofType", "idProofNumber", status, remarks, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: AcademicSession AcademicSession_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AcademicSession"
    ADD CONSTRAINT "AcademicSession_pkey" PRIMARY KEY (id);


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: Appraisal Appraisal_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Appraisal"
    ADD CONSTRAINT "Appraisal_pkey" PRIMARY KEY (id);


--
-- Name: AssetAssignment AssetAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetAssignment"
    ADD CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY (id);


--
-- Name: AssetCategory AssetCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetCategory"
    ADD CONSTRAINT "AssetCategory_pkey" PRIMARY KEY (id);


--
-- Name: AssetRequest AssetRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetRequest"
    ADD CONSTRAINT "AssetRequest_pkey" PRIMARY KEY (id);


--
-- Name: Asset Asset_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceLog AttendanceLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Batch Batch_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Batch"
    ADD CONSTRAINT "Batch_pkey" PRIMARY KEY (id);


--
-- Name: Branch Branch_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_pkey" PRIMARY KEY (id);


--
-- Name: CTCStructure CTCStructure_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."CTCStructure"
    ADD CONSTRAINT "CTCStructure_pkey" PRIMARY KEY (id);


--
-- Name: Candidate Candidate_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: CompanyProfile CompanyProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."CompanyProfile"
    ADD CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY (id);


--
-- Name: Course Course_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: Designation Designation_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Designation"
    ADD CONSTRAINT "Designation_pkey" PRIMARY KEY (id);


--
-- Name: DeviceCommand DeviceCommand_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."DeviceCommand"
    ADD CONSTRAINT "DeviceCommand_pkey" PRIMARY KEY (id);


--
-- Name: DeviceLog DeviceLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."DeviceLog"
    ADD CONSTRAINT "DeviceLog_pkey" PRIMARY KEY (id);


--
-- Name: Device Device_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT "Device_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeDocument EmployeeDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeSalaryComponent EmployeeSalaryComponent_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeSalaryComponent"
    ADD CONSTRAINT "EmployeeSalaryComponent_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeShift EmployeeShift_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeShift"
    ADD CONSTRAINT "EmployeeShift_pkey" PRIMARY KEY (id);


--
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);


--
-- Name: ExamMark ExamMark_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ExamMark"
    ADD CONSTRAINT "ExamMark_pkey" PRIMARY KEY (id);


--
-- Name: FeeHead FeeHead_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeHead"
    ADD CONSTRAINT "FeeHead_pkey" PRIMARY KEY (id);


--
-- Name: FeeRecord FeeRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeRecord"
    ADD CONSTRAINT "FeeRecord_pkey" PRIMARY KEY (id);


--
-- Name: FeeStructure FeeStructure_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeStructure"
    ADD CONSTRAINT "FeeStructure_pkey" PRIMARY KEY (id);


--
-- Name: Feedback Feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_pkey" PRIMARY KEY (id);


--
-- Name: FieldLog FieldLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FieldLog"
    ADD CONSTRAINT "FieldLog_pkey" PRIMARY KEY (id);


--
-- Name: Goal Goal_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_pkey" PRIMARY KEY (id);


--
-- Name: Guardian Guardian_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_pkey" PRIMARY KEY (id);


--
-- Name: HikvisionLogs HikvisionLogs_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."HikvisionLogs"
    ADD CONSTRAINT "HikvisionLogs_pkey" PRIMARY KEY (id);


--
-- Name: Holiday Holiday_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Holiday"
    ADD CONSTRAINT "Holiday_pkey" PRIMARY KEY (id);


--
-- Name: JobOpening JobOpening_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."JobOpening"
    ADD CONSTRAINT "JobOpening_pkey" PRIMARY KEY (id);


--
-- Name: LeaveBalanceTransaction LeaveBalanceTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveBalanceTransaction"
    ADD CONSTRAINT "LeaveBalanceTransaction_pkey" PRIMARY KEY (id);


--
-- Name: LeaveBalance LeaveBalance_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveBalance"
    ADD CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY (id);


--
-- Name: LeaveEntry LeaveEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveEntry"
    ADD CONSTRAINT "LeaveEntry_pkey" PRIMARY KEY (id);


--
-- Name: LeaveType LeaveType_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveType"
    ADD CONSTRAINT "LeaveType_pkey" PRIMARY KEY (id);


--
-- Name: LibraryBook LibraryBook_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LibraryBook"
    ADD CONSTRAINT "LibraryBook_pkey" PRIMARY KEY (id);


--
-- Name: LoanDeduction LoanDeduction_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LoanDeduction"
    ADD CONSTRAINT "LoanDeduction_pkey" PRIMARY KEY (id);


--
-- Name: Loan Loan_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Loan"
    ADD CONSTRAINT "Loan_pkey" PRIMARY KEY (id);


--
-- Name: Location Location_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_pkey" PRIMARY KEY (id);


--
-- Name: MaintenanceLog MaintenanceLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."MaintenanceLog"
    ADD CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingTask OnboardingTask_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."OnboardingTask"
    ADD CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY (id);


--
-- Name: PayrollRun PayrollRun_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."PayrollRun"
    ADD CONSTRAINT "PayrollRun_pkey" PRIMARY KEY (id);


--
-- Name: PayrollSetting PayrollSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."PayrollSetting"
    ADD CONSTRAINT "PayrollSetting_pkey" PRIMARY KEY (id);


--
-- Name: Payroll Payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payroll"
    ADD CONSTRAINT "Payroll_pkey" PRIMARY KEY (id);


--
-- Name: Payslip Payslip_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payslip"
    ADD CONSTRAINT "Payslip_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: RawDeviceLog RawDeviceLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."RawDeviceLog"
    ADD CONSTRAINT "RawDeviceLog_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: ReimbursementEntry ReimbursementEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ReimbursementEntry"
    ADD CONSTRAINT "ReimbursementEntry_pkey" PRIMARY KEY (id);


--
-- Name: SalaryComponent SalaryComponent_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."SalaryComponent"
    ADD CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY (id);


--
-- Name: SalaryRevision SalaryRevision_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."SalaryRevision"
    ADD CONSTRAINT "SalaryRevision_pkey" PRIMARY KEY (id);


--
-- Name: Shift Shift_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_pkey" PRIMARY KEY (id);


--
-- Name: StudentAttendance StudentAttendance_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentAttendance"
    ADD CONSTRAINT "StudentAttendance_pkey" PRIMARY KEY (id);


--
-- Name: StudentDocument StudentDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentDocument"
    ADD CONSTRAINT "StudentDocument_pkey" PRIMARY KEY (id);


--
-- Name: StudentFieldLog StudentFieldLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentFieldLog"
    ADD CONSTRAINT "StudentFieldLog_pkey" PRIMARY KEY (id);


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY (id);


--
-- Name: Subject Subject_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_pkey" PRIMARY KEY (id);


--
-- Name: SyncLog SyncLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."SyncLog"
    ADD CONSTRAINT "SyncLog_pkey" PRIMARY KEY (id);


--
-- Name: TDSDeclaration TDSDeclaration_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TDSDeclaration"
    ADD CONSTRAINT "TDSDeclaration_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: TimetableEntry TimetableEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY (id);


--
-- Name: TrainingCourse TrainingCourse_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TrainingCourse"
    ADD CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY (id);


--
-- Name: TrainingSession TrainingSession_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TrainingSession"
    ADD CONSTRAINT "TrainingSession_pkey" PRIMARY KEY (id);


--
-- Name: TransportRoute TransportRoute_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TransportRoute"
    ADD CONSTRAINT "TransportRoute_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vendor Vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_pkey" PRIMARY KEY (id);


--
-- Name: VisitorLog VisitorLog_pkey; Type: CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."VisitorLog"
    ADD CONSTRAINT "VisitorLog_pkey" PRIMARY KEY (id);


--
-- Name: AcademicSession_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AcademicSession_tenantId_idx" ON public."AcademicSession" USING btree ("tenantId");


--
-- Name: Announcement_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Announcement_tenantId_idx" ON public."Announcement" USING btree ("tenantId");


--
-- Name: Appraisal_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Appraisal_employeeId_idx" ON public."Appraisal" USING btree ("employeeId");


--
-- Name: Appraisal_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Appraisal_tenantId_idx" ON public."Appraisal" USING btree ("tenantId");


--
-- Name: AssetAssignment_assetId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AssetAssignment_assetId_idx" ON public."AssetAssignment" USING btree ("assetId");


--
-- Name: AssetAssignment_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AssetAssignment_employeeId_idx" ON public."AssetAssignment" USING btree ("employeeId");


--
-- Name: AssetAssignment_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AssetAssignment_tenantId_idx" ON public."AssetAssignment" USING btree ("tenantId");


--
-- Name: AssetCategory_name_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "AssetCategory_name_tenantId_key" ON public."AssetCategory" USING btree (name, "tenantId");


--
-- Name: AssetCategory_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AssetCategory_tenantId_idx" ON public."AssetCategory" USING btree ("tenantId");


--
-- Name: AssetRequest_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AssetRequest_employeeId_idx" ON public."AssetRequest" USING btree ("employeeId");


--
-- Name: AssetRequest_status_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AssetRequest_status_idx" ON public."AssetRequest" USING btree (status);


--
-- Name: AssetRequest_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AssetRequest_tenantId_idx" ON public."AssetRequest" USING btree ("tenantId");


--
-- Name: Asset_categoryId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Asset_categoryId_idx" ON public."Asset" USING btree ("categoryId");


--
-- Name: Asset_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Asset_code_tenantId_key" ON public."Asset" USING btree (code, "tenantId");


--
-- Name: Asset_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Asset_tenantId_idx" ON public."Asset" USING btree ("tenantId");


--
-- Name: AttendanceLog_employeeId_date_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "AttendanceLog_employeeId_date_tenantId_key" ON public."AttendanceLog" USING btree ("employeeId", date, "tenantId");


--
-- Name: AuditLog_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "AuditLog_tenantId_idx" ON public."AuditLog" USING btree ("tenantId");


--
-- Name: Batch_courseId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Batch_courseId_idx" ON public."Batch" USING btree ("courseId");


--
-- Name: Batch_sessionId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Batch_sessionId_idx" ON public."Batch" USING btree ("sessionId");


--
-- Name: Batch_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Batch_tenantId_idx" ON public."Batch" USING btree ("tenantId");


--
-- Name: Branch_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Branch_code_tenantId_key" ON public."Branch" USING btree (code, "tenantId");


--
-- Name: CTCStructure_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "CTCStructure_effectiveFrom_idx" ON public."CTCStructure" USING btree ("effectiveFrom");


--
-- Name: CTCStructure_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "CTCStructure_employeeId_idx" ON public."CTCStructure" USING btree ("employeeId");


--
-- Name: CTCStructure_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "CTCStructure_tenantId_idx" ON public."CTCStructure" USING btree ("tenantId");


--
-- Name: Candidate_jobId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Candidate_jobId_idx" ON public."Candidate" USING btree ("jobId");


--
-- Name: Candidate_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Candidate_tenantId_idx" ON public."Candidate" USING btree ("tenantId");


--
-- Name: Category_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Category_code_tenantId_key" ON public."Category" USING btree (code, "tenantId");


--
-- Name: CompanyProfile_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "CompanyProfile_tenantId_key" ON public."CompanyProfile" USING btree ("tenantId");


--
-- Name: Course_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Course_tenantId_idx" ON public."Course" USING btree ("tenantId");


--
-- Name: Course_tenantId_name_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Course_tenantId_name_key" ON public."Course" USING btree ("tenantId", name);


--
-- Name: Department_code_branchId_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Department_code_branchId_tenantId_key" ON public."Department" USING btree (code, "branchId", "tenantId");


--
-- Name: Designation_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Designation_code_tenantId_key" ON public."Designation" USING btree (code, "tenantId");


--
-- Name: DeviceCommand_deviceId_status_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "DeviceCommand_deviceId_status_idx" ON public."DeviceCommand" USING btree ("deviceId", status);


--
-- Name: DeviceCommand_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "DeviceCommand_tenantId_idx" ON public."DeviceCommand" USING btree ("tenantId");


--
-- Name: DeviceLog_deviceId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "DeviceLog_deviceId_idx" ON public."DeviceLog" USING btree ("deviceId");


--
-- Name: DeviceLog_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "DeviceLog_employeeId_idx" ON public."DeviceLog" USING btree ("employeeId");


--
-- Name: DeviceLog_processed_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "DeviceLog_processed_idx" ON public."DeviceLog" USING btree (processed);


--
-- Name: DeviceLog_punchTime_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "DeviceLog_punchTime_idx" ON public."DeviceLog" USING btree ("punchTime");


--
-- Name: Device_deviceId_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Device_deviceId_tenantId_key" ON public."Device" USING btree ("deviceId", "tenantId");


--
-- Name: EmployeeDocument_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "EmployeeDocument_employeeId_idx" ON public."EmployeeDocument" USING btree ("employeeId");


--
-- Name: EmployeeDocument_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "EmployeeDocument_tenantId_idx" ON public."EmployeeDocument" USING btree ("tenantId");


--
-- Name: EmployeeSalaryComponent_employeeId_componentId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "EmployeeSalaryComponent_employeeId_componentId_key" ON public."EmployeeSalaryComponent" USING btree ("employeeId", "componentId");


--
-- Name: EmployeeShift_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "EmployeeShift_tenantId_idx" ON public."EmployeeShift" USING btree ("tenantId");


--
-- Name: Employee_employeeCode_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Employee_employeeCode_tenantId_key" ON public."Employee" USING btree ("employeeCode", "tenantId");


--
-- Name: Employee_sourceEmployeeId_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Employee_sourceEmployeeId_tenantId_key" ON public."Employee" USING btree ("sourceEmployeeId", "tenantId");


--
-- Name: ExamMark_studentId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "ExamMark_studentId_idx" ON public."ExamMark" USING btree ("studentId");


--
-- Name: ExamMark_subjectId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "ExamMark_subjectId_idx" ON public."ExamMark" USING btree ("subjectId");


--
-- Name: FeeHead_tenantId_name_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "FeeHead_tenantId_name_key" ON public."FeeHead" USING btree ("tenantId", name);


--
-- Name: FeeRecord_status_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "FeeRecord_status_idx" ON public."FeeRecord" USING btree (status);


--
-- Name: FeeRecord_studentId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "FeeRecord_studentId_idx" ON public."FeeRecord" USING btree ("studentId");


--
-- Name: Feedback_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Feedback_tenantId_idx" ON public."Feedback" USING btree ("tenantId");


--
-- Name: Feedback_toEmployeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Feedback_toEmployeeId_idx" ON public."Feedback" USING btree ("toEmployeeId");


--
-- Name: FieldLog_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "FieldLog_tenantId_idx" ON public."FieldLog" USING btree ("tenantId");


--
-- Name: Goal_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Goal_employeeId_idx" ON public."Goal" USING btree ("employeeId");


--
-- Name: Goal_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Goal_tenantId_idx" ON public."Goal" USING btree ("tenantId");


--
-- Name: Guardian_phone_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Guardian_phone_idx" ON public."Guardian" USING btree (phone);


--
-- Name: Guardian_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Guardian_tenantId_idx" ON public."Guardian" USING btree ("tenantId");


--
-- Name: Holiday_date_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Holiday_date_tenantId_key" ON public."Holiday" USING btree (date, "tenantId");


--
-- Name: JobOpening_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "JobOpening_tenantId_idx" ON public."JobOpening" USING btree ("tenantId");


--
-- Name: LeaveBalance_code_employeeId_year_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "LeaveBalance_code_employeeId_year_tenantId_key" ON public."LeaveBalance" USING btree (code, "employeeId", year, "tenantId");


--
-- Name: LeaveEntry_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "LeaveEntry_tenantId_idx" ON public."LeaveEntry" USING btree ("tenantId");


--
-- Name: LeaveType_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "LeaveType_code_tenantId_key" ON public."LeaveType" USING btree (code, "tenantId");


--
-- Name: LibraryBook_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "LibraryBook_tenantId_idx" ON public."LibraryBook" USING btree ("tenantId");


--
-- Name: LoanDeduction_loanId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "LoanDeduction_loanId_idx" ON public."LoanDeduction" USING btree ("loanId");


--
-- Name: Loan_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Loan_employeeId_idx" ON public."Loan" USING btree ("employeeId");


--
-- Name: Loan_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Loan_tenantId_idx" ON public."Loan" USING btree ("tenantId");


--
-- Name: Location_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Location_code_tenantId_key" ON public."Location" USING btree (code, "tenantId");


--
-- Name: MaintenanceLog_assetId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "MaintenanceLog_assetId_idx" ON public."MaintenanceLog" USING btree ("assetId");


--
-- Name: MaintenanceLog_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "MaintenanceLog_tenantId_idx" ON public."MaintenanceLog" USING btree ("tenantId");


--
-- Name: Notification_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Notification_tenantId_idx" ON public."Notification" USING btree ("tenantId");


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: OnboardingTask_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "OnboardingTask_employeeId_idx" ON public."OnboardingTask" USING btree ("employeeId");


--
-- Name: OnboardingTask_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "OnboardingTask_tenantId_idx" ON public."OnboardingTask" USING btree ("tenantId");


--
-- Name: PayrollRun_month_year_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "PayrollRun_month_year_tenantId_key" ON public."PayrollRun" USING btree (month, year, "tenantId");


--
-- Name: PayrollSetting_key_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "PayrollSetting_key_tenantId_key" ON public."PayrollSetting" USING btree (key, "tenantId");


--
-- Name: Payroll_employeeId_month_year_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Payroll_employeeId_month_year_tenantId_key" ON public."Payroll" USING btree ("employeeId", month, year, "tenantId");


--
-- Name: Payroll_status_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Payroll_status_idx" ON public."Payroll" USING btree (status);


--
-- Name: Payroll_tenantId_month_year_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Payroll_tenantId_month_year_idx" ON public."Payroll" USING btree ("tenantId", month, year);


--
-- Name: Payslip_employeeId_payrollRunId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Payslip_employeeId_payrollRunId_key" ON public."Payslip" USING btree ("employeeId", "payrollRunId");


--
-- Name: Project_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Project_code_tenantId_key" ON public."Project" USING btree (code, "tenantId");


--
-- Name: RawDeviceLog_deviceId_deviceUserId_timestamp_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "RawDeviceLog_deviceId_deviceUserId_timestamp_tenantId_key" ON public."RawDeviceLog" USING btree ("deviceId", "deviceUserId", "timestamp", "tenantId");


--
-- Name: RawDeviceLog_isProcessed_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "RawDeviceLog_isProcessed_idx" ON public."RawDeviceLog" USING btree ("isProcessed");


--
-- Name: RawDeviceLog_punchTime_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "RawDeviceLog_punchTime_idx" ON public."RawDeviceLog" USING btree ("punchTime");


--
-- Name: RawDeviceLog_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "RawDeviceLog_tenantId_idx" ON public."RawDeviceLog" USING btree ("tenantId");


--
-- Name: RawDeviceLog_userId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "RawDeviceLog_userId_idx" ON public."RawDeviceLog" USING btree ("userId");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: ReimbursementEntry_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "ReimbursementEntry_employeeId_idx" ON public."ReimbursementEntry" USING btree ("employeeId");


--
-- Name: ReimbursementEntry_payrollId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "ReimbursementEntry_payrollId_idx" ON public."ReimbursementEntry" USING btree ("payrollId");


--
-- Name: ReimbursementEntry_status_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "ReimbursementEntry_status_idx" ON public."ReimbursementEntry" USING btree (status);


--
-- Name: ReimbursementEntry_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "ReimbursementEntry_tenantId_idx" ON public."ReimbursementEntry" USING btree ("tenantId");


--
-- Name: SalaryComponent_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "SalaryComponent_code_tenantId_key" ON public."SalaryComponent" USING btree (code, "tenantId");


--
-- Name: SalaryRevision_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "SalaryRevision_employeeId_idx" ON public."SalaryRevision" USING btree ("employeeId");


--
-- Name: SalaryRevision_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "SalaryRevision_tenantId_idx" ON public."SalaryRevision" USING btree ("tenantId");


--
-- Name: Shift_code_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Shift_code_tenantId_key" ON public."Shift" USING btree (code, "tenantId");


--
-- Name: StudentAttendance_date_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "StudentAttendance_date_idx" ON public."StudentAttendance" USING btree (date);


--
-- Name: StudentAttendance_studentId_date_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "StudentAttendance_studentId_date_key" ON public."StudentAttendance" USING btree ("studentId", date);


--
-- Name: StudentDocument_studentId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "StudentDocument_studentId_idx" ON public."StudentDocument" USING btree ("studentId");


--
-- Name: StudentDocument_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "StudentDocument_tenantId_idx" ON public."StudentDocument" USING btree ("tenantId");


--
-- Name: StudentFieldLog_routeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "StudentFieldLog_routeId_idx" ON public."StudentFieldLog" USING btree ("routeId");


--
-- Name: StudentFieldLog_studentId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "StudentFieldLog_studentId_idx" ON public."StudentFieldLog" USING btree ("studentId");


--
-- Name: StudentFieldLog_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "StudentFieldLog_tenantId_idx" ON public."StudentFieldLog" USING btree ("tenantId");


--
-- Name: Student_batchId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Student_batchId_idx" ON public."Student" USING btree ("batchId");


--
-- Name: Student_guardianId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Student_guardianId_idx" ON public."Student" USING btree ("guardianId");


--
-- Name: Student_tenantId_admissionNo_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Student_tenantId_admissionNo_key" ON public."Student" USING btree ("tenantId", "admissionNo");


--
-- Name: Student_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Student_tenantId_idx" ON public."Student" USING btree ("tenantId");


--
-- Name: Subject_courseId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Subject_courseId_idx" ON public."Subject" USING btree ("courseId");


--
-- Name: Subject_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Subject_tenantId_idx" ON public."Subject" USING btree ("tenantId");


--
-- Name: SyncLog_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "SyncLog_tenantId_idx" ON public."SyncLog" USING btree ("tenantId");


--
-- Name: TDSDeclaration_employeeId_financialYear_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "TDSDeclaration_employeeId_financialYear_tenantId_key" ON public."TDSDeclaration" USING btree ("employeeId", "financialYear", "tenantId");


--
-- Name: TDSDeclaration_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TDSDeclaration_employeeId_idx" ON public."TDSDeclaration" USING btree ("employeeId");


--
-- Name: TDSDeclaration_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TDSDeclaration_tenantId_idx" ON public."TDSDeclaration" USING btree ("tenantId");


--
-- Name: Tenant_code_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Tenant_code_key" ON public."Tenant" USING btree (code);


--
-- Name: Tenant_domain_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Tenant_domain_key" ON public."Tenant" USING btree (domain);


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: Ticket_employeeId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Ticket_employeeId_idx" ON public."Ticket" USING btree ("employeeId");


--
-- Name: Ticket_status_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Ticket_status_idx" ON public."Ticket" USING btree (status);


--
-- Name: Ticket_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Ticket_tenantId_idx" ON public."Ticket" USING btree ("tenantId");


--
-- Name: TimetableEntry_batchId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TimetableEntry_batchId_idx" ON public."TimetableEntry" USING btree ("batchId");


--
-- Name: TimetableEntry_teacherId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TimetableEntry_teacherId_idx" ON public."TimetableEntry" USING btree ("teacherId");


--
-- Name: TrainingCourse_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TrainingCourse_tenantId_idx" ON public."TrainingCourse" USING btree ("tenantId");


--
-- Name: TrainingSession_courseId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TrainingSession_courseId_idx" ON public."TrainingSession" USING btree ("courseId");


--
-- Name: TrainingSession_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TrainingSession_tenantId_idx" ON public."TrainingSession" USING btree ("tenantId");


--
-- Name: TransportRoute_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "TransportRoute_tenantId_idx" ON public."TransportRoute" USING btree ("tenantId");


--
-- Name: User_employeeId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "User_employeeId_key" ON public."User" USING btree ("employeeId");


--
-- Name: User_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "User_tenantId_idx" ON public."User" USING btree ("tenantId");


--
-- Name: User_username_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "User_username_tenantId_key" ON public."User" USING btree (username, "tenantId");


--
-- Name: Vendor_name_tenantId_key; Type: INDEX; Schema: public; Owner: apextime
--

CREATE UNIQUE INDEX "Vendor_name_tenantId_key" ON public."Vendor" USING btree (name, "tenantId");


--
-- Name: Vendor_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "Vendor_tenantId_idx" ON public."Vendor" USING btree ("tenantId");


--
-- Name: VisitorLog_hostId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "VisitorLog_hostId_idx" ON public."VisitorLog" USING btree ("hostId");


--
-- Name: VisitorLog_tenantId_idx; Type: INDEX; Schema: public; Owner: apextime
--

CREATE INDEX "VisitorLog_tenantId_idx" ON public."VisitorLog" USING btree ("tenantId");


--
-- Name: AcademicSession AcademicSession_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AcademicSession"
    ADD CONSTRAINT "AcademicSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Announcement Announcement_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appraisal Appraisal_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Appraisal"
    ADD CONSTRAINT "Appraisal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appraisal Appraisal_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Appraisal"
    ADD CONSTRAINT "Appraisal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssetAssignment AssetAssignment_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetAssignment"
    ADD CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssetAssignment AssetAssignment_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetAssignment"
    ADD CONSTRAINT "AssetAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssetAssignment AssetAssignment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetAssignment"
    ADD CONSTRAINT "AssetAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssetCategory AssetCategory_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetCategory"
    ADD CONSTRAINT "AssetCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssetRequest AssetRequest_assetCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetRequest"
    ADD CONSTRAINT "AssetRequest_assetCategoryId_fkey" FOREIGN KEY ("assetCategoryId") REFERENCES public."AssetCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssetRequest AssetRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetRequest"
    ADD CONSTRAINT "AssetRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssetRequest AssetRequest_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AssetRequest"
    ADD CONSTRAINT "AssetRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asset Asset_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."AssetCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asset Asset_parentAssetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Asset Asset_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asset Asset_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceLog AttendanceLog_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceLog AttendanceLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AttendanceLog"
    ADD CONSTRAINT "AttendanceLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Batch Batch_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Batch"
    ADD CONSTRAINT "Batch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Batch Batch_inchargeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Batch"
    ADD CONSTRAINT "Batch_inchargeId_fkey" FOREIGN KEY ("inchargeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Batch Batch_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Batch"
    ADD CONSTRAINT "Batch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."AcademicSession"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Batch Batch_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Batch"
    ADD CONSTRAINT "Batch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Branch Branch_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Branch Branch_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CTCStructure CTCStructure_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."CTCStructure"
    ADD CONSTRAINT "CTCStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CTCStructure CTCStructure_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."CTCStructure"
    ADD CONSTRAINT "CTCStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Candidate Candidate_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."JobOpening"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Candidate Candidate_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Category Category_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyProfile CompanyProfile_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."CompanyProfile"
    ADD CONSTRAINT "CompanyProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Course Course_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Department Department_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Department Department_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Designation Designation_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Designation"
    ADD CONSTRAINT "Designation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DeviceCommand DeviceCommand_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."DeviceCommand"
    ADD CONSTRAINT "DeviceCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public."Device"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DeviceCommand DeviceCommand_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."DeviceCommand"
    ADD CONSTRAINT "DeviceCommand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DeviceLog DeviceLog_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."DeviceLog"
    ADD CONSTRAINT "DeviceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public."Device"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DeviceLog DeviceLog_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."DeviceLog"
    ADD CONSTRAINT "DeviceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DeviceLog DeviceLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."DeviceLog"
    ADD CONSTRAINT "DeviceLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Device Device_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Device"
    ADD CONSTRAINT "Device_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeDocument EmployeeDocument_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeDocument EmployeeDocument_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeSalaryComponent EmployeeSalaryComponent_componentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeSalaryComponent"
    ADD CONSTRAINT "EmployeeSalaryComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES public."SalaryComponent"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeSalaryComponent EmployeeSalaryComponent_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeSalaryComponent"
    ADD CONSTRAINT "EmployeeSalaryComponent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeSalaryComponent EmployeeSalaryComponent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeSalaryComponent"
    ADD CONSTRAINT "EmployeeSalaryComponent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeShift EmployeeShift_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeShift"
    ADD CONSTRAINT "EmployeeShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeShift EmployeeShift_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeShift"
    ADD CONSTRAINT "EmployeeShift_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeShift EmployeeShift_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."EmployeeShift"
    ADD CONSTRAINT "EmployeeShift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Employee Employee_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_designationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES public."Designation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_managerOfDeptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_managerOfDeptId_fkey" FOREIGN KEY ("managerOfDeptId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_reportToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_reportToId_fkey" FOREIGN KEY ("reportToId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Employee Employee_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExamMark ExamMark_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ExamMark"
    ADD CONSTRAINT "ExamMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamMark ExamMark_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ExamMark"
    ADD CONSTRAINT "ExamMark_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExamMark ExamMark_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ExamMark"
    ADD CONSTRAINT "ExamMark_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeeHead FeeHead_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeHead"
    ADD CONSTRAINT "FeeHead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FeeRecord FeeRecord_structureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeRecord"
    ADD CONSTRAINT "FeeRecord_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES public."FeeStructure"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FeeRecord FeeRecord_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeRecord"
    ADD CONSTRAINT "FeeRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FeeRecord FeeRecord_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeRecord"
    ADD CONSTRAINT "FeeRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeeStructure FeeStructure_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeStructure"
    ADD CONSTRAINT "FeeStructure_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FeeStructure FeeStructure_headId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeStructure"
    ADD CONSTRAINT "FeeStructure_headId_fkey" FOREIGN KEY ("headId") REFERENCES public."FeeHead"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeeStructure FeeStructure_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FeeStructure"
    ADD CONSTRAINT "FeeStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Feedback Feedback_fromEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Feedback Feedback_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Feedback Feedback_toEmployeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FieldLog FieldLog_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FieldLog"
    ADD CONSTRAINT "FieldLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FieldLog FieldLog_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FieldLog"
    ADD CONSTRAINT "FieldLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldLog FieldLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."FieldLog"
    ADD CONSTRAINT "FieldLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Goal Goal_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Goal Goal_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Guardian Guardian_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Holiday Holiday_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Holiday"
    ADD CONSTRAINT "Holiday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JobOpening JobOpening_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."JobOpening"
    ADD CONSTRAINT "JobOpening_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveBalanceTransaction LeaveBalanceTransaction_leaveBalanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveBalanceTransaction"
    ADD CONSTRAINT "LeaveBalanceTransaction_leaveBalanceId_fkey" FOREIGN KEY ("leaveBalanceId") REFERENCES public."LeaveBalance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveBalance LeaveBalance_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveBalance"
    ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveBalance LeaveBalance_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveBalance"
    ADD CONSTRAINT "LeaveBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveEntry LeaveEntry_ceoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveEntry"
    ADD CONSTRAINT "LeaveEntry_ceoId_fkey" FOREIGN KEY ("ceoId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeaveEntry LeaveEntry_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveEntry"
    ADD CONSTRAINT "LeaveEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveEntry LeaveEntry_leaveTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveEntry"
    ADD CONSTRAINT "LeaveEntry_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES public."LeaveType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeaveEntry LeaveEntry_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveEntry"
    ADD CONSTRAINT "LeaveEntry_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeaveEntry LeaveEntry_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveEntry"
    ADD CONSTRAINT "LeaveEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveType LeaveType_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LeaveType"
    ADD CONSTRAINT "LeaveType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LibraryBook LibraryBook_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LibraryBook"
    ADD CONSTRAINT "LibraryBook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LoanDeduction LoanDeduction_loanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LoanDeduction"
    ADD CONSTRAINT "LoanDeduction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES public."Loan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LoanDeduction LoanDeduction_payrollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LoanDeduction"
    ADD CONSTRAINT "LoanDeduction_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES public."Payroll"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LoanDeduction LoanDeduction_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."LoanDeduction"
    ADD CONSTRAINT "LoanDeduction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Loan Loan_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Loan"
    ADD CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Loan Loan_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Loan"
    ADD CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Location Location_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MaintenanceLog MaintenanceLog_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."MaintenanceLog"
    ADD CONSTRAINT "MaintenanceLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MaintenanceLog MaintenanceLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."MaintenanceLog"
    ADD CONSTRAINT "MaintenanceLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OnboardingTask OnboardingTask_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."OnboardingTask"
    ADD CONSTRAINT "OnboardingTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OnboardingTask OnboardingTask_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."OnboardingTask"
    ADD CONSTRAINT "OnboardingTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PayrollRun PayrollRun_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."PayrollRun"
    ADD CONSTRAINT "PayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PayrollSetting PayrollSetting_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."PayrollSetting"
    ADD CONSTRAINT "PayrollSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payroll Payroll_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payroll"
    ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payroll Payroll_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payroll"
    ADD CONSTRAINT "Payroll_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public."PayrollRun"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payroll Payroll_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payroll"
    ADD CONSTRAINT "Payroll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payslip Payslip_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payslip"
    ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payslip Payslip_payrollRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payslip"
    ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES public."PayrollRun"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payslip Payslip_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Payslip"
    ADD CONSTRAINT "Payslip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RawDeviceLog RawDeviceLog_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."RawDeviceLog"
    ADD CONSTRAINT "RawDeviceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public."Device"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RawDeviceLog RawDeviceLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."RawDeviceLog"
    ADD CONSTRAINT "RawDeviceLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReimbursementEntry ReimbursementEntry_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ReimbursementEntry"
    ADD CONSTRAINT "ReimbursementEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReimbursementEntry ReimbursementEntry_payrollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ReimbursementEntry"
    ADD CONSTRAINT "ReimbursementEntry_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES public."Payroll"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ReimbursementEntry ReimbursementEntry_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."ReimbursementEntry"
    ADD CONSTRAINT "ReimbursementEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalaryComponent SalaryComponent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."SalaryComponent"
    ADD CONSTRAINT "SalaryComponent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalaryRevision SalaryRevision_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."SalaryRevision"
    ADD CONSTRAINT "SalaryRevision_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalaryRevision SalaryRevision_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."SalaryRevision"
    ADD CONSTRAINT "SalaryRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Shift Shift_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentAttendance StudentAttendance_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentAttendance"
    ADD CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentAttendance StudentAttendance_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentAttendance"
    ADD CONSTRAINT "StudentAttendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentDocument StudentDocument_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentDocument"
    ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentDocument StudentDocument_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentDocument"
    ADD CONSTRAINT "StudentDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentFieldLog StudentFieldLog_routeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentFieldLog"
    ADD CONSTRAINT "StudentFieldLog_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES public."TransportRoute"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StudentFieldLog StudentFieldLog_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentFieldLog"
    ADD CONSTRAINT "StudentFieldLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentFieldLog StudentFieldLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."StudentFieldLog"
    ADD CONSTRAINT "StudentFieldLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Student Student_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Student Student_guardianId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES public."Guardian"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Student Student_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."AcademicSession"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Student Student_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Student Student_transportRouteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_transportRouteId_fkey" FOREIGN KEY ("transportRouteId") REFERENCES public."TransportRoute"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Subject Subject_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Subject Subject_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SyncLog SyncLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."SyncLog"
    ADD CONSTRAINT "SyncLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TDSDeclaration TDSDeclaration_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TDSDeclaration"
    ADD CONSTRAINT "TDSDeclaration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TDSDeclaration TDSDeclaration_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TDSDeclaration"
    ADD CONSTRAINT "TDSDeclaration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TimetableEntry TimetableEntry_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TimetableEntry TimetableEntry_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TimetableEntry TimetableEntry_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimetableEntry TimetableEntry_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TrainingCourse TrainingCourse_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TrainingCourse"
    ADD CONSTRAINT "TrainingCourse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TrainingSession TrainingSession_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TrainingSession"
    ADD CONSTRAINT "TrainingSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."TrainingCourse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TrainingSession TrainingSession_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TrainingSession"
    ADD CONSTRAINT "TrainingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TransportRoute TransportRoute_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."TransportRoute"
    ADD CONSTRAINT "TransportRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vendor Vendor_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VisitorLog VisitorLog_hostId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."VisitorLog"
    ADD CONSTRAINT "VisitorLog_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VisitorLog VisitorLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: apextime
--

ALTER TABLE ONLY public."VisitorLog"
    ADD CONSTRAINT "VisitorLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict USejlY3RnoTGG10DoGh9SKgzbsrGiKYC8WposRCKQQQ9F2mELVLsdPb0zTKBm7w

