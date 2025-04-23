import Link from 'next/link';
import React from 'react';

const ContentSection: React.FC = () => {
    return (
        <section className="content-section">
            <div className="content-container">
                <div className="content-image">
                    <img src="https://img.redbull.com/images/c_crop,x_1464,y_0,h_2133,w_1706/c_fill,w_450,h_600/q_auto:low,f_auto/redbullcom/2018/10/17/c8aaa0c5-b3fa-485a-8dd7-b0aae8d8ea6e/red-bull-shuttle-up-badminton-womens-doubles" alt="Red Bull Shuttle Up badminton women's doubles match" />
                </div>
                <div className="content-details">
                    <div className="content-tagline">Grow your badminton potential</div>
                    <h2 className="content-heading">Badminton program made for you<span className="period">.</span></h2>
                    <p className="content-description">Unlock your badminton potential with our tailored program designed just for you! Whether you're a beginner eager to learn the basics or a seasoned player aiming to sharpen your skills, our expert coaches and personalized training plans will guide you every step of the way.</p>
                    <div className="button-container">
                        <Link href="/booking">
                            <button className="book-button">BOOK NOW</button>
                        </Link>

                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContentSection;