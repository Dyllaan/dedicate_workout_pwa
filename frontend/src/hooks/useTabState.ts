import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

type UseTabStateOptions<T extends string> = {
  validTabs: readonly T[];
  defaultTab: T;
  queryParam?: string;
  aliases?: Partial<Record<string, T>>;
  disabledTabs?: Partial<Record<T, boolean>>;
};

function resolveTab<T extends string>(
  rawTab: string | null,
  validTabs: readonly T[],
  defaultTab: T,
  aliases?: Partial<Record<string, T>>,
) {
  if (!rawTab) return defaultTab;

  const aliased = aliases?.[rawTab] ?? rawTab;
  return validTabs.includes(aliased as T) ? (aliased as T) : defaultTab;
}

export default function useTabState<T extends string>({
  validTabs,
  defaultTab,
  queryParam,
  aliases,
  disabledTabs,
}: UseTabStateOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localTab, setLocalTab] = useState(defaultTab);

  const activeTab = useMemo(() => {
    const resolved = queryParam
      ? resolveTab(searchParams.get(queryParam), validTabs, defaultTab, aliases)
      : localTab;

    return disabledTabs?.[resolved] ? defaultTab : resolved;
  }, [aliases, defaultTab, disabledTabs, localTab, queryParam, searchParams, validTabs]);

  const setActiveTab = useCallback(
    (tab: T) => {
      if (disabledTabs?.[tab]) return;

      if (!queryParam) {
        setLocalTab(tab);
        return;
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set(queryParam, tab);
      setSearchParams(nextParams, { replace: true });
    },
    [disabledTabs, queryParam, searchParams, setSearchParams],
  );

  return { activeTab, setActiveTab };
}
