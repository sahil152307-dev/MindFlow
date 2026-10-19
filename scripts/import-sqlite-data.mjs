import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const dateFields = {
  User: ["lastActiveDay", "weekAnchorDay", "createdAt", "updatedAt"],
  Course: ["createdAt"],
  Assignment: ["dueDate", "createdAt"],
  Task: ["plannedDate", "completedAt", "createdAt", "updatedAt"],
  EnergyLog: ["date", "createdAt"],
  Proof: ["createdAt"],
  ModeLog: ["createdAt"],
  GoodieGrab: ["createdAt"],
};

function rowsFor(data, table) {
  const rows = data[table];
  if (!Array.isArray(rows)) {
    throw new Error(`SQLite export is missing the ${table} table`);
  }

  return rows.map((row) => {
    const normalized = { ...row };
    for (const field of dateFields[table]) {
      if (normalized[field] !== null && normalized[field] !== undefined) {
        const value = new Date(normalized[field]);
        if (Number.isNaN(value.getTime())) {
          throw new Error(`Invalid date in ${table}.${field}`);
        }
        normalized[field] = value;
      }
    }

    if (table === "Task") normalized.isMicro = Boolean(normalized.isMicro);
    if (table === "Proof") normalized.verified = Boolean(normalized.verified);
    return normalized;
  });
}

const databaseUrl = process.env.NEON_DATABASE_URL_UNPOOLED;
if (!databaseUrl) {
  throw new Error("NEON_DATABASE_URL_UNPOOLED is required for the import");
}

const data = JSON.parse(readFileSync(0, "utf8"));
const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

try {
  const tables = [
    ["User", prisma.user.createMany({ data: rowsFor(data, "User"), skipDuplicates: true })],
    ["Course", prisma.course.createMany({ data: rowsFor(data, "Course"), skipDuplicates: true })],
    ["Assignment", prisma.assignment.createMany({ data: rowsFor(data, "Assignment"), skipDuplicates: true })],
    ["Task", prisma.task.createMany({ data: rowsFor(data, "Task"), skipDuplicates: true })],
    ["EnergyLog", prisma.energyLog.createMany({ data: rowsFor(data, "EnergyLog"), skipDuplicates: true })],
    ["Proof", prisma.proof.createMany({ data: rowsFor(data, "Proof"), skipDuplicates: true })],
    ["ModeLog", prisma.modeLog.createMany({ data: rowsFor(data, "ModeLog"), skipDuplicates: true })],
    ["GoodieGrab", prisma.goodieGrab.createMany({ data: rowsFor(data, "GoodieGrab"), skipDuplicates: true })],
  ];

  const results = await prisma.$transaction(tables.map(([, operation]) => operation));
  for (const [index, [table]] of tables.entries()) {
    console.log(`${table}: imported ${results[index].count} rows`);
  }
} finally {
  await prisma.$disconnect();
}
