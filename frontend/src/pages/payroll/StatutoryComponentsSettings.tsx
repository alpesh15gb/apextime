import React, { useState } from 'react';

const StatutoryComponentsSettings = () => {
    const [epfEnabled, setEpfEnabled] = useState(true);
    const [esiEnabled, setEsiEnabled] = useState(true);
    const [ptEnabled, setPtEnabled] = useState(true);

    const [modal, setModal] = useState<{ type: string; value: string } | null>(null);
    const [showTaxSlabs, setShowTaxSlabs] = useState(false);

    const openModal = (type: string) => {
        setModal({ type, value: '' });
    };

    const handleUpdate = () => {
        if (!modal) return;
        console.log(`Updated ${modal.type}: ${modal.value}`);
        setModal(null);
    };

    return (
        <div className="max-w-4xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Statutory Components</h2>

            {/* EPF SECTION */}
            <div className="bg-white border rounded-lg shadow-sm mb-6 p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-bold text-gray-900">Employees' Provident Fund (EPF)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={epfEnabled} onChange={() => setEpfEnabled(!epfEnabled)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                    EPF is a retirement benefit scheme for salaried employees. The employee and employer contribute 12% of the basic salary + DA each month.
                </p>
                <div className="w-full bg-gray-50 p-4 border rounded text-xs text-gray-600">
                    <span className="block font-bold mb-1">Current Configuration:</span>
                    PF Number: <span onClick={() => openModal('PF Number')} className="text-blue-600 cursor-pointer hover:underline">Update PF Number</span>
                    <br />
                    Deduction Cycle: Monthly
                </div>
            </div>

            {/* ESI SECTION */}
            <div className="bg-white border rounded-lg shadow-sm mb-6 p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-bold text-gray-900">Employees' State Insurance (ESI)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={esiEnabled} onChange={() => setEsiEnabled(!esiEnabled)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                    ESI is a self-financing social security and health insurance scheme for Indian workers.
                </p>
                <div className="w-full bg-gray-50 p-4 border rounded text-xs text-gray-600">
                    <span className="block font-bold mb-1">Current Configuration:</span>
                    ESI Number: <span onClick={() => openModal('ESI Number')} className="text-blue-600 cursor-pointer hover:underline">Update ESI Number</span>
                    <br />
                    Deduction Cycle: Monthly
                </div>
            </div>

            {/* PT SECTION */}
            <div className="bg-white border rounded-lg shadow-sm mb-6 p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-bold text-gray-900">Professional Tax (PT)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={ptEnabled} onChange={() => setPtEnabled(!ptEnabled)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                    This tax is levied on an employee's income by the State Government. Tax slabs differ in each state.
                </p>
                <div className="w-full bg-gray-50 p-4 border rounded text-xs text-gray-600">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block font-bold text-gray-700">Head Office</span>
                            <span className="block mt-1">State: <span className="text-gray-900 font-medium">Telangana</span></span>
                            <span className="block mt-1">PT Number: <span onClick={() => openModal('PT Number')} className="text-blue-600 cursor-pointer hover:underline">Update PT Number</span></span>
                        </div>
                        <div>
                            <span className="block font-bold text-gray-700">Deduction Cycle</span>
                            <span className="block mt-1">Monthly</span>
                            <span onClick={() => setShowTaxSlabs(true)} className="block mt-1 text-blue-600 cursor-pointer hover:underline">View Tax Slabs</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white w-full max-w-sm p-6 rounded-lg shadow-xl">
                        <h3 className="text-lg font-bold mb-4">{modal.type}</h3>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter New Number
                        </label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={`e.g. AB1234567`}
                            value={modal.value}
                            onChange={(e) => setModal({ ...modal, value: e.target.value })}
                        />
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                Cancel
                            </button>
                            <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAX SLABS MODAL */}
            {showTaxSlabs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Professional Tax Slabs (Telangana)</h3>
                        <div className="border rounded overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Monthly Gross Salary</th>
                                        <th className="px-4 py-2 text-right">Tax Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr><td className="px-4 py-2">Up to ₹15,000</td><td className="px-4 py-2 text-right">₹0</td></tr>
                                    <tr><td className="px-4 py-2">₹15,001 - ₹20,000</td><td className="px-4 py-2 text-right">₹150</td></tr>
                                    <tr><td className="px-4 py-2">₹20,001 Above</td><td className="px-4 py-2 text-right">₹200</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => setShowTaxSlabs(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StatutoryComponentsSettings;
