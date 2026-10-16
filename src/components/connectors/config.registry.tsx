import React from "react";
import { GmbLocationModal } from "./gmb.location.modal";

export interface ConnectorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

// Modular registry mapping provider IDs to their custom configuration dialogs
export const CONNECTOR_CONFIG_MODALS: Record<
  string,
  React.ComponentType<ConnectorConfigModalProps>
> = {
  google_gmb: GmbLocationModal,
  // Future modular extensions:
  // shopify: ShopifyStoreModal,
  // meta_ads: MetaAccountModal,
  // slack: SlackChannelModal,
};
