import sqlite3

def seed_crops_database():
    conn = sqlite3.connect("farm_data.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            water_requirement TEXT,
            soil_preference TEXT,
            nitrogen_impact TEXT,
            growth_duration_months REAL,
            optimal_temp_min REAL,
            optimal_temp_max REAL
        )
    """)
    

    crops_data = [
        ("Wheat (القمح)", "Grains", "Medium", "Loamy to sandy light", "Consumes nitrogen (prefers legumes after)", 5.0, 10.0, 25.0),
        ("Corn (الذرة)", "Grains", "High", "Nutrient-rich clay", "High nitrogen consumer", 4.0, 18.0, 32.0),
        ("Rice (الأرز)", "Grains", "Very High", "Heavy clay", "Medium consumption", 4.5, 20.0, 35.0),
        ("Barley (الشعير)", "Grains", "Low to Medium", "Sandy loam", "Low consumer", 4.0, 8.0, 24.0),
        
        ("Faba Bean (الفول البلدي)", "Legumes", "Low to Medium", "Clay or well-drained silt", "Fixes and enriches soil with nitrogen", 5.0, 15.0, 22.0),
        ("Lentils (العدس)", "Legumes", "Low", "Light sandy or loamy", "Nitrogen fixer", 4.0, 12.0, 20.0),
        ("Chickpeas (الحمص)", "Legumes", "Low", "Well-drained sandy loam", "Nitrogen fixer", 4.5, 15.0, 28.0),
        ("Alfalfa (البرسيم)", "Forage", "High", "Heavy or medium clay", "Strong nitrogen fixer and soil improver", 6.0, 12.0, 26.0),
        
        ("Tomato (الطماطم)", "Vegetables", "High & Regular", "Light aerated silt", "Medium consumption", 4.0, 20.0, 30.0),
        ("Potato (البطاطس)", "Vegetables", "Medium to High", "Light sandy or silt", "Consumes potassium and nitrogen", 3.5, 15.0, 23.0),
        ("Onion (البصل)", "Vegetables", "Medium", "Loamy sandy", "Low to medium consumption", 4.0, 13.0, 25.0),
        ("Garlic (الثوم)", "Vegetables", "Medium", "Fertile well-drained soil", "Low consumption", 4.5, 12.0, 22.0),
        ("Cucumber (الخيار)", "Vegetables", "High", "Rich sandy loam", "High consumption", 3.0, 22.0, 32.0),
        ("Eggplant (الباذنجان)", "Vegetables", "Medium to High", "Deep loamy soil", "Medium consumption", 4.0, 20.0, 30.0),
        
        ("Citrus / Orange (البرتقال والموالح)", "Fruits", "High (Permanent)", "Well-drained light silt", "Continuous nutrient consumer", 12.0, 15.0, 35.0),
        ("Date Palm (النخيل / التمور)", "Fruits", "Low to Medium (Drought tolerant)", "Sandy or light clay (salt tolerant)", "Low negative impact", 12.0, 20.0, 45.0),
        ("Watermelon (البطيخ)", "Fruits", "Medium", "Light sandy", "Medium consumption", 3.0, 25.0, 38.0),
        ("Olive (الزيتون)", "Fruits", "Low to Medium", "Rocky or sandy loam", "Low consumption", 12.0, 15.0, 35.0),
        ("Grape (العنب)", "Fruits", "Medium", "Sandy loam", "Medium consumption", 6.0, 18.0, 32.0),
        ("Pomegranate (الرمان)", "Fruits", "Medium", "Well-drained loamy soil", "Low consumption", 6.0, 20.0, 38.0)
    ]
    
    cursor.executemany("""
        INSERT INTO crops (name, category, water_requirement, soil_preference, nitrogen_impact, growth_duration_months, optimal_temp_min, optimal_temp_max)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, crops_data)
    
    conn.commit()
    conn.close()
    print("-> Successfully inserted a large dataset of crops into the database!")

if __name__ == "__main__":
    seed_crops_database()