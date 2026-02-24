import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(process.cwd(), "data", "b2b", "survey-template.v1.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as {
    version: number;
    title: string;
  };

  const template = await prisma.b2bSurveyTemplate.upsert({
    where: { version: parsed.version },
    create: {
      version: parsed.version,
      title: parsed.title,
      schema: parsed,
      isActive: true,
    },
    update: {
      title: parsed.title,
      schema: parsed,
      isActive: true,
    },
  });

  await prisma.b2bSurveyTemplate.updateMany({
    where: {
      id: { not: template.id },
      isActive: true,
    },
    data: { isActive: false },
  });

  console.log(
    `[b2b] active survey template version=${template.version}, title=${template.title}`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[b2b] failed to seed survey template", error);
    await prisma.$disconnect();
    process.exit(1);
  });
