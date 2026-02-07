import React, { useState, useEffect } from 'react';
import { payrollSettingsAPI } from '../../services/api';

const PayScheduleSettings = () => {
    const [workWeek, setWorkWeek] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    const [calculateBasis, setCalculateBasis] = useState('actual');
    const [cycleStartDay, setCycleStartDay] = useState(5);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(''); // 'saved' | ''
    const [loading, setLoading] = useState(true);

    // Mock days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await payrollSettingsAPI.getConfig();
            const config = res.data;
            if (config.PAY_SCHEDULE) {
                const schedule = config.PAY_SCHEDULE;
                setWorkWeek(schedule.workWeek || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                setCalculateBasis(schedule.calculateBasis || 'actual');
                setCycleStartDay(schedule.cycleStartDay || 5);
            }
        } catch (error) {
            console.error("Error loading payroll config:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (day) => {
        if (workWeek.includes(day)) {
            setWorkWeek(workWeek.filter(d => d !== day));
        } else {
            setWorkWeek([...workWeek, day]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('');

        try {
            const payload = {
                PAY_SCHEDULE: {
                    workWeek,
                    calculateBasis,
                    cycleStartDay
                }
            };
            await payrollSettingsAPI.saveConfig(payload);
            setSaveStatus('saved');
        } catch (error) {
            console.error("Error saving config:", error);
        } finally {
            setSaving(false);
            // Clear success message after 2 seconds
            setTimeout(() => {
                setSaveStatus('');
            }, 2000);
        }
    };

    if (loading) return <div className="p-4 text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Pay Schedule</h2>

            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select your work week*</label>
                <div className="flex space-x-2">
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${workWeek.includes(day)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">The days worked in a calendar week.</p>
            </div>

            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Calculate monthly salary based on*</label>
                <div className="space-y-3">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="calcBasis"
                            value="actual"
                            checked={calculateBasis === 'actual'}
                            onChange={() => setCalculateBasis('actual')}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Actual days in a month</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="calcBasis"
                            value="fixed"
                            checked={calculateBasis === 'fixed'}
                            onChange={() => setCalculateBasis('fixed')}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Organization working days - <span className="text-gray-400 italic">Select days</span> per month</span>
                    </label>
                </div>
            </div>

            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Pay on*</label>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Day</span>
                    <select
                        value={cycleStartDay}
                        onChange={(e) => setCycleStartDay(parseInt(e.target.value))}
                        className="mt-1 block w-20 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        {[...Array(31)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                    </select>
                    <span className="text-sm text-gray-700">of every month</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Note: When payday falls on a non-working day or a holiday, employees will get paid on the previous working day.</p>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center shadow-sm ${saveStatus === 'saved'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {saving ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
            </button>
        </div>
    );
};

export default PayScheduleSettings;
