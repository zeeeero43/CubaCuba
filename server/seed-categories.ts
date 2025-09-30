import { db } from "./db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

// Category structure for Rico-Cuba - Spanish version
const categoryData = [
  // 1. Vender & Comprar (Cyan)
  {
    name: "Vender & Comprar",
    nameEn: "Buy & Sell",
    icon: "ShoppingBag",
    color: "cyan",
    order: 1,
    subcategories: [
      { name: "Sistemas Solares y Accesorios", nameEn: "Solar Systems & Accessories", icon: "Sun" },
      { name: "Generadores y Accesorios", nameEn: "Generators & Accessories", icon: "Zap" },
      { name: "Aires Acondicionados y Accesorios", nameEn: "Air Conditioning & Accessories", icon: "Wind" },
      { name: "Electrónica y Accesorios", nameEn: "Electronics & Accessories", icon: "Smartphone" },
      { name: "Belleza y Salud", nameEn: "Beauty & Health", icon: "Heart" },
      { name: "Moda Mujer", nameEn: "Women's Fashion", icon: "User" },
      { name: "Moda Hombre", nameEn: "Men's Fashion", icon: "UserSquare" },
      { name: "Joyería y Relojes", nameEn: "Jewelry & Watches", icon: "Watch" },
      { name: "Zapatos y Accesorios", nameEn: "Shoes & Accessories", icon: "Footprints" },
      { name: "Moda y Belleza Mujer", nameEn: "Fashion & Beauty Women", icon: "ShoppingBag" },
      { name: "Moda y Belleza Hombre", nameEn: "Fashion & Beauty Men", icon: "Shirt" },
      { name: "Equipamiento Deportivo", nameEn: "Sports Equipment", icon: "Dumbbell" },
      { name: "Medicamentos", nameEn: "Medications", icon: "Pill" },
    ]
  },
  // 2. Servicios (Black)
  {
    name: "Servicios",
    nameEn: "Services",
    icon: "Wrench",
    color: "black",
    order: 2,
    subcategories: [
      { name: "Servicios de Seguridad", nameEn: "Security Services", icon: "Shield" },
      { name: "Servicios de Artesanos de A-Z", nameEn: "Handyman Services A-Z", icon: "Hammer" },
      { name: "Servicios IT y Electrónica", nameEn: "IT / Electronics Services", icon: "Laptop" },
      { name: "Transporte y Mensajería", nameEn: "Transport & Courier Services", icon: "Truck" },
      { name: "Peluquería, Barbería, Manicura y Belleza", nameEn: "Hairdresser, Barber, Manicure Beauty", icon: "Scissors" },
      { name: "Fitness y Masajes", nameEn: "Fitness & Massages", icon: "Activity" },
      { name: "Niñera", nameEn: "Babysitter", icon: "Baby" },
      { name: "Servicios de Casa y Jardín", nameEn: "House & Garden Services", icon: "Home" },
      { name: "$$$ Servicios Legales y Notariales $$$", nameEn: "Lawyer & Notary Services", icon: "Scale" },
      { name: "Servicio de Boletos de Avión", nameEn: "Flight Ticket Service", icon: "Plane" },
      { name: "Taxis y Viajes en Bus", nameEn: "Taxis & Bus Rides", icon: "Bus" },
      { name: "Otros Servicios", nameEn: "Other Services", icon: "MoreHorizontal" },
    ]
  },
  // 3. Vehículos (Yellow)
  {
    name: "Vehículos",
    nameEn: "Vehicles",
    icon: "Car",
    color: "yellow",
    order: 3,
    subcategories: [
      { name: "Autos", nameEn: "Cars", icon: "Car" },
      { name: "Camiones y Vehículos Comerciales", nameEn: "Trucks & Commercial Vehicles", icon: "Truck" },
      { name: "Remolques", nameEn: "Trailers", icon: "Plug" },
      { name: "Piezas de Auto, Neumáticos y Accesorios", nameEn: "Auto Parts, Tires & Accessories", icon: "Cog" },
      { name: "Reparaciones de Autos de A-Z", nameEn: "Auto Repairs A-Z", icon: "Wrench" },
      { name: "Bicicletas y Accesorios", nameEn: "Bicycles & Accessories", icon: "Bike" },
      { name: "Triciclos, Motocicletas y Scooters", nameEn: "Three-wheelers Motorcycles & Scooters", icon: "Bike" },
      { name: "Piezas y Accesorios de Motos", nameEn: "Motorcycle Parts & Accessories", icon: "Wrench" },
      { name: "Equipos de Montaje de Neumáticos", nameEn: "Tire Mounting Equipment", icon: "CircleDot" },
      { name: "Servicio de Reparación de Dos y Tres Ruedas", nameEn: "Two-wheel & Three-wheel Repair Service", icon: "Wrench" },
      { name: "Alquiler de Autos Privados", nameEn: "Private Car Rental", icon: "Key" },
    ]
  },
  // 4. Materiales de Construcción (Green)
  {
    name: "Materiales de Construcción",
    nameEn: "Building Materials & Construction",
    icon: "Building2",
    color: "green",
    order: 4,
    subcategories: [
      { name: "Materiales de Construcción de A-Z", nameEn: "Building Materials A-Z", icon: "Package" },
      { name: "Maquinaria de Construcción", nameEn: "Construction Machinery", icon: "Construction" },
      { name: "Equipos y Herramientas", nameEn: "Equipment & Tools", icon: "Wrench" },
      { name: "Servicio de Ingeniería de Construcción", nameEn: "Construction Engineering Service", icon: "HardHat" },
    ]
  },
  // 5. Clases y Cursos (White)
  {
    name: "Clases y Cursos",
    nameEn: "Classes & Courses",
    icon: "GraduationCap",
    color: "white",
    order: 5,
    subcategories: [
      { name: "Cursos de Idiomas", nameEn: "Language Courses", icon: "Languages" },
      { name: "Cursos de Computación", nameEn: "Computer Courses", icon: "Monitor" },
      { name: "Cocina y Repostería", nameEn: "Cooking & Baking", icon: "ChefHat" },
      { name: "Música y Canto", nameEn: "Music & Singing", icon: "Music" },
      { name: "Tutorías", nameEn: "Tutoring", icon: "BookOpen" },
      { name: "Cursos Deportivos", nameEn: "Sports Courses", icon: "Activity" },
      { name: "Cursos de Baile, Entretenimiento y Animación", nameEn: "Dance Courses, Entertainment & Animation", icon: "Music2" },
      { name: "Más Clases y Cursos", nameEn: "More Classes & Courses", icon: "MoreHorizontal" },
    ]
  },
  // 6. Empleos (Yellow)
  {
    name: "Empleos",
    nameEn: "Jobs",
    icon: "Briefcase",
    color: "yellow",
    order: 6,
    subcategories: [
      { name: "Busco Empleo", nameEn: "Job Seekers", icon: "Search" },
      { name: "Ofertas de Empleo", nameEn: "Job Offers", icon: "FileText" },
    ]
  },
  // 7. Ofertas de Inmuebles (White)
  {
    name: "Ofertas de Inmuebles",
    nameEn: "Real Estate Offers",
    icon: "Building",
    color: "white",
    order: 7,
    subcategories: [
      { name: "Casas y Apartamentos en Venta", nameEn: "Houses & Apartments for Sale", icon: "Home" },
      { name: "Casas y Apartamentos en Alquiler", nameEn: "Houses & Apartments for Rent", icon: "Key" },
      { name: "Alquileres Vacacionales para Cubanos", nameEn: "Vacation Rentals for Cubans", icon: "Palmtree" },
      { name: "Alquileres Vacacionales para Extranjeros", nameEn: "Vacation Rentals for Foreigners", icon: "Globe" },
      { name: "Terrenos", nameEn: "Land", icon: "MapPin" },
      { name: "Otros Inmuebles", nameEn: "Other Real Estate", icon: "MoreHorizontal" },
    ]
  },
  // 8. Varios (Cyan)
  {
    name: "Varios",
    nameEn: "Miscellaneous",
    icon: "Package2",
    color: "cyan",
    order: 8,
    subcategories: [
      { name: "Satélite", nameEn: "Satellite", icon: "Satellite" },
      { name: "Divisas", nameEn: "Foreign Exchange", icon: "DollarSign" },
      { name: "Libros y Revistas", nameEn: "Books/Magazines", icon: "Book" },
      { name: "Antigüedades y Colección", nameEn: "Antiques/Collection", icon: "Stamp" },
      { name: "Arte", nameEn: "Art", icon: "Palette" },
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
