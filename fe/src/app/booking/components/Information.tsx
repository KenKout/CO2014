// app/booking/components/Information.tsx
import styles from "@/styles/Booking.module.css";

const Information = () => {
    // Define rates based on the new structure
    const normalRate = 90000;
    const premiumRate = 140000;

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
                    <p>
                        Standard Courts:{" "}
                        {normalRate.toLocaleString("vi-VN")} VND
                    </p>
                    <p>
                        Premium Courts (Air-Conditioned):{" "}
                        {premiumRate.toLocaleString("vi-VN")} VND
                        {/* You might want to specify which courts are premium if known statically,
                            e.g., (Courts 1 & 4) or refer to selection process */}
                    </p>
                    {/* Removed Peak/Off-Peak/Weekend specific lines */}
                </div>
                {/* --- MODIFICATION END --- */}

                <div className={styles.infoCard}>
                    <h3>Amenities</h3>
                    <ul>
                        <li>Standard & Premium (A/C) courts</li> {/* Updated amenity list */}
                        <li>Changing rooms with showers</li>
                        <li>Equipment rental available</li>
                        <li>Free parking</li>
                    </ul>
                </div>
            </div>

            <div className={styles.notice}>
                <p>
                    <strong>Note:</strong> Bookings must be made at least 2
                    hours in advance. Cancellations within 24 hours of booking
                    time will incur a 50% fee.
                </p>
            </div>
        </section>
    );
};

export default Information;