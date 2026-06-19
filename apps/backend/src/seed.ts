import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org-001' },
    update: {},
    create: {
      id: 'demo-org-001',
      name: 'Acme Corp',
    },
  });

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@acmecorp.com' },
    update: {},
    create: {
      email: 'demo@acmecorp.com',
      name: 'Demo User',
      passwordHash,
      organizationId: org.id,
      role: 'admin',
    },
  });

  // Create a demo site
  const site = await prisma.site.upsert({
    where: { domain_organizationId: { domain: 'example.com', organizationId: org.id } },
    update: {},
    create: {
      domain: 'example.com',
      displayName: 'Example.com',
      organizationId: org.id,
    },
  });

  // Create a default banner config for the demo site
  const existingBanner = await prisma.bannerConfig.findFirst({ where: { siteId: site.id } });
  if (!existingBanner) {
    await prisma.bannerConfig.create({
      data: {
        siteId: site.id,
        version: 1,
        isActive: true,
        title: 'We value your privacy',
        description: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.',
        acceptLabel: 'Accept All',
        rejectLabel: 'Reject All',
        preferencesLabel: 'Manage Preferences',
        position: 'bottom',
        primaryColor: '#3B82F6',
        backgroundColor: '#1E293B',
        textColor: '#F1F5F9',
        buttonTextColor: '#FFFFFF',
        categoryConfigs: JSON.stringify([
          { id: 'necessary', label: 'Necessary', description: 'Required for core site functionality.', required: true },
          { id: 'analytics', label: 'Analytics', description: 'Help us improve our site.', required: false },
          { id: 'marketing', label: 'Marketing', description: 'Personalized advertisements.', required: false },
        ]),
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   Org: ${org.name} (${org.id})`);
  console.log(`   User: ${user.email} / password123`);
  console.log(`   Site: ${site.domain}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
