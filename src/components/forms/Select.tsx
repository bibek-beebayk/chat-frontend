import React from 'react';
import styles from './Select.module.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
    label,
    error,
    fullWidth = true,
    options,
    className = '',
    ...props
}) => {
    return (
        <div className={`${styles.selectGroup} ${fullWidth ? styles.fullWidth : ''}`}>
            {label && <label className={styles.label}>{label}</label>}
            <select
                className={`${styles.select} ${error ? styles.error : ''} ${className}`}
                {...props}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};
