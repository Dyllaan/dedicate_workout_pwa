import useTabState from "@/hooks/useTabState";

export default function usePeriodisationHubState<T extends string>(
  validTabs: readonly T[],
  defaultTab: T,
  aliases?: Partial<Record<string, T>>,
  disabledTabs?: Partial<Record<T, boolean>>,
) {
  const { activeTab, setActiveTab } = useTabState({
    validTabs,
    defaultTab,
    queryParam: "tab",
    aliases,
    disabledTabs,
  });

  return { activeTab, setActiveTab };
}
