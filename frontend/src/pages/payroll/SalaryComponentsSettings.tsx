import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Info } from 'lucide-react';
import payrollAPI from '../../services/payrollAPI';

const SalaryComponentsSettings = () => {
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Default initial data structure based on the screenshot
    const defaultData = [
        { id: 1, name: 'Basic', type: 'EARNING', calculationType: 'PERCENTAGE', value: 50, formula: 'CTC * 0.50', isEPF: true, isESI: true, status: true },
        { id: 2, name: 'House Rent Allowance', type: 'EARNING', calculationType: 'PERCENTAGE', value: 50, formula: 'BASIC * 0.50', isEPF: false, isESI: true, status: true },
        { id: 3, name: 'Conveyance Allowance', type: 'EARNING', calculationType: 'FLAT', value: 1600, formula: '1600', isEPF: true, isESI: false, status: true },
        { id: 4, name: 'Fixed Allowance', type: 'EARNING', calculationType: 'FLAT', value: 0, formula: 'REMAINING_CTC', isEPF: true, isESI: true, status: true },
        { id: 5, name: 'Bonus', type: 'EARNING', calculationType: 'VARIABLE', value: 0, formula: '0', isEPF: false, isESI: false, status: true },
    ];

    useEffect(() => {
        // In a real app, fetch from API
        // payrollAPI.getComponents().then(setComponents).catch(console.error).finally(() => setLoading(false));
        setComponents(defaultData); // Mock for now
        setLoading(false);
    }, []);

    const toggleStatus = (id) => {
        setComponents(components.map(c =>
            c.id === id ? { ...c, status: !c.status } : c
        ));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Salary Components</h2>
                    <p className="text-sm text-gray-500">Add or modify salary components.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
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
                                    {comp.calculationType === 'PERCENTAGE' && `Fixed; ${comp.value}% of ${comp.formula.split('*')[0].trim()}`}
                                    {comp.calculationType === 'FLAT' && `Fixed; Flat Amount`}
                                    {comp.calculationType === 'VARIABLE' && `Variable; Flat Amount`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    {comp.isEPF ? <span className="text-green-600 font-medium">Yes</span> : 'No'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    {comp.isESI ? <span className="text-green-600 font-medium">Yes</span> : 'No'}
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
                                    <button className="text-gray-400 hover:text-blue-600 mx-2"><Edit2 size={16} /></button>
                                    {/* <button className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button> */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Modal Placeholder */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Add Component</h3>
                        <p className="text-gray-500 mb-4">This feature will be fully enabled once the backend migration is complete.</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryComponentsSettings;
