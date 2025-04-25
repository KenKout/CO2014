// app/booking/components/Courts.tsx
import styles from '../Booking.module.css';

// Define the Court type
interface Court {
  id: number;
  name: string;
  features: string[];
  isPremium?: boolean; // <-- ADDED: Flag for premium courts
}

// Define props interface for the Courts component
interface CourtsProps {
  selectedCourt: number | null;
  onCourtSelect: (courtId: number) => void;
}

const Courts = ({ selectedCourt, onCourtSelect }: CourtsProps) => {
  const courts: Court[] = [
    { id: 1, name: 'Court 1', features: ['Premium flooring', 'Tournament standard'], isPremium: true },
    { id: 2, name: 'Court 2', features: ['Good for beginners', 'Natural lighting'] },
    { id: 3, name: 'Court 3', features: ['Professional setup', 'Video recording available'] },
    { id: 4, name: 'Court 4', features: ['Recently renovated', 'Air-conditioned'], isPremium: true },
    { id: 5, name: 'Court 5', features: ['Corner location', 'Extra space around court'] },
    { id: 6, name: 'Court 6', features: ['Specialized lighting', 'Premium shuttlecocks included'] },
  ];
  
  return (
    <section className={styles.courtsSection}>
      <h2 className={styles.sectionTitle}>Select a Court</h2>
      
      <div className={styles.courtsGrid}>
        {courts.map(court => (
         <div 
         key={court.id}
         className={`${styles.courtCard} ${selectedCourt === court.id ? styles.selected : ''} ${court.isPremium ? styles.premium : ''}`} // <-- ADDED premium class
         onClick={() => onCourtSelect(court.id)}
       >
       {/* --- MODIFICATION END --- */}
         <div className={styles.courtImage}>
           <BadmintonCourtSVG />
         </div>
         <div className={styles.courtInfo}>
           {/* --- MODIFICATION START --- */}
           {/* Add Premium Badge */}
           <h3>
             {court.name}
             {court.isPremium && <span className={styles.premiumBadge}>Premium</span>} 
           </h3>
              <ul>
                {court.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            <div className={styles.selectButton}>
              {selectedCourt === court.id ? 'Selected' : 'Select Court'}
            </div>
          </div>
        ))}
      </div>
      
    </section>
  );
};

// SVG Component for Badminton Court (Horizontal with benches)
const BadmintonCourtSVG = () => {
    return (
      <svg viewBox="0 0 240 120" className={styles.courtSvg}>
        {/* Background */}
        <rect x="0" y="0" width="240" height="120" fill="#f5f5f5" />
        
        {/* Court outline - green with white lines */}
        <rect x="30" y="15" width="180" height="90" fill="#4CAF50" stroke="white" strokeWidth="2" />
        
        {/* Center line */}
        <line x1="120" y1="15" x2="120" y2="105" stroke="white" strokeWidth="1.5" />
        
        {/* Service courts */}
        <line x1="30" y1="45" x2="210" y2="45" stroke="white" strokeWidth="1.5" />
        <line x1="30" y1="75" x2="210" y2="75" stroke="white" strokeWidth="1.5" />
        
        {/* Service line center dividers */}
        <line x1="75" y1="45" x2="75" y2="75" stroke="white" strokeWidth="1.5" />
        <line x1="165" y1="45" x2="165" y2="75" stroke="white" strokeWidth="1.5" />
        
        {/* Net - more visible */}
        <rect x="118" y="15" width="4" height="90" fill="#333" />
        <line x1="118" y1="15" x2="118" y2="105" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="122" y1="15" x2="122" y2="105" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" />
        
        {/* Benches on each side */}
        {/* Left bench */}
        <rect x="5" y="45" width="15" height="30" fill="#8B4513" rx="2" ry="2" />
        <rect x="5" y="42" width="15" height="3" fill="#A0522D" rx="1" ry="1" />
        <line x1="7" y1="75" x2="7" y2="85" stroke="#8B4513" strokeWidth="2" />
        <line x1="18" y1="75" x2="18" y2="85" stroke="#8B4513" strokeWidth="2" />
        
        {/* Right bench */}
        <rect x="220" y="45" width="15" height="30" fill="#8B4513" rx="2" ry="2" />
        <rect x="220" y="42" width="15" height="3" fill="#A0522D" rx="1" ry="1" />
        <line x1="222" y1="75" x2="222" y2="85" stroke="#8B4513" strokeWidth="2" />
        <line x1="233" y1="75" x2="233" y2="85" stroke="#8B4513" strokeWidth="2" />
      </svg>
    );
  };

export default Courts;