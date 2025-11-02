import React from 'react';

interface PasswordDisplayTestProps {
  password: string;
  email: string;
}

export const PasswordDisplayTest: React.FC<PasswordDisplayTestProps> = ({ password, email }) => {
  return (
    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
      <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-4">Password Display Test</h3>
      <div className="space-y-2">
        <div>
          <strong>Email:</strong> {email}
        </div>
        <div>
          <strong>Password:</strong> 
          <span className="ml-2 font-mono text-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
            {password}
          </span>
        </div>
      </div>
    </div>
  );
};
