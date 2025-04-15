
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import BenefitsSection from '../components/BenefitsSection';
import ContentSection from '../components/ContentSection';
import WhySection from '../components/WhySection';
import TestimonialSection from '../components/TestimonialSection';
import NumberStats from '@/components/number';
import CoachSection from '@/components/coach';
const HomePage = () => {
    return (
        <>
            <HeroSection />
            <BenefitsSection />
            <ContentSection />
            <WhySection />
            <NumberStats/>
            <CoachSection/>
            <TestimonialSection />
        </>
    );
};

export default HomePage;