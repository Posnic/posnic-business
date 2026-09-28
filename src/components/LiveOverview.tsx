import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View, StyleSheet, useColorScheme } from "react-native";
import { Card, Button } from "./ui";
import { type Credential } from "../services/sessionVault";
import { type BusinessContext, resolveBranchScope } from "../domain/contracts";
import {
  branchDay,
  type PreparedOverview,
  validatePreparedOverview,
} from "../domain/preparedOverview";
import {
  ConnectionError,
  createReportingClient,
  discoverBusinessServer,
} from "../services/businessConnection";
import { businessFetch } from "../platform/network";
import { formatMoney } from "../domain/money";
import { t, type MessageKey } from "../i18n";

export type RefreshBinding = { run: () => void; busy: boolean } | null;
export function LiveOverview({
  credential,
  context,
  branch,
  onAccessLost,
  onRefreshBinding,
}: {
  credential: Credential;
  context: BusinessContext;
  branch: string | null;
  onAccessLost: () => void;
  onRefreshBinding: (binding: RefreshBinding) => void;
}) {
  const [summary, setSummary] = useState<PreparedOverview | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<MessageKey | null>(null);
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0);
  const lost = useRef(onAccessLost);
  lost.current = onAccessLost;
  const dark = useColorScheme() === "dark";
  const ink = { color: dark ? "#eef5fa" : "#172b37" };
  const scope = resolveBranchScope(context, branch);
  const selected = context.branches.filter((b) => scope.includes(b.id));
  const mixed = selected.some(
    (b) =>
      b.currency !== selected[0]?.currency ||
      b.currencyDigits !== selected[0]?.currencyDigits ||
      b.timezone !== selected[0]?.timezone,
  );
  const allowed =
    context.capabilities.includes("overview.read") &&
    selected.length > 0 &&
    !mixed;
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController(),
      run = ++generation.current;
    controller.current = request;
    setSummary(null);
    setNotice(null);
    if (!allowed) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const options = { fetcher: businessFetch, signal: request.signal };
      const discovery = await discoverBusinessServer(
        credential.origin,
        options,
      );
      if (discovery.reporting !== "bounded-summary-v2")
        throw new ConnectionError("unsupported");
      const ids = resolveBranchScope(context, branch);
      const day = branchDay(
        context.branches.find((b) => b.id === ids[0])!.timezone,
      );
      const result = await createReportingClient(
        credential.origin,
        credential.token,
        options,
      ).overview(context, ids, day, 2);
      if (run === generation.current)
        setSummary(validatePreparedOverview(result, context, ids, day));
    } catch (error) {
      if (run !== generation.current || request.signal.aborted) return;
      if (
        error instanceof ConnectionError &&
        ["signInRequired", "accessChanged"].includes(error.problem)
      ) {
        lost.current();
        return;
      }
      setNotice(
        error instanceof ConnectionError && error.problem === "unsupported"
          ? "liveReportsPending"
          : error instanceof ConnectionError && error.problem === "busy"
            ? "summaryPreparing"
            : "summaryUnavailable",
      );
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }, [credential.origin, credential.token, context, branch, allowed]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [refresh]);
  useEffect(() => {
    onRefreshBinding(
      allowed
        ? {
            run: () => {
              void refresh();
            },
            busy,
          }
        : null,
    );
  }, [allowed, busy, refresh, onRefreshBinding]);
  useEffect(() => () => onRefreshBinding(null), [onRefreshBinding]);
  if (!context.capabilities.includes("overview.read") || !selected.length)
    return null;
  const money = (amount: number) =>
    formatMoney(amount, summary!.currency, summary!.currencyDigits);
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={[styles.title, ink]}>
          {t("today")}
        </Text>
        {allowed && (
          <Button
            label={t("refresh")}
            secondary
            disabled={busy}
            onPress={() => {
              void refresh();
            }}
          />
        )}
      </View>
      {mixed ? (
        <Card>
          <Text style={[styles.text, ink]}>{t("selectComparableBranch")}</Text>
        </Card>
      ) : summary ? (
        <>
          <View
            style={[
              styles.hero,
              { backgroundColor: dark ? "#153e3a" : "#e0f4ed" },
            ]}
          >
            <Text style={[styles.text, ink]}>{t("salesAfterReturns")}</Text>
            <Text selectable style={[styles.amount, ink]}>
              {money(summary.salesAfterReturnsMinor)}
            </Text>
            <Text style={[styles.text, ink]}>{t("includingTax")}</Text>
            <Text style={[styles.text, ink]}>
              {t("preparedSummaryTime", {
                date: summary.businessDate,
                time: new Intl.DateTimeFormat(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: selected[0]!.timezone,
                }).format(new Date(summary.preparedAt)),
              })}
            </Text>
          </View>
          <Card>
            <Text accessibilityRole="header" style={[styles.label, ink]}>
              {t(
                summary.freshness.state === "delayed"
                  ? "summaryDelayed"
                  : "summaryPartial",
              )}
            </Text>
            <Text style={[styles.text, ink]}>{t("summaryCompleteness")}</Text>
          </Card>
          <Card>
            <Text accessibilityRole="header" style={[styles.label, ink]}>
              {t("salesBreakdown")}
            </Text>
            <View style={styles.row}>
              <Text style={[styles.text, ink]}>{t("billedSales")}</Text>
              <Text selectable style={[styles.label, ink]}>
                {money(summary.billedSalesMinor)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.text, ink]}>{t("returnsOnDay")}</Text>
              <Text selectable style={[styles.label, ink]}>
                {money(summary.refundsMinor)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.text, ink]}>{t("issuedBills")}</Text>
              <Text selectable style={[styles.label, ink]}>
                {new Intl.NumberFormat().format(summary.completedSales)}
              </Text>
            </View>
            <Text style={[styles.text, ink]}>{t("salesDefinition")}</Text>
          </Card>
        </>
      ) : (
        <Card>
          <Text accessibilityLiveRegion="polite" style={[styles.text, ink]}>
            {t(busy ? "summaryLoading" : (notice ?? "summaryUnavailable"))}
          </Text>
        </Card>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  hero: { padding: 22, borderRadius: 22, gap: 8 },
  title: { fontSize: 27, fontWeight: "700" },
  amount: { fontSize: 38, fontWeight: "700" },
  label: { fontSize: 17, lineHeight: 25, fontWeight: "600" },
  text: { fontSize: 15, lineHeight: 23 },
});
