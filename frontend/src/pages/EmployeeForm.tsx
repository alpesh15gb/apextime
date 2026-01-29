import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';
import { employeesAPI, departmentsAPI, branchesAPI, shiftsAPI } from '../services/api';

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
    departmentId: '',
    designationId: '',
    categoryId: '',
    shiftId: '',
    deviceUserId: '',
    dateOfJoining: '',
    isActive: true,
    basicSalary: 0,
    hra: 0,
    totalAllowances: 0,
    standardDeductions: 0,
  });

  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
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
      const [deptsRes, branchesRes, shiftsRes] = await Promise.all([
        departmentsAPI.getAll(),
        branchesAPI.getAll(),
        shiftsAPI.getAll(),
      ]);
      setDepartments(deptsRes.data);
      setBranches(branchesRes.data);
      setShifts(shiftsRes.data);
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
        totalAllowances: employee.totalAllowances || 0,
        standardDeductions: employee.standardDeductions || 0,
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
    } catch (error) {
      console.error('Failed to save employee:', error);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Employee' : 'Add Employee'}
        </h1>
      </div>

      <div className="card max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Code */}
            <div>
              <label className="form-label">Employee Code *</label>
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            {/* First Name */}
            <div>
              <label className="form-label">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="form-label">Branch</label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select Branch</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="form-label">Department</label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select Department</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift */}
            <div>
              <label className="form-label">Shift</label>
              <select
                name="shiftId"
                value={formData.shiftId}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select Shift</option>
                {shifts.map((shift: any) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
            </div>

            {/* Device User ID */}
            <div>
              <label className="form-label">Device User ID</label>
              <input
                type="text"
                name="deviceUserId"
                value={formData.deviceUserId}
                onChange={handleChange}
                className="form-input"
                placeholder="Biometric device user ID"
              />
            </div>

            {/* Date of Joining */}
            <div>
              <label className="form-label">Date of Joining</label>
              <input
                type="date"
                name="dateOfJoining"
                value={formData.dateOfJoining}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label className="ml-2 text-sm text-gray-700">Active</label>
            </div>
          </div>

          {/* Salary Structure Section */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Salary Structure
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="form-label">Basic Salary</label>
                <input
                  type="number"
                  name="basicSalary"
                  value={formData.basicSalary}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label">HRA</label>
                <input
                  type="number"
                  name="hra"
                  value={formData.hra}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label">Other Allowances</label>
                <input
                  type="number"
                  name="totalAllowances"
                  value={formData.totalAllowances}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label">Standard Deductions</label>
                <input
                  type="number"
                  name="standardDeductions"
                  value={formData.standardDeductions}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
