import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    fullWidth = true,
    rightElement,
    className = '',
    ...props
}) => {
    return (
        <div className={`${styles.inputGroup} ${fullWidth ? styles.fullWidth : ''}`}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.inputWrap}>
                <input
                    className={`${styles.input} ${rightElement ? styles.hasRightElement : ''} ${error ? styles.error : ''} ${className}`}
                    {...props}
                />
                {rightElement && <div className={styles.rightElement}>{rightElement}</div>}
            </div>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};
