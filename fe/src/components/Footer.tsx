import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>BadmintonHub</h3>
                    <p>Your premier badminton destination</p>
                </div>
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <a href="#">About Us</a>
                    <a href="#">Contact</a>
                    <a href="#">Terms of Service</a>
                </div>
                <div className="footer-section">
                    <h4>Contact</h4>
                    <p>Email: info@badmintonhub.com</p>
                    <p>Phone: (123) 456-7890</p>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2025 BadmintonHub. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;