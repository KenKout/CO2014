'use client'; // Mark this component as a Client Component

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createApiClient } from '@/utils/api';
import styles from '@/styles/Register.module.css';

export default function RegisterPage() {
  // State for Form Inputs
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // State for validation
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Password strength' });
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);
  
  // State for Alerts
  const [alert, setAlert] = useState({ message: '', type: '', visible: false });

  // Email Validation
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Don't show error for empty field initially
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    setIsEmailValid(validateEmail(email));
  }, [email]);

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

  // Update password strength on password change
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
    setPasswordsMatch(password === confirmPassword || confirmPassword === '');
  }, [password, confirmPassword]);

  // Clear alerts
  const clearAlert = () => {
    setAlert({ message: '', type: '', visible: false });
  };

  // Social Signup Handlers (Placeholders)
  const handleSocialSignup = (provider: string) => {
    console.log(`${provider} signup clicked`);
    // alert(`${provider} sign up would be implemented with OAuth`);
    clearAlert();
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAlert();

    if (!isEmailValid || email === '') {
      setAlert({ message: 'Please enter a valid email address.', type: 'error', visible: true });
      return;
    }
    if (password.length < 8) {
      setAlert({ message: 'Password must be at least 8 characters long.', type: 'error', visible: true });
      return;
    }
    if (!passwordsMatch) {
      setAlert({ message: 'Passwords do not match.', type: 'error', visible: true });
      return;
    }
    if (!agreeTerms) {
      setAlert({ message: 'You must agree to the Terms of Service and Privacy Policy.', type: 'error', visible: true });
      return;
    }

    try {
      const apiClient = createApiClient(null);
      const response = await apiClient.post('/auth/register', {
        username: email,
        password: password,
        phone: phone,
        name: fullname,
      });
      if (response.status === 200 || response.status === 201) {
        setAlert({ message: 'Registration successful! You can now log in.', type: 'success', visible: true });
        setFullname('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAgreeTerms(false);
        setPasswordStrength({ score: 0, text: 'Password strength' });

        // Optional: Redirect to login page after successful registration
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        const errorData = response.data;
        setAlert({ message: errorData.detail || 'Registration failed.', type: 'error', visible: true });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setAlert({ message: 'An error occurred during registration.', type: 'error', visible: true });
    }
  };

  return (
    <div className={styles['register-container-wrapper']}>
      <div className={styles['register-container']}>
        {/* Logo Section */}
        <div className={styles['logo-section']}>
          <h1>BadmintonHub</h1>
          <p>Book courts, play more!</p>
        </div>

        {/* Form Container */}
        <div className={styles['form-container']}>
          <h2 className={styles['form-title']}>Create an Account</h2>
          
          {alert.visible && (
            <div className={`${styles.alert} ${styles[`alert-${alert.type}`]}`}>{alert.message}</div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className={styles['form-group']}>
              <label htmlFor="fullname">Full Name</label>
              <div className={styles['input-group']}>
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="fullname"
                  className={styles['form-control']}
                  placeholder="Enter your full name"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="email">Email Address</label>
              <div className={styles['input-group']}>
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  id="email"
                  className={`${styles['form-control']} ${email ? (isEmailValid ? styles['input-valid'] : styles['input-invalid']) : ''}`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!isEmailValid && email && (
                <div className={styles['validation-feedback']} style={{ display: 'block' }}>Please enter a valid email address.</div>
              )}
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="phone">Phone Number</label>
              <div className={styles['input-group']}>
                <i className="fas fa-phone"></i>
                <input
                  type="tel"
                  id="phone"
                  className={styles['form-control']}
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className={styles['password-strength']}>
                <span>{passwordStrength.text}</span>
                <div className={styles['strength-meter']}>
                  <div 
                    className={styles['strength-bar']} 
                    style={{
                      width: `${passwordStrength.score}%`,
                      backgroundColor: passwordStrength.score < 30 ? '#f44336' : 
                                     passwordStrength.score < 60 ? '#ff9800' : 
                                     passwordStrength.score < 80 ? '#4caf50' : '#2e7d32'
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className={styles['input-group']}>
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="confirm-password"
                  className={`${styles['form-control']} ${confirmPassword ? (passwordsMatch ? styles['input-valid'] : styles['input-invalid']) : ''}`}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {!passwordsMatch && confirmPassword && (
                <div className={styles['validation-feedback']} style={{ display: 'block' }}>Passwords do not match.</div>
              )}
            </div>

            <div className={styles['form-group']}>
              <div className={styles['terms-checkbox']}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <label htmlFor="terms">
                  I agree to the <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a> and <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
                </label>
              </div>
            </div>

            <button type="submit" className={styles['register-btn']}>
              <i className="fas fa-user-plus"></i> Create Account
            </button>

            <div className={styles['social-login']}>
              <div className={styles['social-login-text']}>Or sign up with</div>
              <div className={styles['social-btn']}>
                <button type="button" className={styles['btn-google']} onClick={() => handleSocialSignup('Google')}>
                  <i className="fab fa-google"></i> Google
                </button>
                <button type="button" className={styles['btn-facebook']} onClick={() => handleSocialSignup('Facebook')}>
                  <i className="fab fa-facebook-f"></i> Facebook
                </button>
              </div>
            </div>
          </form>

          <div className={styles['login-link']}>
            Already have an account? <Link href="/login">Login now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}