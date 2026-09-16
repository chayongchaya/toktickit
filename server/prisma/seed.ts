import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Every seeded account in this file shares ONE local-development password so
// the credentials are easy to remember while testing: "DevPass123!"
// This is documented here, in the seed script itself, and in the project
// README's "Local Development Credentials" section. It is never used in any
// non-local environment and is not a real secret.
const SEED_PASSWORD = "DevPass123!";

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("🌱 Starting database seeding for Lab 3...");
  const seedPasswordHash = await hash(SEED_PASSWORD);

  // 1. Categories (unchanged from Lab 2) -----------------------------------
  const categories = ["Account and Access", "Hardware", "Software", "Network"];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log("✅ Categories seeded (4 categories)");

  // 2. Related Systems (unchanged from Lab 2) ------------------------------
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

  // 3. Users: Requesters, IT Staff, Administrator (handout §5.3) ----------
  // mustChangePassword: false on every seeded account — these are real,
  // already-known local-dev credentials, not initial passwords issued by an
  // Administrator, so there's nothing to force a change on. The
  // Administrator-issued "must change at next login" path (BR-02) is
  // exercised by creating a *new* user through the Admin UI at test time,
  // not by a seeded row — see tests.md AC-02 / E2E-02.
  type SeedUser = {
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
  };

  const users: SeedUser[] = [
    // Requesters: 4 active + 1 inactive (required minimum)
    { name: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th", role: Role.REQUESTER, isActive: true },
    { name: "Michael Brown", email: "michael.brown@kmutt.ac.th", role: Role.REQUESTER, isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@kmutt.ac.th", role: Role.REQUESTER, isActive: true },
    { name: "David Lee", email: "david.lee@kmutt.ac.th", role: Role.REQUESTER, isActive: true },
    { name: "Inactive Tester", email: "inactive.user@kmutt.ac.th", role: Role.REQUESTER, isActive: false },
    // IT Staff: 3 active + 1 inactive (required minimum)
    { name: "Kevin Patel", email: "kevin.patel@tiktockit.com", role: Role.IT_STAFF, isActive: true },
    { name: "Emily Davis", email: "emily.davis@tiktockit.com", role: Role.IT_STAFF, isActive: true },
    { name: "Lisa Martinez", email: "lisa.martinez@tiktockit.com", role: Role.IT_STAFF, isActive: true },
    { name: "Robert Wilson", email: "robert.wilson@tiktockit.com", role: Role.IT_STAFF, isActive: false },
    // Administrator: 1 active (required minimum)
    { name: "John Smith", email: "john.smith@tiktockit.com", role: Role.ADMINISTRATOR, isActive: true },
  ];

  const userIdByEmail = new Map<string, number>();
  for (const u of users) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: u.isActive },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        passwordHash: seedPasswordHash,
        mustChangePassword: false,
      },
    });
    userIdByEmail.set(u.email, record.id);
  }
  console.log("✅ Users seeded (5 Requester, 4 IT Staff, 1 Administrator)");
  console.log(`   Local dev password for every seeded account: ${SEED_PASSWORD}`);

  // 4. Tickets: realistic spread across statuses/priorities/ownership -----
  const category = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const network = await prisma.category.findUniqueOrThrow({ where: { name: "Network" } });
  const software = await prisma.category.findUniqueOrThrow({ where: { name: "Software" } });
  const laptop = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" } });
  const vpn = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "VPN" } });
  const wifi = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Campus Wi-Fi" } });

  const req = (email: string) => userIdByEmail.get(email)!;
  const staff = (email: string) => userIdByEmail.get(email)!;

  type SeedTicket = {
    ticketNumber: string;
    requesterEmail: string;
    categoryId: number;
    relatedSystemId: number;
    summary: string;
    description: string;
    requestedPriority: Priority;
    itPriority: Priority;
    currentStatus: TicketStatus;
    ownerEmail?: string;
    problemAppearsResolved?: boolean;
  };

  const tickets: SeedTicket[] = [
    {
      ticketNumber: "TKT-2026-000001",
      requesterEmail: "jennifer.anderson@kmutt.ac.th",
      categoryId: category.id,
      relatedSystemId: laptop.id,
      summary: "Laptop battery drains quickly",
      description: "Battery drains much faster than usual, even when idle. Started after last week's update.",
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      currentStatus: TicketStatus.IN_PROGRESS,
      ownerEmail: "kevin.patel@tiktockit.com",
    },
    {
      ticketNumber: "TKT-2026-000002",
      requesterEmail: "sarah.johnson@kmutt.ac.th",
      categoryId: network.id,
      relatedSystemId: vpn.id,
      summary: "Cannot connect to VPN",
      description: "VPN client fails to authenticate since this morning.",
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      currentStatus: TicketStatus.OPEN,
      ownerEmail: "emily.davis@tiktockit.com",
    },
    {
      ticketNumber: "TKT-2026-000003",
      requesterEmail: "david.lee@kmutt.ac.th",
      categoryId: software.id,
      relatedSystemId: laptop.id,
      summary: "Email not syncing on mobile",
      description: "New messages appear on desktop but not on the phone app.",
      requestedPriority: Priority.LOW,
      itPriority: Priority.MEDIUM,
      currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
      ownerEmail: "lisa.martinez@tiktockit.com",
    },
    {
      ticketNumber: "TKT-2026-000004",
      requesterEmail: "michael.brown@kmutt.ac.th",
      categoryId: category.id,
      relatedSystemId: laptop.id,
      summary: "Docking station not detected",
      description: "External monitors stay black when docked; works fine undocked.",
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      currentStatus: TicketStatus.RESOLVED,
      ownerEmail: "kevin.patel@tiktockit.com",
      problemAppearsResolved: true,
    },
    {
      ticketNumber: "TKT-2026-000005",
      requesterEmail: "jennifer.anderson@kmutt.ac.th",
      categoryId: network.id,
      relatedSystemId: wifi.id,
      summary: "Wi-Fi drops every few minutes",
      description: "Connection to campus Wi-Fi disconnects repeatedly in the library.",
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.LOW,
      currentStatus: TicketStatus.CLOSED,
      ownerEmail: "emily.davis@tiktockit.com",
    },
    {
      ticketNumber: "TKT-2026-000006",
      requesterEmail: "sarah.johnson@kmutt.ac.th",
      categoryId: software.id,
      relatedSystemId: laptop.id,
      summary: "Printer keeps showing offline",
      description: "Shared office printer shows offline intermittently since the driver update.",
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      currentStatus: TicketStatus.NEW,
      // unassigned on purpose
    },
    {
      ticketNumber: "TKT-2026-000007",
      requesterEmail: "david.lee@kmutt.ac.th",
      categoryId: category.id,
      relatedSystemId: laptop.id,
      summary: "Reopened: battery issue recurred",
      description: "The battery drain issue from TKT-2026-000001 came back after a week.",
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      currentStatus: TicketStatus.REOPENED,
      ownerEmail: "kevin.patel@tiktockit.com",
    },
    {
      ticketNumber: "TKT-2026-000008",
      requesterEmail: "michael.brown@kmutt.ac.th",
      categoryId: software.id,
      relatedSystemId: laptop.id,
      summary: "Software installation request withdrawn",
      description: "Requester no longer needs the requested software installed.",
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      currentStatus: TicketStatus.CANCELLED,
      // unassigned on purpose
    },
  ];

  const ticketIdByNumber = new Map<string, number>();
  for (const t of tickets) {
    const record = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        currentStatus: t.currentStatus,
        itPriority: t.itPriority,
        ownerId: t.ownerEmail ? staff(t.ownerEmail) : null,
        problemAppearsResolved: t.problemAppearsResolved ?? false,
      },
      create: {
        ticketNumber: t.ticketNumber,
        requesterId: req(t.requesterEmail),
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ownerId: t.ownerEmail ? staff(t.ownerEmail) : null,
        problemAppearsResolved: t.problemAppearsResolved ?? false,
      },
    });
    ticketIdByNumber.set(t.ticketNumber, record.id);
  }
  console.log("✅ Tickets seeded (8 tickets covering all 8 statuses, mixed priorities/ownership)");

  // 5. Public Comments and Internal Notes (at least 2 tickets each) -------
  const commentSeeds: { ticketNumber: string; authorEmail: string; content: string }[] = [
    {
      ticketNumber: "TKT-2026-000001",
      authorEmail: "jennifer.anderson@kmutt.ac.th",
      content: "Just adding that this happens even when I close all applications.",
    },
    {
      ticketNumber: "TKT-2026-000001",
      authorEmail: "kevin.patel@tiktockit.com",
      content: "We are investigating the issue on your device. We'll update you shortly.",
    },
    {
      ticketNumber: "TKT-2026-000002",
      authorEmail: "sarah.johnson@kmutt.ac.th",
      content: "Still can't connect this morning either — same error message as before.",
    },
  ];
  for (const c of commentSeeds) {
    const existing = await prisma.publicComment.findFirst({
      where: { ticketId: ticketIdByNumber.get(c.ticketNumber), content: c.content },
    });
    if (!existing) {
      await prisma.publicComment.create({
        data: {
          ticketId: ticketIdByNumber.get(c.ticketNumber)!,
          authorId: userIdByEmail.get(c.authorEmail)!,
          content: c.content,
        },
      });
    }
  }

  const noteSeeds: { ticketNumber: string; authorEmail: string; content: string }[] = [
    {
      ticketNumber: "TKT-2026-000001",
      authorEmail: "kevin.patel@tiktockit.com",
      content: "Checked event logs; battery driver crashed twice this week. Escalating to hardware vendor.",
    },
    {
      ticketNumber: "TKT-2026-000002",
      authorEmail: "emily.davis@tiktockit.com",
      content: "Confirmed VPN gateway cert expired for this user's group; renewal ticket filed with network team.",
    },
  ];
  for (const n of noteSeeds) {
    const existing = await prisma.internalNote.findFirst({
      where: { ticketId: ticketIdByNumber.get(n.ticketNumber), content: n.content },
    });
    if (!existing) {
      await prisma.internalNote.create({
        data: {
          ticketId: ticketIdByNumber.get(n.ticketNumber)!,
          authorId: userIdByEmail.get(n.authorEmail)!,
          content: n.content,
        },
      });
    }
  }
  console.log("✅ Public Comments and Internal Notes seeded");

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
