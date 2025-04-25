'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // <--- Import Link

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuOpen = () => {
        setIsMenuOpen(true);
    };

    const handleMenuClose = () => {
        setIsMenuOpen(false);
    };

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isMenuOpen]);

    // Close menu when a link is clicked (optional but good UX)
    const handleLinkClick = () => {
        setIsMenuOpen(false);
    };


    return (
        <>
            <header className="app-header">
                <div className="brand-name">
                    <img className="badminton-symbol" src="https://img.icons8.com/external-glyph-on-circles-amoghdesign/48/external-badminton-sports-and-games-vol-01-glyph-on-circles-amoghdesign.png" alt="badminton" />
                    BadmintonHub
                </div>
                <div className="menu-container">
                    <button
                        className="menu-button"
                        onClick={handleMenuOpen}
                        aria-expanded={isMenuOpen}
                        aria-controls="slide-in-menu-content"
                        aria-label="Open menu"
                    >
                        <img className="menu-symbol" src="https://img.icons8.com/ios/50/12B886/menu--v7.png" alt="" />
                        Menu
                    </button>
                </div>
            </header>

            {isMenuOpen && (
                <div className="menu-overlay" onClick={handleMenuClose}></div>
            )}

            <div
                id="slide-in-menu-content"
                className={`slide-in-menu ${isMenuOpen ? 'open' : ''}`}
                aria-hidden={!isMenuOpen}
            >
                <button
                    className="close-button"
                    onClick={handleMenuClose}
                    aria-label="Close menu"
                >
                    <img src="https://img.icons8.com/material-outlined/24/delete-sign.png" alt="close" />
                </button>
                <nav>
                    {/* Use Link for client-side navigation */}
                    <Link href="/" onClick={handleLinkClick}>Home</Link>
                    <Link href="/booking" onClick={handleLinkClick}>Book Court</Link> {/* Example */}
                    <Link href="/profile" onClick={handleLinkClick}>Profile</Link> {/* Changed to Link */}
                    <Link href="/settings" onClick={handleLinkClick}>Settings</Link> {/* Example */}
                </nav>
            </div>
        </>
    );
};

export default Header;