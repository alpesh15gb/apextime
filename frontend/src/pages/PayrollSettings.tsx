import React, { useState } from 'react';
import { Settings, DollarSign, Briefcase, Calendar } from 'lucide-react';

// Sub-components (could be separate files, inline for now)
import PayScheduleSettings from './payroll/PayScheduleSettings';
import SalaryComponentsSettings from './payroll/SalaryComponentsSettings';
import StatutoryComponentsSettings from './payroll/StatutoryComponentsSettings';

const PayrollSettings = () => {
    const [activeTab, setActiveTab] = useState('schedule');

    const tabs = [
        { id: 'schedule', label: 'Pay Schedule', icon: Calendar },
        { id: 'components', label: 'Salary Components', icon: DollarSign },
        { id: 'statutory', label: 'Statutory Components', icon: Briefcase },
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Payroll Settings</h1>

            <div className="flex space-x-1 mb-6 border-b border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <Icon size={16} className="mr-2" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                {activeTab === 'schedule' && <PayScheduleSettings />}
                {activeTab === 'components' && <SalaryComponentsSettings />}
                {activeTab === 'statutory' && <StatutoryComponentsSettings />}
            </div>
        </div>
    );
};

export default PayrollSettings;
