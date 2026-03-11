import {
  ProjectStatus,
  TaskPriority,
  TaskStatus
} from "@prisma/client";

import { hashPassword } from "../src/lib/auth";
import { getEnv } from "../src/lib/env";
import { prisma } from "../src/lib/prisma";

async function main() {
  const env = getEnv();
  const reviewerPasswordHash = await hashPassword(
    env.OPS_TRACKER_DEMO_PASSWORD
  );
  const coordinatorPasswordHash = await hashPassword(
    env.OPS_TRACKER_SECONDARY_PASSWORD
  );

  const reviewer = await prisma.user.upsert({
    where: { email: env.OPS_TRACKER_DEMO_EMAIL.toLowerCase() },
    update: {
      name: "Aiko Reviewer",
      passwordHash: reviewerPasswordHash,
      role: "manager"
    },
    create: {
      name: "Aiko Reviewer",
      email: env.OPS_TRACKER_DEMO_EMAIL.toLowerCase(),
      passwordHash: reviewerPasswordHash,
      role: "manager"
    }
  });

  const coordinator = await prisma.user.upsert({
    where: { email: env.OPS_TRACKER_SECONDARY_EMAIL.toLowerCase() },
    update: {
      name: "Ken Coordinator",
      passwordHash: coordinatorPasswordHash,
      role: "coordinator"
    },
    create: {
      name: "Ken Coordinator",
      email: env.OPS_TRACKER_SECONDARY_EMAIL.toLowerCase(),
      passwordHash: coordinatorPasswordHash,
      role: "coordinator"
    }
  });

  const seededCodes = ["OPS-ALPHA", "OPS-BETA", "OPS-EMPTY"];
  const existingProjects = await prisma.project.findMany({
    where: {
      code: {
        in: seededCodes
      }
    },
    select: {
      id: true
    }
  });

  if (existingProjects.length > 0) {
    await prisma.task.deleteMany({
      where: {
        projectId: {
          in: existingProjects.map((project) => project.id)
        }
      }
    });

    await prisma.project.deleteMany({
      where: {
        id: {
          in: existingProjects.map((project) => project.id)
        }
      }
    });
  }

  const alpha = await prisma.project.create({
    data: {
      name: "Harbor inventory rollout",
      code: "OPS-ALPHA",
      description:
        "Coordinate the final warehouse scanner rollout and stabilize the inventory verification flow before Friday.",
      status: ProjectStatus.ACTIVE,
      ownerId: reviewer.id,
      updatedById: reviewer.id
    }
  });

  const beta = await prisma.project.create({
    data: {
      name: "Retail launch recovery",
      code: "OPS-BETA",
      description:
        "Track store recovery work after the launch slip and keep blockers visible for the cross-functional team.",
      status: ProjectStatus.ON_HOLD,
      ownerId: coordinator.id,
      updatedById: coordinator.id
    }
  });

  await prisma.project.create({
    data: {
      name: "Documentation refresh",
      code: "OPS-EMPTY",
      description:
        "A deliberately empty project used to verify the project detail empty state after seeding.",
      status: ProjectStatus.ACTIVE,
      ownerId: reviewer.id,
      updatedById: reviewer.id
    }
  });

  await prisma.task.createMany({
    data: [
      {
        projectId: alpha.id,
        title: "Validate scanner sync on dock floor",
        description:
          "Run the dock-floor validation pass and confirm scan data lands in the warehouse console without duplicates.",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: reviewer.id,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)
      },
      {
        projectId: alpha.id,
        title: "Capture fallback barcode checklist",
        description:
          "Document the manual fallback checklist so the night shift can recover when handheld scanners lose signal.",
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.MEDIUM,
        assigneeId: coordinator.id,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4)
      },
      {
        projectId: beta.id,
        title: "Resolve pricing export mismatch",
        description:
          "Investigate the catalog export mismatch blocking the relaunch readiness review and confirm the corrected payload.",
        status: TaskStatus.BLOCKED,
        priority: TaskPriority.HIGH,
        assigneeId: reviewer.id,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1)
      },
      {
        projectId: beta.id,
        title: "Reissue launch comms pack",
        description:
          "Prepare the revised comms pack for store managers once the recovery timeline is approved.",
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        assigneeId: coordinator.id,
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      }
    ]
  });

  console.log("Seeded ops-tracker demo data.");
  console.log(`Reviewer login: ${env.OPS_TRACKER_DEMO_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
