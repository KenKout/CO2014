import React from 'react';

const testimonials = [
    {
        quote: "The facilities are top-notch and the coaching has improved my game tremendously. Highly recommend!",
        author: "Sarah L."
    },
    {
        quote: "I've been a member for 5 years and the community here is amazing. Made great friends while staying fit.",
        author: "Michael T."
    },
    {
        quote: "The tournaments are well-organized and fun. Great way to challenge yourself and meet other players.",
        author: "Jennifer K."
    }
];

const TestimonialSection: React.FC = () => {
    return (
        <section className="testimonial-section">
            <div className="testimonial-wrapper">
                <h2 className="section-title">What Our Members Say</h2>
                <div className="testimonial-container">
                    {testimonials.map((testimonial, index) => (
                        <div className="testimonial" key={index}>
                            <div className="quote">{testimonial.quote}</div>
                            <div className="author">- {testimonial.author}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialSection;