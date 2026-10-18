import { z } from "zod";

// Strict Zod schema for Google Business Profile metadata
export const GmbMetadataSchema = z.object({
  accountId: z.string().min(1, "GMB accountId is required"),
  locationId: z.string().min(1, "GMB locationId is required"),
  locationName: z.string().min(1, "GMB locationName is required"),
  address: z.string().optional(),
  availableLocations: z
    .array(
      z.object({
        accountId: z.string(),
        locationId: z.string(),
        locationName: z.string(),
        address: z.string().optional(),
      }),
    )
    .optional(),
});
export type GmbMetadata = z.infer<typeof GmbMetadataSchema>;

export const GrowEasyMetadataSchema = z.object({
  defaultOrgId: z.string().optional(),
  clientName: z.string().optional(),
});
export type GrowEasyMetadata = z.infer<typeof GrowEasyMetadataSchema>;

// Connector Schema Registry
export const CONNECTOR_REGISTRY = {
  groweasy: GrowEasyMetadataSchema,
  google_gmb: GmbMetadataSchema,
} as const;

export type ProviderType = keyof typeof CONNECTOR_REGISTRY;
export type ProviderMetadata<P extends ProviderType> = z.infer<
  (typeof CONNECTOR_REGISTRY)[P]
>;

export interface TypedConnection<P extends ProviderType> {
  id: string;
  orgId: string;
  userId?: string | null;
  provider: P;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  status: "connected" | "expired" | "disconnected";
  metadata: ProviderMetadata<P>;
  createdAt: Date;
  updatedAt: Date;
}

// Connector Definition for UI catalog
export interface ConnectorDefinition {
  id: ProviderType | string;
  name: string;
  author: string;
  description: string;
  icon: string;
  isAvailable: boolean;
  comingSoon?: boolean;
}

export const AVAILABLE_CONNECTORS: ConnectorDefinition[] = [
  {
    id: "groweasy",
    name: "GrowEasy MCP",
    author: "GrowEasy",
    description:
      "Launch campaigns, inspect daily performance analytics, and manage advertising.",
    icon: "/icons/groweasy.svg",
    isAvailable: true,
  },
  {
    id: "google_gmb",
    name: "Google Business Profile",
    author: "Google",
    description:
      "Publish festive photos, updates, and monitor and reply to customer reviews.",
    icon: "/icons/google.webp",
    isAvailable: true,
  },
];
