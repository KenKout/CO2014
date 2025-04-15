import React from 'react';

const HeroSection: React.FC = () => {
    return (
        <section className="hero-section">
            <div className="left-section">
                <div className="promotion-banner">
                    <span className="wow-text">WOW</span>
                    <span className="promotion-text">GET MORE BENEFIT BY JOINING</span>
                </div>
                <div className="slogan">
                    <div className="first-line">
                        <span className="reveal-text">Play</span>
                        <span className="reveal-text delay-1">Badminton</span>
                    </div>
                    <div className="second-line">
                        <span className="reveal-text">today</span>
                        <span className="period">.</span>
                    </div>
                    <div className="sub-text">
                        Want your body to be healthy? Join us today to fulfill your desires for fitness and fun! Our state-of-the-art badminton center offers a welcoming environment for players of all levels. Whether you're a beginner looking to learn the basics or an experienced player aiming to refine your skills, our expert coaches are here to guide you every step of the way.
                    </div>
                    <button className="book-button">START NOW</button>
                </div>
            </div>
            <div className="right-section">
                <img className="background-image" src="https://as1.ftcdn.net/v2/jpg/02/01/90/26/1000_F_201902639_gZhcd695qjLUnVtJPXqlWpxNj5TvVHw2.jpg" alt="Badminton player in action" />
            </div>
        </section>
    );
};

export default HeroSection;