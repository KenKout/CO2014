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
    const [customerCount, setCustomerCount] = useState<number>(0);
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
        name: '',
        user_type: 'Customer' as 'Customer' | 'Staff',
        salary: '',
        date_of_birth: '',
    });
    const [editUser, setEditUser] = useState({
        phone: '',
        name: '',
        salary: '',
        date_of_birth: '',
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
            const usersResponse = await api.get('/admin/users/');
            console.log('Users API Response:', usersResponse.data); // Log the response for debugging
            setUsers(usersResponse.data);
            
            const countResponse = await api.get('/admin/users/stats/customer-count');
            console.log('Customer Count API Response:', countResponse.data); // Log the response for debugging
            setCustomerCount(countResponse.data.count);
            
            setError(null);
        } catch (err: any) {
            console.error('Error fetching users or customer count:', err);
            let errorMessage = 'Failed to load users or customer count. Please try again.';
            if (err.response) {
                errorMessage += ` Status: ${err.response.status}.`;
                if (err.response.data && err.response.data.detail) {
                    errorMessage += ` Detail: ${err.response.data.detail}.`;
                }
            } else if (err.message) {
                errorMessage += ` Error: ${err.message}.`;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const userData: any = {
                username: newUser.username,
                password: newUser.password,
                phone: newUser.phone,
                name: newUser.name,
                user_type: newUser.user_type,
            };
            if (newUser.user_type === 'Staff' && newUser.salary) {
                userData.salary = parseInt(newUser.salary);
            }
            if (newUser.user_type === 'Customer' && newUser.date_of_birth) {
                userData.date_of_birth = newUser.date_of_birth;
            }
            console.log('Creating user with data:', userData); // Log the data for debugging
            await api.post('/admin/users/', userData);
            setShowAddModal(false);
            setNewUser({ 
                username: '', 
                password: '', 
                phone: '', 
                name: '',
                user_type: 'Customer',
                salary: '',
                date_of_birth: '',
            });
            fetchUsers(); // Refresh the list
        } catch (err: any) {
            console.error('Error creating user:', err);
            let errorMessage = 'Failed to create user. Please try again.';
            if (err.response) {
                errorMessage += ` Status: ${err.response.status}.`;
                if (err.response.data && err.response.data.detail) {
                    errorMessage += ` Detail: ${err.response.data.detail}.`;
                }
            }
            alert(errorMessage);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        try {
            const updateData: any = {
                phone: editUser.phone || undefined,
                name: editUser.name || undefined,
            };
            if (selectedUser.UserType === 'Staff' && editUser.salary) {
                updateData.salary = parseInt(editUser.salary);
            }
            if (selectedUser.UserType === 'Customer' && editUser.date_of_birth) {
                updateData.date_of_birth = editUser.date_of_birth;
            }
            console.log('Updating user with data:', updateData); // Log the data for debugging
            await api.put(`/admin/users/${selectedUser.Username}`, updateData);
            setShowEditModal(false);
            setSelectedUser(null);
            setEditUser({
                phone: '',
                name: '',
                salary: '',
                date_of_birth: '',
            });
            fetchUsers(); // Refresh the list
        } catch (err: any) {
            console.error('Error updating user:', err);
            let errorMessage = 'Failed to update user. Please try again.';
            if (err.response) {
                errorMessage += ` Status: ${err.response.status}.`;
                if (err.response.data && err.response.data.detail) {
                    errorMessage += ` Detail: ${err.response.data.detail}.`;
                }
            }
            alert(errorMessage);
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
            try {
                await api.delete(`/admin/users/${username}`);
                fetchUsers(); // Refresh the list
            } catch (err: any) {
                console.error('Error deleting user:', err);
                let errorMessage = 'Failed to delete user. Please try again.';
                if (err.response) {
                    errorMessage += ` Status: ${err.response.status}.`;
                    if (err.response.data && err.response.data.detail) {
                        errorMessage += ` Detail: ${err.response.data.detail}.`;
                    }
                }
                alert(errorMessage);
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
        } catch (err: any) {
            console.error('Error promoting user to staff:', err);
            let errorMessage = 'Failed to promote user to staff. Please try again.';
            if (err.response) {
                errorMessage += ` Status: ${err.response.status}.`;
                if (err.response.data && err.response.data.detail) {
                    errorMessage += ` Detail: ${err.response.data.detail}.`;
                }
            }
            alert(errorMessage);
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
        } catch (err: any) {
            console.error('Error promoting user to coach:', err);
            let errorMessage = 'Failed to promote user to coach. Please try again.';
            if (err.response) {
                errorMessage += ` Status: ${err.response.status}.`;
                if (err.response.data && err.response.data.detail) {
                    errorMessage += ` Detail: ${err.response.data.detail}.`;
                }
            }
            alert(errorMessage);
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setEditUser({
            phone: user.Phone || '',
            name: user.details?.Name || '',
            salary: user.UserType === 'Staff' && user.details?.Salary ? user.details.Salary.toString() : '',
            date_of_birth: user.UserType === 'Customer' && user.details?.Date_of_Birth ? user.details.Date_of_Birth : '',
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
                <div className={styles.stats}>
                    <span className={styles.totalCustomers}>Total Customers: {customerCount}</span>
                </div>
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
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
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
                            {newUser.user_type === 'Staff' && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="salary">Salary</label>
                                    <input
                                        type="number"
                                        id="salary"
                                        value={newUser.salary}
                                        onChange={(e) => setNewUser({...newUser, salary: e.target.value})}
                                        required
                                    />
                                </div>
                            )}
                            {newUser.user_type === 'Customer' && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="date_of_birth">Date of Birth</label>
                                    <input
                                        type="date"
                                        id="date_of_birth"
                                        value={newUser.date_of_birth}
                                        onChange={(e) => setNewUser({...newUser, date_of_birth: e.target.value})}
                                        required
                                    />
                                </div>
                            )}
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
                                <label htmlFor="editName">Name</label>
                                <input
                                    type="text"
                                    id="editName"
                                    value={editUser.name}
                                    onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="editPhone">Phone</label>
                                <input
                                    type="tel"
                                    id="editPhone"
                                    value={editUser.phone}
                                    onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                                />
                            </div>
                            {selectedUser.UserType === 'Staff' && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="editSalary">Salary</label>
                                    <input
                                        type="number"
                                        id="editSalary"
                                        value={editUser.salary}
                                        onChange={(e) => setEditUser({...editUser, salary: e.target.value})}
                                    />
                                </div>
                            )}
                            {selectedUser.UserType === 'Customer' && (
                                <div className={styles.formGroup}>
                                    <label htmlFor="editDateOfBirth">Date of Birth</label>
                                    <input
                                        type="date"
                                        id="editDateOfBirth"
                                        value={editUser.date_of_birth}
                                        onChange={(e) => setEditUser({...editUser, date_of_birth: e.target.value})}
                                    />
                                </div>
                            )}
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