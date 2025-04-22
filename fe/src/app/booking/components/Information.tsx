// app/booking/components/Information.tsx
import styles from '../Booking.module.css';

const Information = () => {
  // Define rates here for consistency (optional, but good practice)
  const offPeakRate = 90000; 
  const peakRate = 120000;    
  const weekendRate = 140000; 
  const premiumSurcharge = 50000;

  return (
    <section className={styles.infoSection}>
      <h2 className={styles.sectionTitle}>Facility Information</h2>
      
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <h3>Opening Hours</h3>
          <p>Monday - Friday: 5:00 AM - 11:00 PM</p>
          <p>Saturday - Sunday: 7:00 AM - 9:00 PM</p>
        </div>
        
        {/* --- MODIFICATION START --- */}
        <div className={styles.infoCard}>
          <h3>Pricing (per hour)</h3>
          {/* Use toLocaleString for formatting */}
          <p>Peak Hours (5 PM - 9 PM, Weekdays): {peakRate.toLocaleString('vi-VN')} VND</p>
          <p>Off-Peak Hours (Weekdays): {offPeakRate.toLocaleString('vi-VN')} VND</p>
          <p>Weekend Rate: {weekendRate.toLocaleString('vi-VN')} VND</p>
          <p><strong>Premium Courts (1 & 4):</strong> +{premiumSurcharge.toLocaleString('vi-VN')} VND surcharge</p> 
        </div>
        {/* --- MODIFICATION END --- */}
        
        <div className={styles.infoCard}>
          <h3>Amenities</h3>
          <ul>
            <li>Standard & Premium courts</li> {/* Updated amenity list */}
            <li>Changing rooms with showers</li>
            <li>Equipment rental available</li>
            <li>Free parking</li>
          </ul>
        </div>
      </div>
      
      <div className={styles.notice}>
        <p><strong>Note:</strong> Bookings must be made at least 2 hours in advance. Cancellations within 24 hours of booking time will incur a 50% fee.</p>
      </div>
    </section>
  );
};

export default Information;