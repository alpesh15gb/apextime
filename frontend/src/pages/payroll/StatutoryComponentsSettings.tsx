import React, { useState } from 'react';

const StatutoryComponentsSettings = () => {
    const [epfEnabled, setEpfEnabled] = useState(true);
    const [esiEnabled, setEsiEnabled] = useState(true);
    const [ptEnabled, setPtEnabled] = useState(true);

    return (
        <div className="max-w-4xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Statutory Components</h2>

            <div className="bg-white border rounded-lg shadow-sm mb-6 p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-bold text-gray-900">Employees' Provident Fund (EPF)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={epfEnabled} onChange={() => setEpfEnabled(!epfEnabled)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                    EPF is a retirement benefit scheme for salaried employees. The employee and employer contribute 12% of the basic salary + DA each month.
                </p>
                <div className="w-full bg-gray-50 p-4 border rounded text-xs text-gray-600">
                    <span className="block font-bold mb-1">Current Configuration:</span>
                    PF Number: <span className="text-blue-600 cursor-pointer">Update PF Number</span>
                    <br />
                    Deduction Cycle: Monthly
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm mb-6 p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-bold text-gray-900">Employees' State Insurance (ESI)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={esiEnabled} onChange={() => setEsiEnabled(!esiEnabled)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                    ESI is a self-financing social security and health insurance scheme for Indian workers.
                </p>
                <div className="w-full bg-gray-50 p-4 border rounded text-xs text-gray-600">
                    <span className="block font-bold mb-1">Current Configuration:</span>
                    ESI Number: <span className="text-blue-600 cursor-pointer">Update ESI Number</span>
                    <br />
                    Deduction Cycle: Monthly
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm mb-6 p-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-md font-bold text-gray-900">Professional Tax (PT)</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={ptEnabled} onChange={() => setPtEnabled(!ptEnabled)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                            <span className="block mt-1">PT Number: <span className="text-blue-600 cursor-pointer">Update PT Number</span></span>
                        </div>
                        <div>
                            <span className="block font-bold text-gray-700">Deduction Cycle</span>
                            <span className="block mt-1">Monthly</span>
                            <span className="block mt-1 text-blue-600 cursor-pointer">View Tax Slabs</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default StatutoryComponentsSettings;
