import React from 'react';

const WhySection: React.FC = () => {
    return (
        <section className="why-section">
            <div className="why-container">
                <div className="why-left">
                    <div className="why-tagline">Why choose us?</div>
                    <h2 className="why-heading">Many healthy <br />benefits for you<span className="period">.</span></h2>
                </div>
                <div className="why-right">
                    <div className="benefit-card">
                        <img src="https://img.icons8.com/glyph-neue/64/coach.png" alt="Coach Icon" className="benefit-icon" />
                        <div className="benefit-content">
                            <h3 className="benefit-title">Professional coaches</h3>
                            <p className="benefit-desc">Our team of expert coaches is dedicated to guiding you through personalized plans.</p>
                        </div>
                    </div>

                    <div className="benefit-card">
                        <img src="https://img.icons8.com/ios/50/settings--v1.png" alt="Equipment Icon" className="benefit-icon" />
                        <div className="benefit-content">
                            <h3 className="benefit-title">Advance equipments</h3>
                            <p className="benefit-desc">We offer state-of-the-art equipment that caters to all fitness levels.</p>
                        </div>
                    </div>

                    <div className="benefit-card">
                        <img src="https://img.icons8.com/ios-glyphs/30/prison.png" alt="Facility Icon" className="benefit-icon" />
                        <div className="benefit-content">
                            <h3 className="benefit-title">Excel facilities</h3>
                            <p className="benefit-desc">Our facilities are designed for comfort and convenience, featuring clean and spacious areas.</p>
                        </div>
                    </div>
                </div>'
               
            </div>
        </section>
    );
};

export default WhySection;