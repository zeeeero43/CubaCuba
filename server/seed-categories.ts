import { db } from "./db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

// Category structure for Rico-Cuba - Spanish only
const categoryData = [
  // 1. Vender & Comprar
  {
    name: "Vender & Comprar",
    icon: "ShoppingBag",
    order: 1,
    subcategories: [
      { name: "Sistemas Solares y Accesorios", icon: "Sun" },
      { name: "Generadores y Accesorios", icon: "Zap" },
      { name: "Aires Acondicionados y Accesorios", icon: "Wind" },
      { name: "Electrónica y Accesorios", icon: "Smartphone" },
      { name: "Belleza y Salud", icon: "Heart" },
      { name: "Moda Mujer", icon: "User" },
      { name: "Moda Hombre", icon: "UserSquare" },
      { name: "Joyería y Relojes", icon: "Watch" },
      { name: "Zapatos y Accesorios", icon: "Footprints" },
      { name: "Moda y Belleza Mujer", icon: "ShoppingBag" },
      { name: "Moda y Belleza Hombre", icon: "Shirt" },
      { name: "Equipamiento Deportivo", icon: "Dumbbell" },
      { name: "Medicamentos", icon: "Pill" },
    ]
  },
  // 2. Servicios
  {
    name: "Servicios",
    icon: "Wrench",
    order: 2,
    subcategories: [
      { name: "Servicios de Seguridad", icon: "Shield" },
      { name: "Servicios de Artesanos de A-Z", icon: "Hammer" },
      { name: "Servicios IT y Electrónica", icon: "Laptop" },
      { name: "Transporte y Mensajería", icon: "Truck" },
      { name: "Peluquería, Barbería, Manicura y Belleza", icon: "Scissors" },
      { name: "Fitness y Masajes", icon: "Activity" },
      { name: "Niñera", icon: "Baby" },
      { name: "Servicios de Casa y Jardín", icon: "Home" },
      { name: "$$$ Servicios Legales y Notariales $$$", icon: "Scale" },
      { name: "Servicio de Boletos de Avión", icon: "Plane" },
      { name: "Taxis y Viajes en Bus", icon: "Bus" },
      { name: "Otros Servicios", icon: "MoreHorizontal" },
    ]
  },
  // 3. Vehículos
  {
    name: "Vehículos",
    icon: "Car",
    order: 3,
    subcategories: [
      { name: "Autos", icon: "Car" },
      { name: "Camiones y Vehículos Comerciales", icon: "Truck" },
      { name: "Remolques", icon: "Plug" },
      { name: "Piezas de Auto, Neumáticos y Accesorios", icon: "Cog" },
      { name: "Reparaciones de Autos de A-Z", icon: "Wrench" },
      { name: "Bicicletas y Accesorios", icon: "Bike" },
      { name: "Triciclos, Motocicletas y Scooters", icon: "Bike" },
      { name: "Piezas y Accesorios de Motos", icon: "Wrench" },
      { name: "Equipos de Montaje de Neumáticos", icon: "CircleDot" },
      { name: "Servicio de Reparación de Dos y Tres Ruedas", icon: "Wrench" },
      { name: "Alquiler de Autos Privados", icon: "Key" },
    ]
  },
  // 4. Materiales de Construcción
  {
    name: "Materiales de Construcción",
    icon: "Building2",
    order: 4,
    subcategories: [
      { name: "Materiales de Construcción de A-Z", icon: "Package" },
      { name: "Maquinaria de Construcción", icon: "Construction" },
      { name: "Equipos y Herramientas", icon: "Wrench" },
      { name: "Servicio de Ingeniería de Construcción", icon: "HardHat" },
    ]
  },
  // 5. Clases y Cursos
  {
    name: "Clases y Cursos",
    icon: "GraduationCap",
    order: 5,
    subcategories: [
      { name: "Cursos de Idiomas", icon: "Languages" },
      { name: "Cursos de Computación", icon: "Monitor" },
      { name: "Cocina y Repostería", icon: "ChefHat" },
      { name: "Música y Canto", icon: "Music" },
      { name: "Tutorías", icon: "BookOpen" },
      { name: "Cursos Deportivos", icon: "Activity" },
      { name: "Cursos de Baile, Entretenimiento y Animación", icon: "Music2" },
      { name: "Más Clases y Cursos", icon: "MoreHorizontal" },
    ]
  },
  // 6. Empleos
  {
    name: "Empleos",
    icon: "Briefcase",
    order: 6,
    subcategories: [
      { name: "Busco Empleo", icon: "Search" },
      { name: "Ofertas de Empleo", icon: "FileText" },
    ]
  },
  // 7. Ofertas de Inmuebles
  {
    name: "Ofertas de Inmuebles",
    icon: "Building",
    order: 7,
    subcategories: [
      { name: "Casas y Apartamentos en Venta", icon: "Home" },
      { name: "Casas y Apartamentos en Alquiler", icon: "Key" },
      { name: "Alquileres Vacacionales para Cubanos", icon: "Palmtree" },
      { name: "Alquileres Vacacionales para Extranjeros", icon: "Globe" },
      { name: "Terrenos", icon: "MapPin" },
      { name: "Otros Inmuebles", icon: "MoreHorizontal" },
    ]
  },
  // 8. Varios
  {
    name: "Varios",
    icon: "Package2",
    order: 8,
    subcategories: [
      { name: "Satélite", icon: "Satellite" },
      { name: "Divisas", icon: "DollarSign" },
      { name: "Libros y Revistas", icon: "Book" },
      { name: "Antigüedades y Colección", icon: "Stamp" },
      { name: "Arte", icon: "Palette" },
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
            icon: mainCat.icon,
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
            icon: mainCat.icon,
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
              icon: subCat.icon,
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
              icon: subCat.icon,
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
