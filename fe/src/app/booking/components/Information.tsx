// app/booking/components/Information.tsx
import styles from '../Booking.module.css';

const Information = () => {
  return (
    <section className={styles.infoSection}>
      <h2 className={styles.sectionTitle}>Facility Information</h2>
      
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <h3>Opening Hours</h3>
          <p>Monday - Friday: 5:00 AM - 11:00 PM</p>
          <p>Saturday - Sunday: 7:00 AM - 9:00 PM</p>
        </div>
        
        <div className={styles.infoCard}>
          <h3>Pricing</h3>
          <p>Peak Hours (5:00 PM - 9:00 PM): $20/hour</p>
          <p>Off-Peak Hours: $15/hour</p>
          <p>Weekend Rate: $25/hour</p>
        </div>
        
        <div className={styles.infoCard}>
          <h3>Amenities</h3>
          <ul>
            <li>Professional-grade courts</li>
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