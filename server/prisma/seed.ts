import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for Lab 2...");

  // 1. Categories (4 required categories)
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log("✅ Categories seeded (4 categories)");

  // 2. Related Systems (>= 6 realistic systems)
  const systems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];
  for (const name of systems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log("✅ Related Systems seeded (7 systems)");

  // 3. Requesters (>= 4 Active, >= 1 Inactive)
  const requesters = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th", isActive: true },
    { name: "Michael Brown", email: "michael.brown@kmutt.ac.th", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@kmutt.ac.th", isActive: true },
    { name: "David Lee", email: "david.lee@kmutt.ac.th", isActive: true },
    { name: "Inactive Tester", email: "inactive.user@kmutt.ac.th", isActive: false },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { name: req.name, isActive: req.isActive },
      create: req,
    });
  }
  console.log("✅ Requesters seeded (4 Active, 1 Inactive)");

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });