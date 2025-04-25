import HeroSection from '../components/HeroSection';
import BenefitsSection from '../components/BenefitsSection';
import ContentSection from '../components/ContentSection';
import WhySection from '../components/WhySection';
import TestimonialSection from '../components/TestimonialSection';
import NumberStats from '@/components/Number';
import CoachSection from '@/components/Coach';
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