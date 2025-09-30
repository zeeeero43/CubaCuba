import { db } from "./db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

// Category structure based on Rico-Cuba design
const categoryData = [
  // 1. Verkaufen & Kaufen (Cyan)
  {
    name: "Verkaufen & Kaufen",
    nameEn: "Buy & Sell",
    icon: "ShoppingBag",
    color: "cyan",
    order: 1,
    subcategories: [
      { name: "Solaranlagen & Zubehör", nameEn: "Solar Systems & Accessories", icon: "Sun" },
      { name: "Generatoren & Zubehör", nameEn: "Generators & Accessories", icon: "Zap" },
      { name: "Klimaanlagen & Zubehör", nameEn: "Air Conditioning & Accessories", icon: "Wind" },
      { name: "Elektronik & Zubehör", nameEn: "Electronics & Accessories", icon: "Smartphone" },
      { name: "Beauty & Gesundheit", nameEn: "Beauty & Health", icon: "Heart" },
      { name: "Damenmode", nameEn: "Women's Fashion", icon: "User" },
      { name: "Herrenmode", nameEn: "Men's Fashion", icon: "UserSquare" },
      { name: "Schmuck/Uhren", nameEn: "Jewelry/Watches", icon: "Watch" },
      { name: "Schuhe & Accessoires", nameEn: "Shoes & Accessories", icon: "Footprints" },
      { name: "Mode & Beauty Damen", nameEn: "Fashion & Beauty Women", icon: "ShoppingBag" },
      { name: "Mode & Beauty Herren", nameEn: "Fashion & Beauty Men", icon: "Shirt" },
      { name: "Sportausrüstung", nameEn: "Sports Equipment", icon: "Dumbbell" },
      { name: "Medikamente", nameEn: "Medications", icon: "Pill" },
    ]
  },
  // 2. Service / Dienstleistungen (Black)
  {
    name: "Service / Dienstleistungen",
    nameEn: "Services",
    icon: "Wrench",
    color: "black",
    order: 2,
    subcategories: [
      { name: "Security Dienste", nameEn: "Security Services", icon: "Shield" },
      { name: "Handwerker Dienstleistungen von A-Z", nameEn: "Handyman Services A-Z", icon: "Hammer" },
      { name: "IT / Elektronik Dienstleistungen", nameEn: "IT / Electronics Services", icon: "Laptop" },
      { name: "Transport & Kurrierdienste", nameEn: "Transport & Courier Services", icon: "Truck" },
      { name: "Friseur, Barbier, Maniküre Beauty", nameEn: "Hairdresser, Barber, Manicure Beauty", icon: "Scissors" },
      { name: "Fitness & Massagen", nameEn: "Fitness & Massages", icon: "Activity" },
      { name: "Babysitter", nameEn: "Babysitter", icon: "Baby" },
      { name: "Rund um Haus & Garten", nameEn: "House & Garden Services", icon: "Home" },
      { name: "$$$ Rechtsanwalt & Notar Service $$$", nameEn: "Lawyer & Notary Services", icon: "Scale" },
      { name: "Flugticket Service", nameEn: "Flight Ticket Service", icon: "Plane" },
      { name: "Taxis & Bussefahrten", nameEn: "Taxis & Bus Rides", icon: "Bus" },
      { name: "Weitere Dienstleistungen", nameEn: "Other Services", icon: "MoreHorizontal" },
      { name: "Andere Dienstleistungen", nameEn: "Other Services", icon: "List" },
    ]
  },
  // 3. Fahrzeuge (Yellow)
  {
    name: "Fahrzeuge",
    nameEn: "Vehicles",
    icon: "Car",
    color: "yellow",
    order: 3,
    subcategories: [
      { name: "PKWs", nameEn: "Cars", icon: "Car" },
      { name: "LKW & Nutzfahrzeuge", nameEn: "Trucks & Commercial Vehicles", icon: "Truck" },
      { name: "Anhänger und Trailer", nameEn: "Trailers", icon: "Plug" },
      { name: "Autoteile, Reifen & Zubehör", nameEn: "Auto Parts, Tires & Accessories", icon: "Cog" },
      { name: "Auto Reparaturen von A-Z", nameEn: "Auto Repairs A-Z", icon: "Wrench" },
      { name: "Fahrräder & Zubehör", nameEn: "Bicycles & Accessories", icon: "Bike" },
      { name: "Dreiräder Motorräder & Motorroller", nameEn: "Three-wheelers Motorcycles & Scooters", icon: "Bike" },
      { name: "Motorradteile & Zubehör", nameEn: "Motorcycle Parts & Accessories", icon: "Wrench" },
      { name: "Nutzfahrzeuge & Anhänger", nameEn: "Commercial Vehicles & Trailers", icon: "Truck" },
      { name: "Reifen-Montage Geräte:", nameEn: "Tire Mounting Equipment", icon: "CircleDot" },
      { name: "Zweirad & Dreirad Reparaturservice", nameEn: "Two-wheel & Three-wheel Repair Service", icon: "Wrench" },
      { name: "Autovermietung von Privat", nameEn: "Private Car Rental", icon: "Key" },
    ]
  },
  // 4. Baumaterial & Construction (Green)
  {
    name: "Baumaterial & Construction",
    nameEn: "Building Materials & Construction",
    icon: "Building2",
    color: "green",
    order: 4,
    subcategories: [
      { name: "Baumaterial von A - Z", nameEn: "Building Materials A-Z", icon: "Package" },
      { name: "Baumaschinen,", nameEn: "Construction Machinery", icon: "Construction" },
      { name: "Geräte & Werkzeuge", nameEn: "Equipment & Tools", icon: "Wrench" },
      { name: "Bau-Ingenieur Service", nameEn: "Construction Engineering Service", icon: "HardHat" },
    ]
  },
  // 5. Haus & Garten (Yellow)
  {
    name: "Haus & Garten",
    nameEn: "House & Garden",
    icon: "Home",
    color: "yellow",
    order: 5,
    subcategories: [
      { name: "Haushaltsgeräte", nameEn: "Household Appliances", icon: "Microwave" },
      { name: "Möbel/Dekoration", nameEn: "Furniture/Decoration", icon: "Armchair" },
      { name: "Büroausstattung", nameEn: "Office Equipment", icon: "Briefcase" },
      { name: "Lampen und Licht", nameEn: "Lamps and Lighting", icon: "Lightbulb" },
      { name: "Haustiere", nameEn: "Pets", icon: "Dog" },
      { name: "Andere", nameEn: "Other", icon: "MoreHorizontal" },
    ]
  },
  // 6. Unterricht & Kurse (White)
  {
    name: "Unterricht & Kurse",
    nameEn: "Classes & Courses",
    icon: "GraduationCap",
    color: "white",
    order: 6,
    subcategories: [
      { name: "Sprachkurse", nameEn: "Language Courses", icon: "Languages" },
      { name: "Computerkurse", nameEn: "Computer Courses", icon: "Monitor" },
      { name: "Kochen & Backen", nameEn: "Cooking & Baking", icon: "ChefHat" },
      { name: "Musik & Gesang", nameEn: "Music & Singing", icon: "Music" },
      { name: "Nachhilfe", nameEn: "Tutoring", icon: "BookOpen" },
      { name: "Sportkurse", nameEn: "Sports Courses", icon: "Activity" },
      { name: "Tanzkurse, Unterhaltung & Animation", nameEn: "Dance Courses, Entertainment & Animation", icon: "Music2" },
      { name: "Weitere Unterricht & Kurse", nameEn: "More Classes & Courses", icon: "MoreHorizontal" },
    ]
  },
  // 7. Jobs (Yellow)
  {
    name: "Jobs",
    nameEn: "Jobs",
    icon: "Briefcase",
    color: "yellow",
    order: 7,
    subcategories: [
      { name: "Job Gesuche", nameEn: "Job Seekers", icon: "Search" },
      { name: "Job Angebote", nameEn: "Job Offers", icon: "FileText" },
    ]
  },
  // 8. Immobilien Angebote (White)
  {
    name: "Immobilien Angebote",
    nameEn: "Real Estate Offers",
    icon: "Building",
    color: "white",
    order: 8,
    subcategories: [
      { name: "Häuser & Apartments zum Verkauf", nameEn: "Houses & Apartments for Sale", icon: "Home" },
      { name: "Häuser & Apartments zur Miete", nameEn: "Houses & Apartments for Rent", icon: "Key" },
      { name: "Ferienwohnungen an Kubaner", nameEn: "Vacation Rentals for Cubans", icon: "Palmtree" },
      { name: "Ferienwohnungen an Ausländer", nameEn: "Vacation Rentals for Foreigners", icon: "Globe" },
      { name: "Grundstücke", nameEn: "Land", icon: "MapPin" },
      { name: "sonstige Immobilien", nameEn: "Other Real Estate", icon: "MoreHorizontal" },
    ]
  },
  // 9. Sonstiges (Cyan)
  {
    name: "Sonstiges",
    nameEn: "Miscellaneous",
    icon: "Package2",
    color: "cyan",
    order: 9,
    subcategories: [
      { name: "Satellit", nameEn: "Satellite", icon: "Satellite" },
      { name: "Devisen", nameEn: "Foreign Exchange", icon: "DollarSign" },
      { name: "Bücher/Zeitschriften", nameEn: "Books/Magazines", icon: "Book" },
      { name: "Antiquitäten/Sammlung", nameEn: "Antiques/Collection", icon: "Stamp" },
      { name: "Kunst", nameEn: "Art", icon: "Palette" },
    ]
  },
];

