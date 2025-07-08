import React, { useState } from 'react';
import { Student } from '../../../services/types';
import { useUserContext } from '../../../services/userContext';

type StudentProfileProps = {
  userName?: string;
  navigation?: any;
};
export const StudentProfile = ({ userName }: StudentProfileProps) => {
    const { user, userType } = useUserContext();
    if (userType !== 'student' || !user) return <div>Not a Student.</div>;
    const student = user as Student;

  const handleSave = () => {
    alert('Profile updated successfully!');
  };

  return (
    <div className="flex-1 bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>
        
        <div className="bg-gray-50 p-6 rounded-lg border mb-6">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
              <p className="text-gray-600">{user.contactNumber}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={user.username}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={user.contactNumber}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subjects
              </label>
              <textarea
                value={user.subjects?.map(sub => sub.subjectName).join(', ')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>  
          </div>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Save Changes
          </button>
          <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};