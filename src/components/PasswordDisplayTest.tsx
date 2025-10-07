import React from 'react';

interface PasswordDisplayTestProps {
  password: string;
  email: string;
}

export const PasswordDisplayTest: React.FC<PasswordDisplayTestProps> = ({ password, email }) => {
  return (
    <div className="p-4 border rounded-lg bg-green-50">
      <h3 className="text-lg font-semibold text-green-800 mb-4">Password Display Test</h3>
      <div className="space-y-2">
        <div>
          <strong>Email:</strong> {email}
        </div>
        <div>
          <strong>Password:</strong> 
          <span className="ml-2 font-mono text-lg bg-gray-100 px-2 py-1 rounded border">
            {password}
          </span>
        </div>
      </div>
    </div>
  );
};
