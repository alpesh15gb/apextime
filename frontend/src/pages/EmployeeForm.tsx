import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, DollarSign, Building2, User, Phone, Mail, Fingerprint, Calendar, ShieldCheck, Briefcase, CreditCard } from 'lucide-react';
import { employeesAPI, departmentsAPI, branchesAPI, shiftsAPI, locationsAPI } from '../services/api';
import { EmployeeDocuments } from '../components/EmployeeDocuments';
import { EmployeeLoans } from '../components/EmployeeLoans';

export const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    branchId: '',
    locationId: '',
    departmentId: '',
    designationId: '',
    categoryId: '',
    shiftId: '',
    deviceUserId: '',
    dateOfJoining: '',
    isActive: true,
    basicSalary: 0,
    hra: 0,
    otherAllowances: 0,
    standardDeductions: 0,
    isPFEnabled: false,
    isESIEnabled: false,
    isOTEnabled: false,
    otRateMultiplier: 1.5,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    panNumber: '',
    aadhaarNumber: '',
  });

  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOptions();
    if (isEditing) {
      fetchEmployee();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [deptsRes, branchesRes, shiftsRes, locationsRes] = await Promise.all([
        departmentsAPI.getAll(),
        branchesAPI.getAll(),
        shiftsAPI.getAll(),
        locationsAPI.getAll(),
      ]);
      setDepartments(deptsRes.data);
      setBranches(branchesRes.data);
      setShifts(shiftsRes.data);
      setLocations(locationsRes.data);
    } catch (error) {
      console.error('Failed to fetch options:', error);
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getById(id!);
      const employee = response.data;
      setFormData({
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email || '',
        phone: employee.phone || '',
        branchId: employee.branchId || '',
        locationId: employee.locationId || '',
        departmentId: employee.departmentId || '',
        designationId: employee.designationId || '',
        categoryId: employee.categoryId || '',
        shiftId: employee.shiftId || '',
        deviceUserId: employee.deviceUserId || '',
        dateOfJoining: employee.dateOfJoining
          ? new Date(employee.dateOfJoining).toISOString().split('T')[0]
          : '',
        isActive: employee.isActive,
        basicSalary: employee.basicSalary || 0,
        hra: employee.hra || 0,
        otherAllowances: employee.otherAllowances || 0,
        standardDeductions: employee.standardDeductions || 0,
        isPFEnabled: employee.isPFEnabled || false,
        isESIEnabled: employee.isESIEnabled || false,
        isOTEnabled: employee.isOTEnabled || false,
        otRateMultiplier: employee.otRateMultiplier || 1.5,
        bankName: employee.bankName || '',
        accountNumber: employee.accountNumber || '',
        ifscCode: employee.ifscCode || '',
        panNumber: employee.panNumber || '',
        aadhaarNumber: employee.aadhaarNumber || '',
      });
    } catch (error) {
      console.error('Failed to fetch employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEditing) {
        await employeesAPI.update(id!, formData);
      } else {
        await employeesAPI.create(formData);
      }
      navigate('/employees');
    } catch (error: any) {
      console.error('Failed to save employee:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to sync personnel matrix';
      alert(`Critical Error: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600 border-opacity-20 border-r-2 border-r-blue-600"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Human Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/employees')}
            className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-50 transition-all shadow-sm group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {isEditing ? 'Modify Personnel' : 'Enroll Personnel'}
            </h1>
            <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">Core identity and payroll routing</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-blue-50 px-5 py-2.5 rounded-2xl border border-blue-100">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Encryption Active</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Identity Matrix */}
        <div className="app-card overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4" /> Personnel Identity
            </h3>
            {isEditing && (
              <div className="text-[10px] font-black bg-gray-900 text-white px-3 py-1 rounded-lg uppercase tracking-widest">{formData.employeeCode}</div>
            )}
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">System Code</label>
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                placeholder="e.g. APX-001"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">First Legal Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                placeholder="e.g. Rahul"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Surname</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                placeholder="e.g. Sharma"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="rahul@company.com"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact String</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="+91 98XXX XXXXX"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Biometric ID</label>
              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  name="deviceUserId"
                  value={formData.deviceUserId}
                  onChange={handleChange}
                  className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-black text-blue-600 text-sm"
                  placeholder="Device UID"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Organizational Routing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="app-card p-10 space-y-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Placement Matrix
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit / Branch</label>
                <select name="branchId" value={formData.branchId} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none">
                  <option value="">Select Branch</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Location / Site</label>
                <select name="locationId" value={formData.locationId} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none">
                  <option value="">Select Location</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none">
                  <option value="">Select Dept</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="app-card p-10 space-y-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Employment Lifecycle
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Joining Date</label>
                <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm" />
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Operational Shift</label>
                <select name="shiftId" value={formData.shiftId} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none">
                  <option value="">Choose Shift</option>
                  {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between p-5 bg-emerald-50/20 rounded-3xl border border-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Operational Status</span>
              </div>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-6 h-6 rounded-lg text-emerald-600 border-emerald-200 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Salary Matrix */}
        <div className="app-card pb-10 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Financial Ratios</h3>
          </div>

          <div className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Basic Base</label>
                <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} className="w-full px-5 py-4 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-black text-gray-900 text-lg tracking-tight" />
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">HRA Allocation</label>
                <input type="number" name="hra" value={formData.hra} onChange={handleChange} className="w-full px-5 py-4 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-black text-gray-900 text-lg tracking-tight" />
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Allowances</label>
                <input type="number" name="otherAllowances" value={formData.otherAllowances} onChange={handleChange} className="w-full px-5 py-4 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-black text-gray-900 text-lg tracking-tight" />
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Statutory Deductions</label>
                <input type="number" name="standardDeductions" value={formData.standardDeductions} onChange={handleChange} className="w-full px-5 py-4 bg-red-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-black text-red-600 text-lg tracking-tight" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 bg-gray-50/50 rounded-[40px] border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Provident Fund</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">12% Contribution</p>
                </div>
                <input type="checkbox" name="isPFEnabled" checked={formData.isPFEnabled} onChange={handleChange} className="w-6 h-6 rounded-lg text-emerald-600" />
              </div>
              <div className="flex items-center justify-between border-x border-gray-100 px-8">
                <div>
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">ESI Security</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">Statutory Coverage</p>
                </div>
                <input type="checkbox" name="isESIEnabled" checked={formData.isESIEnabled} onChange={handleChange} className="w-6 h-6 rounded-lg text-emerald-600" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Overtime Control</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">multiplier {formData.otRateMultiplier}x</p>
                </div>
                <input type="checkbox" name="isOTEnabled" checked={formData.isOTEnabled} onChange={handleChange} className="w-6 h-6 rounded-lg text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Banking Matrix */}
        <div className="app-card overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Banking & Identity Hub</h3>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Financial Institution</label>
              <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm" placeholder="e.g. HDFC Bank" />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Sequence</label>
              <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm" placeholder="Enter A/C" />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">IFSC Identifier</label>
              <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm uppercase" placeholder="Enter IFSC" />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">PAN Legal</label>
              <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm uppercase" placeholder="ABCDE1234F" />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Aadhaar UID</label>
              <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm" placeholder="1234 5678 9012" />
            </div>
          </div>
        </div>

        {/* Documents Section (Only when editing) */}
        {isEditing && id && (
          <EmployeeDocuments employeeId={id} />
        )}

        {/* Loans Section (Only when editing) */}
        {isEditing && id && (
          <EmployeeLoans employeeId={id} />
        )}

        {/* Action Footer */}

        {/* Action Footer */}
        <div className="flex justify-end items-center gap-6 pt-10">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-10 py-5 bg-white border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-gray-50 transition-all"
          >
            Cancel Session
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-12 py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all flex items-center space-x-3"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
            <span>{isEditing ? 'Sync Profile' : 'Commit Enrollment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
