import React, { useState, useEffect } from 'react';
import { HCMModulePage } from './HCMModulePage';

export const Recruitment: React.FC = () => {
    return <HCMModulePage title="Recruitment" items={[]} onAdd={() => alert('Add Job Opening')} />;
};

export const Performance: React.FC = () => {
    return <HCMModulePage title="Performance" items={[]} onAdd={() => alert('Add Goal')} />;
};

export const Expenses: React.FC = () => {
    return <HCMModulePage title="Expenses" items={[]} onAdd={() => alert('Add Expense')} />;
};

export const Training: React.FC = () => {
    return <HCMModulePage title="LMS (Training)" items={[]} onAdd={() => alert('Add Course')} />;
};

export const Helpdesk: React.FC = () => {
    return <HCMModulePage title="Helpdesk" items={[]} onAdd={() => alert('Create Ticket')} />;
};

export const Visitors: React.FC = () => {
    return <HCMModulePage title="Visitor Log" items={[]} onAdd={() => alert('Check-in Visitor')} />;
};

export const Onboarding: React.FC = () => {
    return <HCMModulePage title="Onboarding" items={[]} onAdd={() => alert('Assign Task')} />;
};