export async function seedCategories() {
  console.log("Starting category seed...");
  
  try {
    for (const mainCat of categoryData) {
      // Insert or update main category
      const existingMain = await db.select()
        .from(categories)
        .where(eq(categories.name, mainCat.name))
        .limit(1);
      
      let mainCategoryId: string;
      
      if (existingMain.length > 0) {
        // Update existing
        await db.update(categories)
          .set({
            nameEn: mainCat.nameEn,
            icon: mainCat.icon,
            color: mainCat.color,
            order: mainCat.order,
            parentId: null,
          })
          .where(eq(categories.id, existingMain[0].id));
        mainCategoryId = existingMain[0].id;
        console.log(`Updated main category: ${mainCat.name}`);
      } else {
        // Insert new
        const inserted = await db.insert(categories)
          .values({
            name: mainCat.name,
            nameEn: mainCat.nameEn,
            icon: mainCat.icon,
            color: mainCat.color,
            order: mainCat.order,
            parentId: null,
          })
          .returning();
        mainCategoryId = inserted[0].id;
        console.log(`Created main category: ${mainCat.name}`);
      }
      
      // Insert or update subcategories
      for (let i = 0; i < mainCat.subcategories.length; i++) {
        const subCat = mainCat.subcategories[i];
        
        const existingSub = await db.select()
          .from(categories)
          .where(eq(categories.name, subCat.name))
          .limit(1);
        
        if (existingSub.length > 0) {
          // Update existing
          await db.update(categories)
            .set({
              nameEn: subCat.nameEn,
              icon: subCat.icon,
              color: mainCat.color,
              order: i + 1,
              parentId: mainCategoryId,
            })
            .where(eq(categories.id, existingSub[0].id));
          console.log(`  Updated subcategory: ${subCat.name}`);
        } else {
          // Insert new
          await db.insert(categories)
            .values({
              name: subCat.name,
              nameEn: subCat.nameEn,
              icon: subCat.icon,
              color: mainCat.color,
              order: i + 1,
              parentId: mainCategoryId,
            });
          console.log(`  Created subcategory: ${subCat.name}`);
        }
      }
    }
    
    console.log("Category seed completed successfully!");
  } catch (error) {
    console.error("Error seeding categories:", error);
    throw error;
  }
}

// Run if called directly
seedCategories()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
