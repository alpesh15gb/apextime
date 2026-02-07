import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, Info } from 'lucide-react';
import { payrollSettingsAPI } from '../../services/api';

const SalaryComponentsSettings = () => {
    const [components, setComponents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingComponent, setEditingComponent] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComponents();
    }, []);

    const loadComponents = async () => {
        try {
            const res = await payrollSettingsAPI.getComponents();
            setComponents(res.data);
        } catch (error) {
            console.error("Error loading components:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (comp: any) => {
        try {
            const updated = { ...comp, isActive: !comp.isActive };
            // Since backend update is strict PUT, we should send full object or specific endpoint
            // Our backend UPSERT supports full update
            // Wait, toggleStatus in table might be quick. Let's do API call.
            await payrollSettingsAPI.upsertComponent({
                ...comp,
                id: comp.id,
                isActive: !comp.isActive
            });
            // Optimistic update or reload? Reload is safer
            loadComponents();
        } catch (error) {
            console.error("Error toggling status:", error);
        }
    };

    const handleEdit = (comp: any) => {
        setEditingComponent(comp);
        setShowModal(true);
    };

    const handleAddNew = () => {
        setEditingComponent(null);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const form = e.target as any;

        // Extract values
        const name = form.name.value;
        const nameInPayslip = form.nameInPayslip.value;
        const type = form.type.value; // For new: read from input, for edit: it's hidden/readonly but should be preserved
        // Wait, for NEW, how do we select Type? The mock had it hardcoded or assumed.
        // Let's allow selecting Type for new.
        const typeValue = editingComponent ? editingComponent.type : form.type_select ? form.type_select.value : 'EARNING';

        const calculationType = form.calculationType.value; // FLAT or PERCENTAGE
        const value = parseFloat(form.value.value) || 0;

        const isPartOfStructure = form.isPartOfStructure?.checked || false;
        const isTaxable = form.isTaxable?.checked || false;
        const isProRata = form.isProRata?.checked || false;
        const isEPF = form.isEPF?.checked || false;
        const epfConfig = form.epfConfig?.value || 'NEVER';
        const isESI = form.isESI?.checked || false;
        const showInPayslip = form.showInPayslip?.checked || false;
        const isActive = form.isActive?.checked || true;

        const payload = {
            id: editingComponent ? editingComponent.id : undefined,
            name,
            nameInPayslip, // Note: Schema update needed for this if we want to persist properly, currently mostly frontend only or mapped to name
            type: typeValue,
            calculationType,
            value,
            formula: calculationType === 'FLAT' ? value.toString() : `CTC * ${value / 100}`, // Basic formula gen
            isActive,
            isEPF,
            isESI,
            isVariable: false, // Default for now
            // Extra frontend-only config that we might cram into a JSON field or ignore for now if backend doesn't support
            isPartOfStructure,
            isTaxable,
            isProRata,
            epfConfig,
            showInPayslip
        };

        try {
            await payrollSettingsAPI.upsertComponent(payload);
            setShowModal(false);
            loadComponents();
        } catch (error) {
            console.error("Error saving component:", error);
            alert("Failed to save component");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Salary Components</h2>
                    <p className="text-sm text-gray-500">Customize earnings and deductions.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
                >
                    <Plus size={16} className="mr-2" />
                    Add Component
                </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculation</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">EPF</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ESI</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                        ) : components.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-4 text-gray-500">No components found. Add one to get started.</td></tr>
                        ) : components.map((comp) => (
                            <tr key={comp.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{comp.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comp.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {comp.calculationType === 'PERCENTAGE' && `${comp.value}% of CTC`}
                                    {comp.calculationType === 'FLAT' && `Flat ₹${comp.value}`}
                                    {comp.calculationType === 'VARIABLE' && `Variable`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    {comp.isEPFApplicable ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    {comp.isESIApplicable ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                        onClick={() => toggleStatus(comp)}
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${comp.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                    >
                                        {comp.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(comp)}
                                        className="text-gray-400 hover:text-blue-600 mx-2"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* HIGH FIDELITY EDIT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-800">
                                {editingComponent ? `Edit ${editingComponent.type === 'EARNING' ? 'Earning' : 'Deduction'}` : 'Add Component'}
                            </h3>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Basic Info */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Type <span className="text-red-500">*</span>
                                        </label>
                                        {editingComponent ? (
                                            <div className="mt-1 flex items-center">
                                                <input
                                                    type="text"
                                                    name="type"
                                                    defaultValue={editingComponent.type}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                                                    readOnly
                                                />
                                            </div>
                                        ) : (
                                            <select name="type_select" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                                <option value="EARNING">Earning</option>
                                                <option value="DEDUCTION">Deduction</option>
                                            </select>
                                        )}

                                        <div className="mt-2 bg-blue-50 text-blue-800 text-xs p-2 rounded flex items-start">
                                            <Info size={14} className="mr-1 mt-0.5 flex-shrink-0" />
                                            Fixed amount paid at the end of every month.
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {editingComponent?.type === 'DEDUCTION' || (!editingComponent) ? 'Component Name' : 'Earning Name'} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            defaultValue={editingComponent?.name}
                                            className="mt-1 block w-full border border-blue-400 ring-1 ring-blue-400 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Name in Payslip <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="nameInPayslip"
                                            defaultValue={editingComponent?.nameInPayslip || editingComponent?.name}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Calculation Type <span className="text-red-500">*</span>
                                        </label>
                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="calculationType"
                                                    value="FLAT"
                                                    defaultChecked={editingComponent?.calculationType === 'FLAT'}
                                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Flat Amount</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="calculationType"
                                                    value="PERCENTAGE"
                                                    defaultChecked={editingComponent?.calculationType === 'PERCENTAGE'}
                                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Percentage of CTC</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            {editingComponent?.calculationType === 'PERCENTAGE' ? 'Enter Percentage' : 'Enter Amount'}
                                        </label>
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <input
                                                type="number"
                                                name="value"
                                                defaultValue={editingComponent?.value}
                                                className="block w-full border border-gray-300 rounded-md py-2 px-3 pr-12 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                step="0.01"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 sm:text-sm">
                                                    {editingComponent?.calculationType === 'PERCENTAGE' ? '%' : '₹'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="flex items-center">
                                            <input type="checkbox" name="isActive" defaultChecked={editingComponent ? editingComponent.isActive : true} className="h-4 w-4 text-blue-600 rounded" />
                                            <span className="ml-2 text-sm text-gray-900">Mark this as Active</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Right Column: Other Configurations */}
                                <div className="space-y-5 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-8">
                                    <h4 className="text-md font-medium text-gray-900 border-b pb-2 mb-4">Other Configurations</h4>

                                    <label className="flex items-start">
                                        <input type="checkbox" name="isPartOfStructure" defaultChecked={editingComponent?.isPartOfStructure} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Make this earning a part of the employee's salary structure
                                        </span>
                                    </label>

                                    <label className="flex items-start">
                                        <input type="checkbox" name="isTaxable" defaultChecked={editingComponent?.isTaxable} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                                        <div className="ml-2">
                                            <span className="text-sm text-gray-700 block">This is a taxable earning</span>
                                            <span className="text-xs text-gray-500">The income tax amount will be divided equally and deducted every month across the financial year.</span>
                                        </div>
                                    </label>

                                    <label className="flex items-start">
                                        <input type="checkbox" name="isProRata" defaultChecked={editingComponent?.isProRata} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                                        <div className="ml-2">
                                            <span className="text-sm text-gray-700 block">Calculate on pro-rata basis</span>
                                            <span className="text-xs text-gray-500">Pay will be adjusted based on employee working days.</span>
                                        </div>
                                    </label>

                                    <div className="pt-2">
                                        <label className="flex items-center mb-2">
                                            <input type="checkbox" name="isEPF" defaultChecked={editingComponent?.isEPFApplicable} className="h-4 w-4 text-blue-600 rounded" />
                                            <span className="ml-2 text-sm text-gray-700 font-medium">Consider for EPF Contribution</span>
                                        </label>
                                        <div className="ml-6 space-y-2">
                                            <label className="flex items-center">
                                                <input type="radio" name="epfConfig" value="ALWAYS" defaultChecked={editingComponent?.epfConfig === 'ALWAYS'} className="h-3 w-3 text-blue-600" />
                                                <span className="ml-2 text-sm text-gray-600">Always</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="radio" name="epfConfig" value="IF_WAGE_LESS_THAN_15K" defaultChecked={editingComponent?.epfConfig === 'IF_WAGE_LESS_THAN_15K'} className="h-3 w-3 text-blue-600" />
                                                <span className="ml-2 text-sm text-gray-600">Only when PF Wage is less than ₹ 15,000 <Info size={12} className="inline text-gray-400" /></span>
                                            </label>
                                        </div>
                                    </div>

                                    <label className="flex items-start">
                                        <input type="checkbox" name="isESI" defaultChecked={editingComponent?.isESIApplicable} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                                        <span className="ml-2 text-sm text-gray-700">Consider for ESI Contribution</span>
                                    </label>

                                    <label className="flex items-start">
                                        <input type="checkbox" name="showInPayslip" defaultChecked={editingComponent?.showInPayslip} className="mt-1 h-4 w-4 text-blue-600 rounded" />
                                        <span className="ml-2 text-sm text-gray-700">Show this component in payslip</span>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-orange-50 px-6 py-3 border-t border-orange-100 flex items-start">
                                <div className="text-orange-800 text-xs">
                                    <span className="font-bold">Note:</span> Once you associate this component with an employee, you will only be able to edit the Name and Amount/Percentage. The changes you make to Amount/Percentage will apply only to new employees.
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 flex justify-start space-x-3 rounded-b-lg border-t border-gray-200">
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm flex items-center">
                                    {submitting ? 'Saving...' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium text-sm">Cancel</button>
                                <span className="flex-1 text-right text-xs text-red-500 mt-2">* indicates mandatory fields</span>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryComponentsSettings;
