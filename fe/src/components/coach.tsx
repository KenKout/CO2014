'use client'

import React, { useState } from 'react';
import Image from 'next/image';

// Define coach data structure
const coachData = [
    {
        id: 1,
        name: "Ken Nguyen",
        specialty: "Badminton coach",
        description: "A seasoned badminton expert with 8 years of experience and a proven track record of developing champions",
        rating: 5.0,
        image: "/images/coach.jpg",
        social: {
            facebook: "#",
            instagram: "#",
            twitter: "#"
        }
    },
    {
        id: 2,
        name: "Nguyen Ken",
        specialty: "Crossfit coach",
        description: "Expert crossfit trainer with proven track record of helping clients achieve their fitness goals.",
        rating: 5.0,
        image: "/images/coach.jpg",
        social: {
            facebook: "#",
            instagram: "#",
            twitter: "#"
        }
    },
    {
        id: 3,
        name: "Dien Nguyen",
        specialty: "Personal training",
        description: "Specialized in personalized  badminton training programs tailored to individual needs and goals.",
        rating: 5.0,
        image: "/images/coach.jpg",
        social: {
            facebook: "#",
            instagram: "#",
            twitter: "#"
        }
    }
];

const CoachSection: React.FC = () => {
    const [activeCoach, setActiveCoach] = useState(coachData[0]);

    return (
        <section className="coach-section">
            <div className="coach-container">
                <div className="coach-profile">
                    <div className="coach-info" key={activeCoach.id}>
                        <h4 className="coach-name">{activeCoach.name}</h4>
                        <span className="coach-specialty">{activeCoach.specialty}</span>
                        <p className="coach-description">
                            {activeCoach.description}
                        </p>
                        <div className="coach-rating">
                            <div className="rating-number">{activeCoach.rating.toFixed(1)}</div>
                            <div className="rating-stars">★★★★★</div>
                  
                        </div>
                        <div className="social-links">
                            <a href={activeCoach.social.facebook} className="social-link">
                                <img width="50" height="50" src="https://img.icons8.com/ios/50/facebook-new.png" alt="facebook"/>
                            </a>
                            <a href={activeCoach.social.instagram} className="social-link">
                                <img width="50" height="50" src="https://img.icons8.com/ios/50/instagram-new--v1.png" alt="instagram"/>
                            </a>
                            <a href={activeCoach.social.twitter} className="social-link">
                                <img width="50" height="50" src="https://img.icons8.com/ios/50/twitterx--v1.png" alt="twitter"/>
                            </a>
                        </div>
                    </div>
                    <div className="coach-image">
                        <Image
                            src={activeCoach.image}
                            alt={`Coach ${activeCoach.name}`}
                            fill
                        />
                    </div>
                </div>

                <div className="coach-right">
                    <div className="coach-header">
                        <span className="coach-tagline">World class trainer</span>
                        <h2 className="coach-heading">Most popular<br />expert trainers<span className="period">.</span></h2>
                    </div>
                    
                    <div className="coach-list">
                        {coachData.map((coach, index) => (
                            <div 
                                key={coach.id}
                                className={`coach-list-item ${activeCoach.id === coach.id ? 'active' : ''}`}
                                onClick={() => setActiveCoach(coach)}
                            >
                                <h3>{`0${index + 1}. ${coach.name}`}</h3>
                                <span>{coach.specialty}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CoachSection;