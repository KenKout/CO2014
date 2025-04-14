'use client'

import React, { useEffect, useState, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

interface StatItemProps {
    endValue: number;
    label: string;
    duration: number;
}

const StatItem: React.FC<StatItemProps> = ({ endValue, label, duration }) => {
    const [count, setCount] = useState(0);
    const [ref, inView] = useInView({
        threshold: 0.3,
        triggerOnce: true
    });

    useEffect(() => {
        if (inView) {
            let start = 0;
            const step = (endValue / duration) * 10;
            const timer = setInterval(() => {
                start += step;
                if (start > endValue) {
                    setCount(endValue);
                    clearInterval(timer);
                } else {
                    setCount(Math.floor(start));
                }
            }, 10);

            return () => clearInterval(timer);
        }
    }, [inView, endValue, duration]);

    return (
        <div className="stat-item" ref={ref}>
            <span className="stat-number">{count}</span>
            <span className="stat-label">{label}</span>
        </div>
    );
};

const NumberStats: React.FC = () => {
    const stats = [
        { value: 121, label: 'EXERCISES', duration: 2500 },
        { value: 55, label: 'TOTAL EQUIPMENT', duration: 2500 },
        { value: 234, label: 'TRAINING PEOPLE', duration: 2500 },
        { value: 30, label: 'EXPERT COACHES', duration: 2500 }
    ];

    return (
        <div className="stats-section">
            <div className="stats-container">
                {stats.map((stat, index) => (
                    <StatItem
                        key={index}
                        endValue={stat.value}
                        label={stat.label}
                        duration={stat.duration}
                    />
                ))}
            </div>
        </div>
    );
};

export default NumberStats;