'use client'; // Mark this component as a Client Component

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createApiClient, API_BASE_URL } from '@/utils/api';
import styles from '@/styles/Login.module.css';
import Link from 'next/link';

export default function LoginPage() {
  // State for toggling between Login

  // State for Forgot Password Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState('email-step'); // email-step, otp-step, new-password-step, success-step

  // State for OTP inputs
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // State for Resend OTP Timer
  const [timer, setTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State for Form Inputs (example for login)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // State for Forgot Password flow
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isRecoveryEmailValid, setIsRecoveryEmailValid] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newPasswordStrength, setNewPasswordStrength] = useState({ score: 0, text: 'Password strength' });
  const [newPasswordsMatch, setNewPasswordsMatch] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState({ text: '', status: '' }); // status: '', verifying, success, error

  // State for Alerts
  const [loginAlert, setLoginAlert] = useState({ message: '', type: '', visible: false }); // type: 'error', 'success'

  // --- Event Handlers ---


  const clearAlerts = () => {
    setLoginAlert({ message: '', type: '', visible: false });
  };

  // Login Form Submission
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAlerts();
    try {
      const apiClient = createApiClient(null);
      const response = await apiClient.post('/auth/login', { username: loginEmail, password: loginPassword });
      if (response.ok) {
        const data = await response.json();
        const { login } = useAuth();
        login(data.access_token);
        setLoginAlert({ message: 'Login successful!', type: 'success', visible: true });
      } else {
        const errorData = await response.json();
        setLoginAlert({ message: errorData.detail || 'Login failed.', type: 'error', visible: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginAlert({ message: 'An error occurred during login.', type: 'error', visible: true });
    }
  };


  // Social Login Handlers (Placeholders)
  const handleSocialLogin = (provider: string) => {
      console.log(`${provider} login clicked`);
      alert(`${provider} login would be implemented with OAuth`);
      clearAlerts();
  };

  // Password Strength Calculation
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return { score: 0, text: 'Password strength' };

    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;
    score = Math.min(score, 100); // Cap at 100

    let text = 'Weak password';
    if (score >= 80) text = 'Very strong password';
    else if (score >= 60) text = 'Strong password';
    else if (score >= 30) text = 'Moderate password';

    return { score, text };
  };


  // Update new password strength on new password change
   useEffect(() => {
    setNewPasswordStrength(calculatePasswordStrength(newPassword));
    setNewPasswordsMatch(newPassword === confirmNewPassword || confirmNewPassword === '');
  }, [newPassword, confirmNewPassword]);

  // Email Validation
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Don't show error for empty field initially
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };


  useEffect(() => {
    setIsRecoveryEmailValid(validateEmail(recoveryEmail));
  }, [recoveryEmail]);

  // --- Forgot Password Modal Logic ---

  const openModal = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsModalVisible(true);
    setModalStep('email-step');
    // Reset modal state if needed
    resetForgotPasswordForm();
    clearAlerts();
  };

  const closeModal = () => {
    setIsModalVisible(false);
    resetForgotPasswordForm();
    clearAlerts();
  };

  const resetForgotPasswordForm = () => {
    setRecoveryEmail('');
    setIsRecoveryEmailValid(true);
    setOtp(new Array(6).fill(''));
    setNewPassword('');
    setConfirmNewPassword('');
    setNewPasswordStrength({ score: 0, text: 'Password strength' });
    setNewPasswordsMatch(true);
    setVerificationStatus({ text: '', status: '' });
    stopResendTimer();
    setTimer(60);
    setIsResendDisabled(true);
    setModalStep('email-step');
  };

  // Handle clicking outside the modal
  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  // Start Timer Function
  const startResendTimer = () => {
      stopResendTimer(); // Clear existing timer first
      setIsResendDisabled(true);
      setTimer(60);
      timerIntervalRef.current = setInterval(() => {
          setTimer((prevTimer) => {
              if (prevTimer <= 1) {
                  stopResendTimer();
                  setIsResendDisabled(false);
                  return 0;
              }
              return prevTimer - 1;
          });
      }, 1000);
  };

  // Stop Timer Function
  const stopResendTimer = () => {
      if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
      }
  };

  // Cleanup timer on component unmount
  useEffect(() => {
      return () => stopResendTimer();
  }, []);

  // Send OTP Button Handler
  const handleSendOtp = () => {
    if (!isRecoveryEmailValid || recoveryEmail === '') {
        setIsRecoveryEmailValid(false);
        // Optionally show an alert
        return;
    }
    console.log('Sending OTP to:', recoveryEmail);
    // TODO: Implement API call to send OTP
    setModalStep('otp-step');
    startResendTimer();
    setVerificationStatus({ text: '', status: '' });
    // Focus first OTP input after state update
    setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
  };

  // Resend OTP Handler
  const handleResendOtp = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    console.log('Resending OTP to:', recoveryEmail);
    // TODO: Implement API call to resend OTP
    setOtp(new Array(6).fill(''));
    setVerificationStatus({ text: '', status: '' });
    startResendTimer();
    setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
  };

  // OTP Input Change Handler
  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    const value = element.value.replace(/[^0-9]/g, ''); // Allow only digits
    if (value.length > 1) return; // Prevent multiple digits in one box

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move focus to next input
    if (value && index < otp.length - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    const completeOtp = newOtp.join('');
    if (completeOtp.length === otp.length) {
        verifyOtp(completeOtp);
    }
  };

  // OTP KeyDown Handler (for Backspace, Arrow keys)
  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    switch (e.key) {
      case 'Backspace':
        if (!otp[index] && index > 0) {
            // If current is empty, move to previous and focus
            otpInputsRef.current[index - 1]?.focus();
        }
        // If current has value, it will be cleared by `handleOtpChange` or default behavior
        break;
      case 'ArrowLeft':
        if (index > 0) {
            otpInputsRef.current[index - 1]?.focus();
            e.preventDefault();
        }
        break;
      case 'ArrowRight':
        if (index < otp.length - 1) {
            otpInputsRef.current[index + 1]?.focus();
            e.preventDefault();
        }
        break;
      default: break;
    }
  };

  // OTP Paste Handler
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
      const digits = pastedData.slice(0, otp.length).split('');
      const newOtp = [...otp];
      let focusIndex = 0;
      digits.forEach((digit, i) => {
          if (i < otp.length) {
              newOtp[i] = digit;
              focusIndex = i + 1;
          }
      });
      setOtp(newOtp);

      // Focus the next empty input or the last input
      const nextEmpty = newOtp.findIndex(val => val === '');
      if (nextEmpty !== -1) {
          otpInputsRef.current[nextEmpty]?.focus();
      } else if (focusIndex < otp.length) {
          otpInputsRef.current[focusIndex]?.focus();
      } else {
          otpInputsRef.current[otp.length - 1]?.focus();
      }

      // Check if OTP is complete after paste
      const completeOtp = newOtp.join('');
      if (completeOtp.length === otp.length) {
          verifyOtp(completeOtp);
      }
  };

  // Verify OTP
  const verifyOtp = (enteredOtp: string) => {
      console.log('Verifying OTP:', enteredOtp);
      setVerificationStatus({ text: 'Verifying...', status: 'verifying' });
      // TODO: Implement API call to verify OTP
      // Simulate API call
      setTimeout(() => {
          const isOtpValid = true; // Replace with actual API response
          if (isOtpValid) {
              setVerificationStatus({ text: 'Verification successful!', status: 'success' });
              setTimeout(() => {
                  setModalStep('new-password-step');
                  setVerificationStatus({ text: '', status: '' }); // Clear status for next step
              }, 1000);
          } else {
              setVerificationStatus({ text: 'Invalid OTP. Please try again.', status: 'error' });
              // Optionally clear OTP fields after error
              // setOtp(new Array(6).fill(''));
              // otpInputsRef.current[0]?.focus();
          }
      }, 1500);
  };

  // Reset Password Button Handler
  const handleResetPassword = () => {
    if (!newPasswordsMatch || newPassword === '' || newPassword.length < 8) {
        alert('Please enter matching passwords (at least 8 characters).');
        // Optionally show validation hints near inputs
        return;
    }
    console.log('Resetting password for:', recoveryEmail);
    // TODO: Implement API call to reset password
    setModalStep('success-step');
  };

  // Back to Login from Success Step
  const handleBackToLoginFromSuccess = () => {
    closeModal();
  };

  // --- JSX Structure ---

  return (
    <div className={styles['login-container-wrapper']}>
      <div className={`${styles['login-container']} ${styles['login-container']}`}>
        {/* Logo Section */}
        <div className={styles['logo-section']}>
          <h1>BadmintonHub</h1>
          <p>Book courts, play more!</p>
        </div>

        {/* Form Container */}
        <div className={styles['form-container']}>

          {/* Login Form Section */}
          <div className={styles['form-section']}>
            <h2 className={styles['form-title']}>Login to Your Account</h2>
            {loginAlert.visible && (
              <div className={`${styles.alert} ${styles[`alert-${loginAlert.type}`]}`}>{loginAlert.message}</div>
            )}
            <form id="login-form" onSubmit={handleLoginSubmit}>
              <div className={styles['form-group']}>
                <label htmlFor="email">Email Address</label>
                <div className={styles['input-group']}>
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    id="email"
                    className={styles['form-control']}
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="password">Password</label>
                <div className={styles['input-group']}>
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="password"
                    className={styles['form-control']}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles['remember-forgot']}>
                <div className={styles['remember-me']}>
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember">Remember me</label>
                </div>
                <a href="#" className={styles['forgot-password']} onClick={openModal}>Forgot Password?</a>
              </div>

              <button type="submit" className={styles['login-btn']}>Login</button>

              <div className={styles['social-login']}>
                <div className={styles['social-login-text']}>Or login with</div>
                <div className={styles['social-btn']}>
                  <button type="button" className={styles['btn-google']} onClick={() => handleSocialLogin('Google')}>
                    <i className="fab fa-google"></i> Google
                  </button>
                  <button type="button" className={styles['btn-facebook']} onClick={() => handleSocialLogin('Facebook')}>
                    <i className="fab fa-facebook-f"></i> Facebook
                  </button>
                </div>
              </div>
            </form>

            {/* Replace the existing register-link div with this */}
            <div className={styles["register-link"]}>
              Don't have an account? <Link href="/register">Sign up now</Link>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {isModalVisible && (
          <div className="modal visible" id="forgot-password-modal" onClick={handleModalBackdropClick}>
            <div className="modal-content">
              <span className="close-modal" onClick={closeModal}>&times;</span>

              {/* Step 1: Email Entry */}
              {modalStep === 'email-step' && (
                <div className="modal-step" id="email-step">
                  <h2>Forgot Password</h2>
                  <p>Enter your email address to receive a verification code.</p>
                  <div className="form-group">
                    <div className="input-group">
                      <i className="fas fa-envelope"></i>
                      <input
                        type="email"
                        id="recovery-email"
                        className={`form-control ${recoveryEmail ? (isRecoveryEmailValid ? 'input-valid' : 'input-invalid') : ''}`}
                        placeholder="Enter your email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        required
                      />
                    </div>
                    {!isRecoveryEmailValid && recoveryEmail && (
                      <div id="recovery-email-feedback" className="validation-feedback invalid-feedback" style={{ display: 'block' }}>Please enter a valid email address.</div>
                    )}
                  </div>
                  <button type="button" className="login-btn" id="send-otp-btn" onClick={handleSendOtp} disabled={!recoveryEmail || !isRecoveryEmailValid}>
                      Send Verification Code
                  </button>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {modalStep === 'otp-step' && (
                <div className="modal-step" id="otp-step">
                  <h2>Enter Verification Code</h2>
                  <p>We've sent a verification code to {recoveryEmail}. Please enter it below.</p>
                  <div className="form-group">
                    <div className="otp-container" onPaste={handleOtpPaste}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          type="text" // Use text to allow easier handling, validation enforces digits
                          className="otp-input"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(e.target, index)}
                          onKeyDown={(e) => handleOtpKeyDown(e, index)}
                          ref={(el: HTMLInputElement | null) => { otpInputsRef.current[index] = el; }}
                          autoFocus={index === 0} // Autofocus the first input
                        />
                      ))}
                    </div>
                    <div className="resend-container">
                      {isResendDisabled ? (
                        <span id="timer">Resend in {timer}s</span>
                      ) : (
                        <a href="#" id="resend-otp" onClick={handleResendOtp}>Resend Code</a>
                      )}
                    </div>
                    {verificationStatus.text && (
                      <div id="verification-status" className={`verification-status ${verificationStatus.status}`}>
                          {verificationStatus.text}
                      </div>
                    )}
                  </div>
                  {/* The verify button is removed as verification happens automatically on completion */}
                </div>
              )}

              {/* Step 3: New Password */}
              {modalStep === 'new-password-step' && (
                <div className="modal-step" id="new-password-step">
                  <h2>Set New Password</h2>
                  <p>Create a new password for your account.</p>
                  <div className="form-group">
                    <label htmlFor="new-password">New Password</label>
                    <div className="input-group">
                      <i className="fas fa-lock"></i>
                      <input
                        type="password"
                        id="new-password"
                        className="form-control"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                     <div className="password-strength">
                          <span id="new-password-strength">{newPasswordStrength.text}</span>
                          <div className="strength-meter">
                          <div id="new-strength-bar" style={{
                              width: `${newPasswordStrength.score}%`,
                              backgroundColor: newPasswordStrength.score < 30 ? '#f44336' : newPasswordStrength.score < 60 ? '#ff9800' : newPasswordStrength.score < 80 ? '#4caf50' : '#2e7d32'
                          }}></div>
                          </div>
                      </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm-new-password">Confirm New Password</label>
                    <div className="input-group">
                      <i className="fas fa-lock"></i>
                      <input
                        type="password"
                        id="confirm-new-password"
                        className={`form-control ${confirmNewPassword ? (newPasswordsMatch ? 'input-valid' : 'input-invalid') : ''}`}
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                     {!newPasswordsMatch && confirmNewPassword && (
                          <div id="new-password-match-feedback" className="validation-feedback invalid-feedback" style={{ display: 'block' }}>Passwords do not match.</div>
                     )}
                  </div>
                  <button type="button" className="login-btn" id="reset-password-btn" onClick={handleResetPassword} disabled={!newPassword || !newPasswordsMatch || newPassword.length < 8}>
                      Reset Password
                  </button>
                </div>
              )}

              {/* Success Message */}
              {modalStep === 'success-step' && (
                <div className="modal-step" id="success-step">
                  <div className="success-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h2>Password Reset Successful!</h2>
                  <p>Your password has been reset successfully. You can now log in with your new password.</p>
                  <button type="button" className="login-btn" id="back-to-login-btn" onClick={handleBackToLoginFromSuccess}>
                      Back to Login
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 