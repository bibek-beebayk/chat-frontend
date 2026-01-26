import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { apiClient } from '@/lib/api';
import styles from './ChangePasswordModal.module.css';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSuccess, onError }) => {
    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_new_password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.new_password !== formData.confirm_new_password) {
            onError("New passwords do not match");
            return;
        }

        if (formData.new_password.length < 6) {
            onError("New password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/api/auth/change-password/', formData);
            onSuccess("Password changed successfully");
            onClose();
            setFormData({ old_password: '', new_password: '', confirm_new_password: '' });
        } catch (err: any) {
            // Handle DRF error response structure which is usually { field: [errors] } or { detail: message }
            let errorMsg = "Failed to change password";
            if (err.response?.data) {
                const data = err.response.data;
                if (data.old_password) errorMsg = data.old_password[0];
                else if (data.confirm_new_password) errorMsg = data.confirm_new_password[0];
                else if (data.new_password) errorMsg = data.new_password[0];
                else if (data.detail) errorMsg = data.detail;
            }
            onError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Password"
        >
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label>Current Password</label>
                    <input
                        type="password"
                        name="old_password"
                        value={formData.old_password}
                        onChange={handleChange}
                        required
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>New Password</label>
                    <input
                        type="password"
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleChange}
                        required
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Confirm New Password</label>
                    <input
                        type="password"
                        name="confirm_new_password"
                        value={formData.confirm_new_password}
                        onChange={handleChange}
                        required
                        className={styles.input}
                    />
                </div>

                <div className={styles.actions}>
                    <button type="button" onClick={onClose} className={styles.cancelButton} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? 'Saving...' : 'Submit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
