import { useLayoutEffect, useRef } from "react";
import { AppState } from "react-native";
import { translator } from "../i18n";
import { useLocale } from "../i18n/useLocale";
import type { Credential } from "../services/sessionVault";
import type { BusinessContext } from "../domain/contracts";
import { bundleSchema, readBusinessWording } from "../services/wordingProfiles";
import { ConnectionError } from "../services/businessConnection";
import { businessFetch } from "../platform/network";
import { wordingCache } from "../platform/wordingCache";

export function useShopWording(
  credential: Credential,
  context: BusinessContext,
  selected: string | null,
  onAccessLost: () => void,
) {
  const locale = useLocale();
  const branch =
    selected ??
    (context.branches.length === 1 ? context.branches[0]!.id : null);
  const allowed = context.branches.some((row) => row.id === branch);
  const scope =
    branch && allowed
      ? JSON.stringify([
          credential.origin,
          context.businessId,
          context.accountId,
          branch,
          locale,
        ])
      : null;
  const lost = useRef(onAccessLost);
  lost.current = onAccessLost;
  useLayoutEffect(() => {
    const generation = translator.beginWordingScope(scope);
    const abort = new AbortController();
    let busy = false;
    const refresh = async () => {
      if (!scope || !branch || busy || abort.signal.aborted) return;
      busy = true;
      try {
        const bundle = await readBusinessWording(
          credential,
          context,
          branch,
          locale,
          { fetcher: businessFetch, signal: abort.signal },
        );
        if (
          !abort.signal.aborted &&
          translator.applySourceWording(generation, locale, bundle.sourceValues)
        )
          await wordingCache.write({
            scope,
            bundle,
            expiresAt: credential.expiresAt,
          });
      } catch (error) {
        if (
          !abort.signal.aborted &&
          error instanceof ConnectionError &&
          ["signInRequired", "accessChanged", "unsupported"].includes(
            error.problem,
          )
        ) {
          translator.applySourceWording(generation, locale, {});
          await wordingCache.clear().catch(() => {});
          if (error.problem !== "unsupported") lost.current();
        }
        // Transient failures preserve only previously accepted same-scope labels.
      } finally {
        busy = false;
      }
    };
    void (async () => {
      try {
        const raw = (await wordingCache.read()) as {
          scope?: unknown;
          bundle?: unknown;
          expiresAt?: unknown;
        } | null;
        if (
          !abort.signal.aborted &&
          scope &&
          raw?.scope === scope &&
          typeof raw.expiresAt === "string" &&
          Date.parse(raw.expiresAt) > Date.now()
        ) {
          const cached = bundleSchema.safeParse(raw.bundle);
          if (
            cached.success &&
            cached.data.branchId === branch &&
            cached.data.locale === locale
          )
            translator.applySourceWording(
              generation,
              locale,
              cached.data.sourceValues,
            );
        }
      } catch {
        /* Storage is optional; labels must never block reporting. */
      }
      await refresh();
    })();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 60000);
    return () => {
      abort.abort();
      clearInterval(timer);
      subscription.remove();
      translator.beginWordingScope(null);
      void wordingCache.clear().catch(() => {});
    };
  }, [scope, credential.token, credential.expiresAt]);
}
