import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const users = [
  {
    name: "Arjun Mehta",
    email: "arjun@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Priya Sharma",
    email: "priya@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Rahul Nair",
    email: "rahul@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Sneha Iyer",
    email: "sneha@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Vikram Rao",
    email: "vikram@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Ananya Kapoor",
    email: "ananya@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Karan Patel",
    email: "karan@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Meera Menon",
    email: "meera@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Rohan Verma",
    email: "rohan@example.com",
    passwordHash: "demo_hash_123",
    role: "USER",
  },
  {
    name: "Admin User",
    email: "admin@example.com",
    passwordHash: "admin_demo_hash",
    role: "ADMIN",
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
    city: "Chennai",
    state: "Tamil Nadu",
  },
  {
    city: "Hyderabad",
    state: "Telangana",
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
  },
  {
    city: "Pune",
    state: "Maharashtra",
  },
];

const propertyTypes = [
  "APARTMENT",
  "VILLA",
  "HOUSE",
];

const listingTypes = [
  "SALE",
  "RENT",
];

const descriptions = [
  "Modern apartment with excellent natural lighting and spacious interiors.",
  "Well-connected property located close to schools, hospitals and shopping areas.",
  "Beautiful residential property in a peaceful neighbourhood with modern amenities.",
  "Spacious home with excellent ventilation, parking and convenient access to public transport.",
  "Premium property with contemporary interiors and access to multiple community facilities.",
];

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data so the seed can safely be re-run.
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

  for (const user of users) {
    const createdUser = await prisma.user.create({
      data: user,
    });

    createdUsers.push(createdUser);
  }

  console.log(`👤 Created ${createdUsers.length} users.`);

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

    const areaSqft =
      650 +
      ((i * 137) % 1800);

    const propertyType =
      propertyTypes[i % propertyTypes.length];

    const listingType =
      listingTypes[i % listingTypes.length];

    /*
     * Base price is generated from:
     * - city
     * - property size
     * - number of bedrooms
     *
     * This gives us a reasonably structured synthetic dataset
     * for later anomaly detection.
     */

    const cityMultiplier: Record<string, number> = {
      Mumbai: 18000,
      Bangalore: 11000,
      Chennai: 7500,
      Hyderabad: 6500,
      Pune: 8500,
    };

    const pricePerSqft =
      cityMultiplier[location.city] +
      bedrooms * 500;

    let price =
      areaSqft * pricePerSqft;

    /*
     * Intentionally introduce anomalous prices.
     *
     * Every 20th property is significantly overpriced.
     * Every 33rd property is significantly underpriced.
     */
    if (i % 20 === 0) {
      price *= 1.8;
    }

    if (i % 33 === 0) {
      price *= 0.55;
    }

    const owner =
      createdUsers[i % createdUsers.length];

    const property = await prisma.property.create({
      data: {
        title: `${bedrooms} BHK ${propertyType.toLowerCase()} in ${location.city}`,
        description:
          descriptions[i % descriptions.length],
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
    const numberOfAmenities =
      3 + (property.propertyId % 5);

    for (let j = 0; j < numberOfAmenities; j++) {
      const amenity =
        createdAmenities[
          (property.propertyId + j) %
            createdAmenities.length
        ];

      await prisma.propertyAmenity.create({
        data: {
          propertyId: property.propertyId,
          amenityId: amenity.amenityId,
        },
      });

      propertyAmenityCount++;
    }
  }

  console.log(
    `🔧 Created ${propertyAmenityCount} property-amenity relationships.`,
  );

  // -------------------------
  // Price History
  // -------------------------

  let priceHistoryCount = 0;

  for (const property of createdProperties) {
    const currentPrice = Number(property.price);

    for (let month = 3; month >= 0; month--) {
      const historicalPrice =
        Math.round(
          currentPrice *
            (1 - month * 0.02),
        );

      const recordedAt =
        new Date();

      recordedAt.setMonth(
        recordedAt.getMonth() - month,
      );

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

  console.log(
    `📈 Created ${priceHistoryCount} price history records.`,
  );

  console.log("✅ Database seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });