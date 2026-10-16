"use client";

import { toast } from "sonner";
import { useEffect } from "react";
import { useConnectorStore } from "@/store/connector.store";

export function useConnectorCallback() {
  const { openConfig } = useConnectorStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const provider = params.get("connector_success");
    const needsConfig =
      params.get("configure") === "1" ||
      params.get("gmb_select_location") === "1";
    const error = params.get("connector_error") || params.get("groweasy_error");

    if (provider) {
      toast.success("Connected successfully!");
      if (needsConfig) {
        openConfig(provider);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("connector_success");
      url.searchParams.delete("configure");
      url.searchParams.delete("gmb_select_location");
      window.history.replaceState(
        {},
        document.title,
        url.pathname + url.search,
      );
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("connector_error");
      url.searchParams.delete("groweasy_error");
      window.history.replaceState(
        {},
        document.title,
        url.pathname + url.search,
      );
    }
  }, [openConfig]);
}
