-- Additive: platform system settings (support channel).

CREATE TABLE IF NOT EXISTS "SystemSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "supportName" TEXT NOT NULL DEFAULT 'Suporte MiBusca Academy',
  "supportWhatsApp" TEXT NOT NULL DEFAULT '',
  "supportDefaultMessage" TEXT NOT NULL DEFAULT 'Olá! Preciso de ajuda com meu acesso ao MiBusca Academy.',
  "supportEmail" TEXT,
  "supportBusinessHours" TEXT,
  "supportEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSettings" ("id", "supportName", "supportWhatsApp", "supportDefaultMessage", "supportEnabled", "createdAt", "updatedAt")
VALUES (
  'default',
  'Suporte MiBusca Academy',
  '',
  'Olá! Preciso de ajuda com meu acesso ao MiBusca Academy.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
