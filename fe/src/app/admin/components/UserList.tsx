// src/app/admin/components/UserList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createApiClient } from '@/utils/api';
import styles from '@/styles/Admin.module.css';

interface User {
    Username: string;
    Phone?: string;
    UserType: 'Customer' | 'Staff';
    JoinDate?: string;
    details?: {
        CustomerID?: number;
        Name?: string;
        Date_of_Birth?: string;
        StaffID?: number;
        Salary?: number;
    };
}

const UserList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPromoteCoachModal, setShowPromoteCoachModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        phone: '',
        user_type: 'Customer' as 'Customer' | 'Staff',
    });
    const [editUser, setEditUser] = useState({
        phone: '',
    });
    const [promoteCoachData, setPromoteCoachData] = useState({
        description: '',
        image_url: '',
    });

    // Get token from your auth context or localStorage
    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("auth_token")
            : null;
    const api = createApiClient(token);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users/');
            setUsers(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const userData = {
                username: newUser.username,
                password: newUser.password,
                phone: newUser.phone,
                user_type: newUser.user_type,
            };
            await api.post('/admin/users/', userData);
            setShowAddModal(false);
            setNewUser({ 
                username: '', 
                password: '', 
                phone: '', 
                user_type: 'Customer',
            });
            fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error creating user:', err);
            alert('Failed to create user. Please try again.');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            const updateData = {
                phone: editUser.phone || undefined,
            };
            await api.put(`/admin/users/${selectedUser.Username}`, updateData);
            setShowEditModal(false);
            setSelectedUser(null);
            setEditUser({
                phone: '',
            });
            fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error updating user:', err);
            alert('Failed to update user. Please try again.');
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
            try {
                await api.delete(`/admin/users/${username}`);
                fetchUsers(); // Refresh the list
            } catch (err) {
                console.error('Error deleting user:', err);
                alert('Failed to delete user. Please try again.');
            }
        }
    };

    const handlePromoteToStaff = async (username: string) => {
        try {
            const salary = prompt("Enter salary for the new staff member:");
            if (salary && parseInt(salary) > 0) {
                await api.put(`/admin/users/${username}/promote/staff`, { salary: parseInt(salary) });
                fetchUsers(); // Refresh the list
            } else {
                alert('Invalid salary value.');
            }
        } catch (err) {
            console.error('Error promoting user to staff:', err);
            alert('Failed to promote user to staff. Please try again.');
        }
    };

    const handlePromoteToCoach = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            await api.put(`/admin/users/${selectedUser.Username}/promote/coach`, promoteCoachData);
            setShowPromoteCoachModal(false);
            setPromoteCoachData({
                description: '',
                image_url: '',
            });
            setSelectedUser(null);
            fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error promoting user to coach:', err);
            alert('Failed to promote user to coach. Please try again.');
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setEditUser({
            phone: user.Phone || '',
        });
        setShowEditModal(true);
    };

    const openPromoteCoachModal = (user: User) => {
        setSelectedUser(user);
        setShowPromoteCoachModal(true);
    };

    if (loading) return <div className={styles.loadingIndicator}>Loading users...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.listContainer}>
            <div className={styles.listHeader}>
                <h2>User Management</h2>
                <button 
                    className={styles.addButton}
                    onClick={() => setShowAddModal(true)}
                >
                    Add New User
                </button>
            </div>

            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Phone</th>
                        <th>User Type</th>
                        <th>Join Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.Username}>
                            <td>{user.Username}</td>
                            <td>{user.Phone || 'N/A'}</td>
                            <td>
                                <span className={user.UserType === 'Staff' ? styles.roleBadge : ''}>
                                    {user.UserType}
                                </span>
                            </td>
                            <td>{user.JoinDate ? new Date(user.JoinDate).toLocaleDateString() : 'N/A'}</td>
                            <td>
                                <button 
                                    className={styles.actionButton}
                                    onClick={() => openEditModal(user)}
                                >
                                    Edit
                                </button>
                                {user.UserType !== 'Staff' && (
                                    <button 
                                        className={`${styles.actionButton} ${styles.promoteButton}`}
                                        onClick={() => handlePromoteToStaff(user.Username)}
                                    >
                                        Promote to Staff
                                    </button>
                                )}
                                {user.UserType === 'Staff' && (
                                    <button 
                                        className={`${styles.actionButton} ${styles.promoteButton}`}
                                        onClick={() => openPromoteCoachModal(user)}
                                    >
                                        Promote to Coach
                                    </button>
                                )}
                                <button 
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={() => handleDeleteUser(user.Username)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {users.length === 0 && !loading && <div className={styles.emptyMessage}>No users found.</div>}

            {/* Add User Modal */}
            {showAddModal && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Add New User</h3>
                        <form onSubmit={handleCreateUser}>
                            <div className={styles.formGroup}>
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="phone">Phone</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={newUser.phone}
                                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="userType">User Type</label>
                                <select
                                    id="userType"
                                    value={newUser.user_type}
                                    onChange={(e) => setNewUser({...newUser, user_type: e.target.value as 'Customer' | 'Staff'})}
                                >
                                    <option value="Customer">Customer</option>
                                    <option value="Staff">Staff</option>
                                </select>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Edit User: {selectedUser.Username}</h3>
                        <form onSubmit={handleUpdateUser}>
                            <div className={styles.formGroup}>
                                <label htmlFor="editPhone">Phone</label>
                                <input
                                    type="tel"
                                    id="editPhone"
                                    value={editUser.phone}
                                    onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit">Update User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Promote to Coach Modal */}
            {showPromoteCoachModal && selectedUser && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Promote to Coach: {selectedUser.Username}</h3>
                        <form onSubmit={handlePromoteToCoach}>
                            <div className={styles.formGroup}>
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={promoteCoachData.description}
                                    onChange={(e) => setPromoteCoachData({...promoteCoachData, description: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="image_url">Image URL</label>
                                <input
                                    type="url"
                                    id="image_url"
                                    value={promoteCoachData.image_url}
                                    onChange={(e) => setPromoteCoachData({...promoteCoachData, image_url: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowPromoteCoachModal(false)}>Cancel</button>
                                <button type="submit">Promote to Coach</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;