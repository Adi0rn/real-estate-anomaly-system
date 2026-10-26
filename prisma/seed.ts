import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth-crypto";

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const rawUsers = [
  {
    name: "Arjun Mehta",
    email: "arjun@example.com",
    role: "USER" as const,
  },
  {
    name: "Priya Sharma",
    email: "priya@example.com",
    role: "USER" as const,
  },
  {
    name: "Rahul Nair",
    email: "rahul@example.com",
    role: "USER" as const,
  },
  {
    name: "Sneha Iyer",
    email: "sneha@example.com",
    role: "USER" as const,
  },
  {
    name: "Vikram Rao",
    email: "vikram@example.com",
    role: "USER" as const,
  },
  {
    name: "Ananya Kapoor",
    email: "ananya@example.com",
    role: "USER" as const,
  },
  {
    name: "Karan Patel",
    email: "karan@example.com",
    role: "USER" as const,
  },
  {
    name: "Meera Menon",
    email: "meera@example.com",
    role: "USER" as const,
  },
  {
    name: "Rohan Verma",
    email: "rohan@example.com",
    role: "USER" as const,
  },
  {
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN" as const,
  },
];

const amenities = [
  "Swimming Pool",
  "Gym",
  "Parking",
  "Power Backup",
  "Security",
  "Lift",
  "Clubhouse",
  "Garden",
  "Balcony",
  "Air Conditioning",
  "WiFi",
  "CCTV",
  "Playground",
  "Gated Community",
  "Visitor Parking",
];

const cities = [
  {
    city: "Bangalore",
    state: "Karnataka",
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
  },
  {
    city: "Pune",
    state: "Maharashtra",
  },
  {
    city: "Hyderabad",
    state: "Telangana",
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
  },
];

const propertyTypes = ["APARTMENT", "VILLA", "HOUSE"] as const;

const listingTypes = ["SALE", "RENT"] as const;

const descriptions = [
  "Spacious and well ventilated property located in a prime neighborhood with excellent connectivity.",
  "Modern architecture with premium fittings, ample natural light, and quiet surroundings.",
  "Luxurious living space close to major IT hubs, reputed schools, and shopping centers.",
  "Well-maintained property with excellent amenities, 24/7 security, and dedicated parking space.",
  "Premium property with contemporary interiors and access to multiple community facilities.",
];

async function main() {
  // Safety Guard 1: Refuse to seed in production environment
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seeding is strictly disabled in production environments.");
  }

  // Safety Guard 2: Require explicit confirmation guard before destructive deletion
  if (process.env.CONFIRM_SEED_RESET !== "true") {
    throw new Error(
      "Explicit confirmation required before destructive reset. Set CONFIRM_SEED_RESET=true to allow seeding."
    );
  }

  // Safety Guard 3: Validate password environment variables before touching the database
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userPassword = process.env.SEED_USER_PASSWORD;

  if (!adminPassword || adminPassword.length < 8) {
    throw new Error(
      "Missing or invalid SEED_ADMIN_PASSWORD environment variable (minimum 8 characters required)."
    );
  }

  if (!userPassword || userPassword.length < 8) {
    throw new Error(
      "Missing or invalid SEED_USER_PASSWORD environment variable (minimum 8 characters required)."
    );
  }

  console.log("🌱 Validating credentials and generating bcrypt hashes...");
  // Generate bcrypt hashes safely prior to any database operation
  const adminHash = await hashPassword(adminPassword);
  const userHash = await hashPassword(userPassword);

  console.log("🌱 Starting database seed...");

  // Clear existing data only after all guards have succeeded
  await prisma.propertyAnomaly.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.property.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Existing demo data cleared.");

  // -------------------------
  // Users
  // -------------------------

  const createdUsers = [];

  for (const rawUser of rawUsers) {
    const passwordHash = rawUser.role === "ADMIN" ? adminHash : userHash;
    const createdUser = await prisma.user.create({
      data: {
        name: rawUser.name,
        email: rawUser.email,
        passwordHash,
        role: rawUser.role,
      },
    });

    createdUsers.push(createdUser);
  }

  console.log(`👤 Created ${createdUsers.length} users with secure bcrypt hashes.`);

  // -------------------------
  // Amenities
  // -------------------------

  const createdAmenities = [];

  for (const name of amenities) {
    const amenity = await prisma.amenity.create({
      data: { name },
    });

    createdAmenities.push(amenity);
  }

  console.log(`🏊 Created ${createdAmenities.length} amenities.`);

  // -------------------------
  // Properties
  // -------------------------

  const createdProperties = [];

  for (let i = 0; i < 100; i++) {
    const location = cities[i % cities.length];
    const bedrooms = 1 + (i % 4);
    const bathrooms = Math.max(1, bedrooms);
    const areaSqft = 650 + ((i * 137) % 1800);
    const propertyType = propertyTypes[i % propertyTypes.length];
    const listingType = listingTypes[i % listingTypes.length];

    const cityMultiplier: Record<string, number> = {
      Mumbai: 18000,
      Bangalore: 11000,
      Chennai: 7500,
      Hyderabad: 6500,
      Pune: 8500,
    };

    const pricePerSqft = cityMultiplier[location.city] + bedrooms * 500;
    let price = areaSqft * pricePerSqft;

    if (i % 20 === 0) {
      price *= 1.8;
    }

    if (i % 33 === 0) {
      price *= 0.55;
    }

    const owner = createdUsers[i % createdUsers.length];

    const property = await prisma.property.create({
      data: {
        title: `${bedrooms} BHK ${propertyType.toLowerCase()} in ${location.city}`,
        description: descriptions[i % descriptions.length],
        propertyType,
        listingType,
        price: Math.round(price),
        areaSqft,
        bedrooms,
        bathrooms,
        address: `${100 + i} Main Road`,
        city: location.city,
        state: location.state,
        pincode: `${600000 + i}`,
        latitude: 8.0 + (i % 20) * 0.1,
        longitude: 72.0 + (i % 20) * 0.1,
        status: "ACTIVE",
        ownerId: owner.userId,
      },
    });

    createdProperties.push(property);
  }

  console.log(`🏠 Created ${createdProperties.length} properties.`);

  // -------------------------
  // Property Amenities
  // -------------------------

  let propertyAmenityCount = 0;

  for (const property of createdProperties) {
    const numberOfAmenities = 3 + (property.propertyId % 5);

    for (let j = 0; j < numberOfAmenities; j++) {
      const amenity = createdAmenities[(property.propertyId + j) % createdAmenities.length];

      await prisma.propertyAmenity.create({
        data: {
          propertyId: property.propertyId,
          amenityId: amenity.amenityId,
        },
      });

      propertyAmenityCount++;
    }
  }

  console.log(`🔧 Created ${propertyAmenityCount} property-amenity relationships.`);

  // -------------------------
  // Price History
  // -------------------------

  let priceHistoryCount = 0;

  for (const property of createdProperties) {
    const currentPrice = Number(property.price);

    for (let month = 3; month >= 0; month--) {
      const historicalPrice = Math.round(currentPrice * (1 - month * 0.02));
      const recordedAt = new Date();
      recordedAt.setMonth(recordedAt.getMonth() - month);

      await prisma.priceHistory.create({
        data: {
          propertyId: property.propertyId,
          price: historicalPrice,
          recordedAt,
        },
      });

      priceHistoryCount++;
    }
  }

  console.log(`📈 Created ${priceHistoryCount} price history records.`);
  console.log("✅ Database seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
