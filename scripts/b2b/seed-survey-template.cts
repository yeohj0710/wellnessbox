import db from "../../lib/db";
import { loadWellnessTemplateForB2b } from "../../lib/wellness/data-loader";

async function main() {
  const parsed = loadWellnessTemplateForB2b();

  const template = await db.b2bSurveyTemplate.upsert({
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

  await db.b2bSurveyTemplate.updateMany({
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
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[b2b] failed to seed survey template", error);
    await db.$disconnect();
    process.exit(1);
  });
