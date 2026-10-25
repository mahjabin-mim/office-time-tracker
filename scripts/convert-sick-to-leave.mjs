// One-off: the Sick day type was removed, so turn existing sick days into plain leave.
// Idempotent. Uses the unpooled connection, like the schema push that runs before it.
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const db = new PrismaClient({ datasources: { db: { url } } });

try {
  const before = await db.attendance.count({ where: { leaveType: "sick" } });
  console.log(`sick days found: ${before}`);
  if (before > 0) {
    const { count } = await db.attendance.updateMany({
      where: { leaveType: "sick" },
      data: { leaveType: "leave" },
    });
    console.log(`converted to leave: ${count}`);
  }
} finally {
  await db.$disconnect();
}
