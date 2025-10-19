import { db } from "./db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

// Category structure for Rico-Cuba based on customer requirements
// All categories in Spanish, matching the PDF structure
const categoryData = [
  // 1. Comprar & Vender
  {
    name: "Comprar & Vender",
    icon: "ShoppingCart",
    order: 1,
    subcategories: [
      { name: "Móviles", icon: "Smartphone" },
      { name: "Foto / Video", icon: "Camera" },
      { name: "TV / Accesorios", icon: "Tv" },
      { name: "Computadoras", icon: "Laptop" },
      { name: "Electrodomésticos", icon: "Refrigerator" },
      { name: "Muebles y Decoración", icon: "Sofa" },
      { name: "Ropa / Zapatos / Accesorios", icon: "Shirt" },
      { name: "Intercambio de Regalos", icon: "Gift" },
      { name: "Mascotas / Animales", icon: "Dog" },
      { name: "Divisas", icon: "DollarSign" },
      { name: "Libros & Revistas", icon: "BookOpen" },
      { name: "Joyas / Relojes", icon: "Watch" },
      { name: "Antigüedades / Colección", icon: "Stamp" },
      { name: "Equipamiento Deportivo", icon: "Dumbbell" },
      { name: "Arte", icon: "Palette" },
      { name: "Otros", icon: "Package" },
    ]
  },
  // 2. Autos / Vehículos
  {
    name: "Autos / Vehículos",
    icon: "Car",
    order: 2,
    subcategories: [
      { name: "Autos / Camiones / Remolques", icon: "Truck" },
      { name: "Motocicletas & Triciclos", icon: "Bike" },
      { name: "Bicicletas", icon: "Bike" },
      { name: "Mecánico", icon: "Wrench" },
      { name: "Piezas & Accesorios", icon: "Cog" },
      { name: "Alquiler de Vehículos", icon: "Key" },
      { name: "Taxi & Servicio de Mensajería", icon: "Car" },
      { name: "Otros", icon: "MoreHorizontal" },
    ]
  },
  // 3. Inmobiliaria
  {
    name: "Inmobiliaria",
    icon: "Building",
    order: 3,
    subcategories: [
      { name: "Ofertas & Búsquedas", icon: "Search" },
      { name: "Intercambio", icon: "ArrowLeftRight" },
      { name: "Alquiler a Cubanos", icon: "Home" },
      { name: "Alquiler a Turistas", icon: "Palmtree" },
      { name: "Casa en la Playa", icon: "Waves" },
      { name: "Otros", icon: "Building2" },
    ]
  },
  // 4. Generación de Energía
  {
    name: "Generación de Energía",
    icon: "Zap",
    order: 4,
    subcategories: [
      { name: "Paneles Solares / Accesorios", icon: "Sun" },
      { name: "Generadores & Accesorios", icon: "Battery" },
      { name: "Otros", icon: "Plug" },
    ]
  },
  // 5. Servicios Ofrecidos
  {
    name: "Servicios Ofrecidos",
    icon: "Briefcase",
    order: 5,
    subcategories: [
      { name: "Trabajos de Construcción / Renovación / Mantenimiento", icon: "HardHat" },
      { name: "IT / Programación", icon: "Code" },
      { name: "Reparaciones Electrónicas", icon: "Cpu" },
      { name: "Cursos & Clases", icon: "GraduationCap" },
      { name: "Servicio de Foto & Video", icon: "Video" },
      { name: "Peluquería / Barbería / Belleza", icon: "Scissors" },
      { name: "Gimnasio / Masaje / Entrenador", icon: "Activity" },
      { name: "Restaurantes / Gastronomía", icon: "Utensils" },
      { name: "Diseño / Decoración", icon: "PenTool" },
      { name: "Música / Animación / Shows", icon: "Music" },
      { name: "Relojero / Joyero", icon: "Gem" },
      { name: "Servicio de Acompañamiento", icon: "Users" },
      { name: "Servicio de Tickets", icon: "Ticket" },
      { name: "Otros", icon: "MoreHorizontal" },
    ]
  },
  // 6. Material de Construcción & Maquinaria
  {
    name: "Material de Construcción & Maquinaria",
    icon: "HardHat",
    order: 6,
    subcategories: [
      { name: "Aires Acondicionados & Accesorios", icon: "Wind" },
      { name: "Cemento / Pegamento / Masilla", icon: "Package2" },
      { name: "Armadura de Hormigón", icon: "HardHat" },
      { name: "Arena & Grava", icon: "Mountain" },
      { name: "Geo-Material", icon: "Layers" },
      { name: "Puertas / Ventanas & Portones", icon: "DoorOpen" },
      { name: "Mármol / Granito / Azulejos", icon: "Square" },
      { name: "Maquinaria de Construcción", icon: "Truck" },
      { name: "Otros", icon: "MoreHorizontal" },
    ]
  },
  // 7. Empleos
  {
    name: "Empleos",
    icon: "Users",
    order: 7,
    subcategories: [
      { name: "Ofertas de Empleo", icon: "ClipboardList" },
      { name: "Busco Trabajo", icon: "UserSearch" },
    ]
  },
];

export async function seedCategories() {
  console.log("🌱 Seeding categories for Rico-Cuba...");
  console.log("📋 Deleting all existing categories...");
  
  try {
    // Delete all existing categories
    await db.delete(categories);
    console.log("✅ All existing categories deleted.");
    
    for (const mainCat of categoryData) {
      // Insert main category
      const inserted = await db.insert(categories)
        .values({
          name: mainCat.name,
          icon: mainCat.icon,
          color: "#10b981",
          order: mainCat.order,
          parentId: null,
        })
        .returning();
      const mainCategoryId = inserted[0].id;
      console.log(`✅ Created main category: ${mainCat.name}`);
      
      // Insert subcategories
      for (let i = 0; i < mainCat.subcategories.length; i++) {
        const subCat = mainCat.subcategories[i];
        
        await db.insert(categories)
          .values({
            name: subCat.name,
            icon: subCat.icon,
            color: "#10b981",
            order: i + 1,
            parentId: mainCategoryId,
          });
        console.log(`  ⊙ Created subcategory: ${subCat.name}`);
      }
    }
    
    console.log("✅ Category seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
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
