"use client";

import React from "react";
import { ConnectorsModal } from "./connectors.modal";
import { useConnectorCallback } from "@/hooks/use.connector.callback";

export function ConnectorsProvider() {
  useConnectorCallback();

  return <ConnectorsModal />;
}
