import { db } from "./db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

// Category structure for Rico-Cuba - Complete Spanish version with 12 main categories
const categoryData = [
  // 1. Vehículos & Transporte
  {
    name: "Vehículos & Transporte",
    icon: "Car",
    order: 1,
    subcategories: [
      { name: "Autos", icon: "Car" },
      { name: "Motocicletas", icon: "Bike" },
      { name: "Bicicletas", icon: "Bike" },
      { name: "Camiones y Vehículos Comerciales", icon: "Truck" },
      { name: "Piezas y Repuestos", icon: "Cog" },
      { name: "Neumáticos y Llantas", icon: "CircleDot" },
      { name: "Accesorios para Vehículos", icon: "Wrench" },
    ]
  },
  // 2. Inmuebles & Vivienda
  {
    name: "Inmuebles & Vivienda",
    icon: "Building",
    order: 2,
    subcategories: [
      { name: "Casas en Venta", icon: "Home" },
      { name: "Apartamentos en Venta", icon: "Building2" },
      { name: "Casas en Alquiler", icon: "Key" },
      { name: "Apartamentos en Alquiler", icon: "DoorOpen" },
      { name: "Terrenos y Solares", icon: "MapPin" },
      { name: "Habitaciones", icon: "BedDouble" },
      { name: "Locales Comerciales", icon: "Store" },
      { name: "Alquileres Vacacionales", icon: "Palmtree" },
    ]
  },
  // 3. Electrónica & Tecnología
  {
    name: "Electrónica & Tecnología",
    icon: "Smartphone",
    order: 3,
    subcategories: [
      { name: "Teléfonos Móviles", icon: "Smartphone" },
      { name: "Computadoras y Laptops", icon: "Laptop" },
      { name: "Tabletas", icon: "Tablet" },
      { name: "Televisores", icon: "Tv" },
      { name: "Audio y Sonido", icon: "Headphones" },
      { name: "Cámaras y Fotografía", icon: "Camera" },
      { name: "Electrodomésticos", icon: "Microwave" },
      { name: "Consolas y Videojuegos", icon: "Gamepad2" },
      { name: "Accesorios Electrónicos", icon: "Usb" },
    ]
  },
  // 4. Moda & Ropa
  {
    name: "Moda & Ropa",
    icon: "ShoppingBag",
    order: 4,
    subcategories: [
      { name: "Ropa de Hombre", icon: "UserSquare" },
      { name: "Ropa de Mujer", icon: "User" },
      { name: "Ropa de Niños", icon: "Baby" },
      { name: "Zapatos Hombre", icon: "Footprints" },
      { name: "Zapatos Mujer", icon: "Footprints" },
      { name: "Zapatos Niños", icon: "Footprints" },
      { name: "Accesorios y Complementos", icon: "Watch" },
      { name: "Joyería y Relojes", icon: "Gem" },
      { name: "Bolsos y Carteras", icon: "Briefcase" },
    ]
  },
  // 5. Hogar & Jardín
  {
    name: "Hogar & Jardín",
    icon: "Home",
    order: 5,
    subcategories: [
      { name: "Muebles", icon: "Sofa" },
      { name: "Decoración", icon: "Palette" },
      { name: "Cocina y Comedor", icon: "ChefHat" },
      { name: "Baño", icon: "Bath" },
      { name: "Iluminación", icon: "Lightbulb" },
      { name: "Jardín y Exterior", icon: "Trees" },
      { name: "Herramientas", icon: "Hammer" },
      { name: "Materiales de Construcción", icon: "HardHat" },
    ]
  },
  // 6. Deportes & Ocio
  {
    name: "Deportes & Ocio",
    icon: "Dumbbell",
    order: 6,
    subcategories: [
      { name: "Equipos Deportivos", icon: "Activity" },
      { name: "Bicicletas y Patinetas", icon: "Bike" },
      { name: "Fitness y Gimnasio", icon: "Dumbbell" },
      { name: "Camping y Outdoor", icon: "Tent" },
      { name: "Pesca y Caza", icon: "Fish" },
      { name: "Juegos y Hobbies", icon: "Gamepad" },
      { name: "Instrumentos Musicales", icon: "Music" },
      { name: "Coleccionables", icon: "Stamp" },
    ]
  },
  // 7. Servicios
  {
    name: "Servicios",
    icon: "Wrench",
    order: 7,
    subcategories: [
      { name: "Reparaciones", icon: "Wrench" },
      { name: "Clases y Cursos", icon: "GraduationCap" },
      { name: "Transporte y Mudanzas", icon: "Truck" },
      { name: "Limpieza", icon: "Sparkles" },
      { name: "Belleza y Estética", icon: "Scissors" },
      { name: "Salud y Bienestar", icon: "Heart" },
      { name: "Eventos y Celebraciones", icon: "PartyPopper" },
      { name: "Servicios Profesionales", icon: "Briefcase" },
      { name: "Otros Servicios", icon: "MoreHorizontal" },
    ]
  },
  // 8. Animales & Accesorios
  {
    name: "Animales & Accesorios",
    icon: "Dog",
    order: 8,
    subcategories: [
      { name: "Perros", icon: "Dog" },
      { name: "Gatos", icon: "Cat" },
      { name: "Aves", icon: "Bird" },
      { name: "Peces y Acuarios", icon: "Fish" },
      { name: "Otros Animales", icon: "Rabbit" },
      { name: "Alimentos para Mascotas", icon: "Bone" },
      { name: "Accesorios para Mascotas", icon: "PawPrint" },
      { name: "Cuidado y Veterinaria", icon: "Stethoscope" },
    ]
  },
  // 9. Libros & Medios
  {
    name: "Libros & Medios",
    icon: "Book",
    order: 9,
    subcategories: [
      { name: "Libros", icon: "BookOpen" },
      { name: "Revistas y Periódicos", icon: "Newspaper" },
      { name: "Música CDs y Vinilos", icon: "Disc" },
      { name: "Películas y Series", icon: "Film" },
      { name: "Libros Digitales", icon: "FileText" },
      { name: "Cómics y Manga", icon: "BookMarked" },
    ]
  },
  // 10. Bebé & Familia
  {
    name: "Bebé & Familia",
    icon: "Baby",
    order: 10,
    subcategories: [
      { name: "Ropa de Bebé", icon: "Shirt" },
      { name: "Carriolas y Coches", icon: "Baby" },
      { name: "Cunas y Muebles", icon: "BedDouble" },
      { name: "Juguetes", icon: "Blocks" },
      { name: "Alimentación de Bebé", icon: "Milk" },
      { name: "Seguridad Infantil", icon: "Shield" },
      { name: "Artículos de Maternidad", icon: "Heart" },
    ]
  },
  // 11. Alimentos & Bebidas
  {
    name: "Alimentos & Bebidas",
    icon: "Apple",
    order: 11,
    subcategories: [
      { name: "Productos Locales", icon: "Store" },
      { name: "Frutas y Verduras", icon: "Apple" },
      { name: "Carnes y Pescados", icon: "Fish" },
      { name: "Bebidas", icon: "Coffee" },
      { name: "Repostería y Dulces", icon: "Cake" },
      { name: "Productos Orgánicos", icon: "Leaf" },
      { name: "Especias y Condimentos", icon: "Pepper" },
    ]
  },
  // 12. Varios
  {
    name: "Varios",
    icon: "Package2",
    order: 12,
    subcategories: [
      { name: "Artículos de Oficina", icon: "Briefcase" },
      { name: "Arte y Artesanía", icon: "Palette" },
      { name: "Antigüedades", icon: "Stamp" },
      { name: "Salud y Belleza", icon: "Heart" },
      { name: "Divisas y Monedas", icon: "DollarSign" },
      { name: "Otros Artículos", icon: "MoreHorizontal" },
    ]
  },
];

export async function seedCategories() {
  console.log("Starting category seed - deleting all existing categories...");
  
  try {
    // Delete all existing categories
    await db.delete(categories);
    console.log("All existing categories deleted.");
    
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
      console.log(`Created main category: ${mainCat.name}`);
      
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
        console.log(`  Created subcategory: ${subCat.name}`);
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
