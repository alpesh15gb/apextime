import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

const SalaryComponentsSettings = () => {
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null);

    // Initial Data
    const defaultData = [
        { id: 1, name: 'Basic', type: 'EARNING', calculationType: 'PERCENTAGE', value: 50, formula: 'CTC * 0.50', isEPF: true, isESI: true, status: true },
        { id: 2, name: 'House Rent Allowance', type: 'EARNING', calculationType: 'PERCENTAGE', value: 50, formula: 'BASIC * 0.50', isEPF: false, isESI: true, status: true },
        { id: 3, name: 'Conveyance Allowance', type: 'EARNING', calculationType: 'FLAT', value: 1600, formula: '1600', isEPF: true, isESI: false, status: true },
        { id: 4, name: 'Fixed Allowance', type: 'EARNING', calculationType: 'FLAT', value: 0, formula: 'REMAINING_CTC', isEPF: true, isESI: true, status: true },
        { id: 5, name: 'Bonus', type: 'EARNING', calculationType: 'VARIABLE', value: 0, formula: '0', isEPF: false, isESI: false, status: true },
    ];

    useEffect(() => {
        setComponents(defaultData);
        setLoading(false);
    }, []);

    const toggleStatus = (id) => {
        setComponents(components.map(c =>
            c.id === id ? { ...c, status: !c.status } : c
        ));
    };

    const handleEdit = (comp) => {
        setEditingComponent(comp);
        setShowModal(true);
    };

    const handleAddNew = () => {
        setEditingComponent(null);
        setShowModal(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const form = e.target;

        // Simple mock save just to update UI for demo
        const name = form.name.value;
        const type = form.type.value;
        const calcType = form.calculationType.value;
        const isEPF = form.isEPF.checked;
        const isESI = form.isESI.checked;

        if (editingComponent) {
            setComponents(components.map(c =>
                c.id === editingComponent.id ? { ...c, name, type, calculationType: calcType, isEPF, isESI } : c
            ));
        } else {
            const newId = Math.max(...components.map(c => c.id)) + 1;
            setComponents([...components, {
                id: newId,
                name,
                type,
                calculationType: calcType,
                isEPF,
                isESI,
                status: true,
                value: 0,
                formula: '0'
            }]);
        }
        setShowModal(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Salary Components</h2>
                    <p className="text-sm text-gray-500">Add or modify salary components.</p>
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculation Type</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">EPF</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ESI</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                        ) : components.map((comp) => (
                            <tr key={comp.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{comp.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comp.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {comp.calculationType === 'PERCENTAGE' && `Fixed; ${comp.value}% of ${comp.formula?.split('*')[0]?.trim() || 'Custom'}`}
                                    {comp.calculationType === 'FLAT' && `Fixed; Flat Amount`}
                                    {comp.calculationType === 'VARIABLE' && `Variable; Flat Amount`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    {comp.isEPF ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    {comp.isESI ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                        onClick={() => toggleStatus(comp.id)}
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${comp.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                    >
                                        {comp.status ? 'Active' : 'Inactive'}
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

            {/* Edit/Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold mb-4">{editingComponent ? 'Edit Component' : 'Add Component'}</h3>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input name="name" defaultValue={editingComponent?.name} type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <select name="type" defaultValue={editingComponent?.type || 'EARNING'} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="EARNING">Earning</option>
                                            <option value="DEDUCTION">Deduction</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Calculation</label>
                                        <select name="calculationType" defaultValue={editingComponent?.calculationType || 'FLAT'} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="FLAT">Flat Amount</option>
                                            <option value="PERCENTAGE">Percentage</option>
                                            <option value="VARIABLE">Variable</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex space-x-6">
                                    <label className="flex items-center">
                                        <input type="checkbox" name="isEPF" defaultChecked={editingComponent?.isEPF} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                        <span className="ml-2 text-sm text-gray-700">Consider for EPF</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="checkbox" name="isESI" defaultChecked={editingComponent?.isESI} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                        <span className="ml-2 text-sm text-gray-700">Consider for ESI</span>
                                    </label>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">Cancel</button>
                                <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryComponentsSettings;
