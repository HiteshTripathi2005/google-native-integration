'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function ProfilePage() {
    const { user, logout, updateProfile, isLoading, error } = useAuthStore();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.user?.name || '',
        email: user?.user?.email || '',
    });

    console.log('user', user?.googleProfile);

    // Update form data when user data changes
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.user.name || '',
                email: user.user.email || '',
            });
        }
    }, [user]);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleSave = async () => {
        try {
            await updateProfile({ name: formData.name.trim() || undefined });
            setIsEditing(false);
        } catch (error) {
            console.error('Profile update error:', error);
            // Error is handled by the store
        }
    };

    const handleCancel = () => {
        setFormData({
            name: user?.user?.name || '',
            email: user?.user?.email || '',
        });
        setIsEditing(false);
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#212121]">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#212121] text-white">
            {/* Header */}
            <header className="bg-[#171717] border-b border-[#2F2F2F]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => router.push('/')}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ← Back to Chat
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#2F2F2F] rounded-lg transition-all duration-200"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg">
                    <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

                    {/* Profile Information */}
                    <div className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex items-center space-x-4">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                                {user?.user?.name ? user.user.name.charAt(0).toUpperCase() : user.user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">{user?.user?.name || 'No name set'}</h2>
                                <p className="text-gray-400">{user?.user?.email}</p>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-md px-3 py-2 text-white">
                                    {user?.user?.email}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                            </div>

                            {/* Name Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Full Name
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                    />
                                ) : (
                                    <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-md px-3 py-2 text-white">
                                        {user?.user?.name || 'No name set'}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-900 border border-red-700 p-4">
                                    <div className="text-sm text-red-300">{error}</div>
                                </div>
                            )}

                            {/* Account Information */}
                            <div className="border-t border-[#2F2F2F] pt-6">
                                <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Account Created
                                        </label>
                                        <div className="text-gray-400">
                                            {user?.user?.createdAt ? new Date(user?.user?.createdAt).toLocaleDateString() : 'Unknown'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            User ID
                                        </label>
                                        <div className="text-gray-400 font-mono text-sm">
                                            {user?.user?.id}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end items-center space-x-4 pt-6 border-t border-[#2F2F2F]">

                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isLoading}
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isLoading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                    >
                                        Edit Profile
                                    </button>
                                )}

                            </div>
                            <div>
                                <a href={`http://localhost:8080/google/google-auth?userId=${user?.user?.id}`} target="_blank" rel="noopener noreferrer">
                                    <button
                                        className={`px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-600 rounded-md hover:bg-gray-700 transition-colors ${user?.googleProfile ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {user?.googleProfile ? 'change google account' : 'Link Google Account'}
                                    </button>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
