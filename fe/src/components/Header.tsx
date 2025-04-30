"use client";

import React, { useState, useEffect } from "react"; // Keep useEffect for body scroll lock
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; // <--- Import useAuth from your context file path
import { usePathname } from "next/navigation"; // Import usePathname to check current route

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, logout } = useAuth(); // <--- Get user and logout function from the context
    const pathname = usePathname(); // Get current path
    
    // Check if current page is login or register
    const isAuthPage = pathname === '/login' || pathname === '/register';

    // --- Menu open/close handlers ---
    const handleMenuOpen = () => setIsMenuOpen(true);
    const handleMenuClose = () => setIsMenuOpen(false);

    // --- Effect to lock body scroll when menu is open ---
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        // Cleanup function to restore scroll on component unmount or when menu closes
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isMenuOpen]);

    // --- Close menu when a link is clicked ---
    const handleLinkClick = () => {
        setIsMenuOpen(false);
    };

    // --- Handle logout action ---
    const handleLogoutClick = () => {
        handleLinkClick(); // Close the menu first
        logout(); // Call the logout function from context
        // No need to redirect here, the context's logout function handles it
    }

    return (
        <>
            <header className="app-header">
                {/* Brand Name */}
                <div className="brand-name">
                    <img
                        className="badminton-symbol"
                        src="https://img.icons8.com/external-glyph-on-circles-amoghdesign/48/external-badminton-sports-and-games-vol-01-glyph-on-circles-amoghdesign.png"
                        alt="badminton"
                    />
                    {/* Optionally display username */}
                    BadmintonHub 
                </div>

                {/* Auth Status */}
                <div className="auth-status">
                    {!user ? (
                        // Only show login/signup buttons if not on login or register pages
                        !isAuthPage && (
                            <>
                                <Link href="/login" className="auth-link">Login</Link>
                                <Link href="/register" className="auth-link">Signup</Link>
                            </>
                        )
                    ) : (
                        <>
                            <Link href="/profile" className="user-greeting">Hi, {user.username}</Link>
                            <button onClick={handleLogoutClick} className="logout-button-header">Logout</button>
                        </>
                    )}
                </div>

                {/* Menu Button */}
                <div className="menu-container">
                    <button
                        className="menu-button"
                        onClick={handleMenuOpen}
                        aria-expanded={isMenuOpen}
                        aria-controls="slide-in-menu-content"
                        aria-label="Open menu"
                    >
                        <img
                            className="menu-symbol"
                            src="https://img.icons8.com/ios/50/12B886/menu--v7.png"
                            alt="menu icon"
                        />
                        Menu
                    </button>
                </div>
            </header>

            {/* Menu Overlay */}
            {isMenuOpen && (
                <div className="menu-overlay" onClick={handleMenuClose}></div>
            )}

            {/* Slide-in Menu */}
            <div
                id="slide-in-menu-content"
                className={`slide-in-menu ${isMenuOpen ? "open" : ""}`}
                aria-hidden={!isMenuOpen}
            >
                {/* Close Button */}
                <button
                    className="close-button"
                    onClick={handleMenuClose}
                    aria-label="Close menu"
                >
                    <img
                        src="https://img.icons8.com/material-outlined/24/delete-sign.png"
                        alt="close"
                    />
                </button>

                {/* Navigation Links */}
                <nav>
                    <Link href="/" onClick={handleLinkClick}>Home</Link>

                    {/* Links visible only when logged in */}
                    {user && (
                        <>
                            <Link href="/booking" onClick={handleLinkClick}>Booking</Link>
                            <Link href="/orders" onClick={handleLinkClick}>Order History</Link>
                            {/* --- Conditional Admin Link --- */}
                            {/* Check if user exists AND user_type is 'Staff' */}
                            {user.user_type === "Staff" && (
                                <Link href="/admin" onClick={handleLinkClick}>
                                    Admin Panel
                                </Link>
                            )}
                            {/* --- End Conditional Admin Link --- */}
                        </>
                    )}

                   
                    {/* Login/Register/Logout moved to header */}
                </nav>
            </div>
        </>
    );
};

export default Header;