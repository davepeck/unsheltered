import { useMemo } from "react";
import { parseJSON } from "../utils/json";

export const useDataLoader = <T>(dataId: string): T | null =>
  useMemo(() => {
    if (typeof document === "undefined") return null;
    const dataElement = document.getElementById(dataId);
    if (!dataElement || !dataElement.textContent) return null;
    return parseJSON(dataElement.textContent);
  }, [dataId]) as T | null;
