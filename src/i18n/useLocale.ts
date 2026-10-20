import { useSyncExternalStore } from "react";
import { translator } from "./index";

/** Rerender text without remounting a screen or losing an in-flight decision. */
export function useLocale() {
  useSyncExternalStore(
    translator.subscribe,
    translator.getSnapshot,
    translator.getSnapshot,
  );
  return translator.getLocale();
}
