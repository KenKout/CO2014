import React from 'react';

const Header: React.FC = () => {
    return (
        <header>
            <div className="brand-name">
                <img className="badminton-symbol" src="https://img.icons8.com/external-glyph-on-circles-amoghdesign/48/external-badminton-sports-and-games-vol-01-glyph-on-circles-amoghdesign.png" alt="badminton" />
                BadmintonHub
            </div>
            <div className="dropdown-menu">
                <button className="menu-button">
                    <img className="menu-symbol" src="https://img.icons8.com/ios/50/12B886/menu--v7.png" alt="menu" /> Menu
                </button>
                <div className="dropdown-content">
                    <button className="close-button">
                        <img src="https://img.icons8.com/material-outlined/24/delete-sign.png" alt="close" />
                    </button>
                    <a href="#">Home</a>
                    <a href="#">Book Court</a>
                    <a href="#">My Bookings</a>
                    <a href="#">Profile</a>
                    <a href="#">Settings</a>
                </div>
            </div>
        </header>
    );
};

export default Header;