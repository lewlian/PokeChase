"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface WatchlistOption {
  id: string;
  name: string;
  is_default: boolean;
}

interface CardState {
  inWatchlists: Array<{ watchlistId: string; subType: string }>;
  owned: Array<{ subType: string; quantity: number }>;
}

interface Ctx {
  signedIn: boolean;
  ready: boolean;
  watchlists: WatchlistOption[];
  stateFor: (productId: number) => CardState;
  toggleWatch: (listId: string, productId: number, subType: string) => Promise<void>;
  setQuantity: (productId: number, subType: string, quantity: number) => Promise<void>;
  /** Creates a watchlist; resolves to an error message or null on success. */
  createWatchlist: (name: string) => Promise<string | null>;
  requestSignIn: () => void;
}

const CardStateContext = createContext<Ctx | null>(null);
const EMPTY: CardState = { inWatchlists: [], owned: [] };

/** Fetches watchlist/portfolio state for a page of cards in one request and
 *  shares it with every row, so table actions don't fan out per row. */
export function CardStateProvider({
  productIds,
  signedIn,
  children,
}: {
  productIds: number[];
  signedIn: boolean;
  children: ReactNode;
}) {
  const [watchlists, setWatchlists] = useState<WatchlistOption[]>([]);
  const [states, setStates] = useState<Record<number, CardState>>({});
  const [ready, setReady] = useState(false);
  const idKey = productIds.join(",");

  const load = useCallback(async () => {
    if (!signedIn || !idKey) return;
    const res = await fetch(`/api/v1/me/card-states?ids=${idKey}`);
    if (!res.ok) return;
    const json = await res.json();
    setWatchlists(json.watchlists ?? []);
    setStates(json.states ?? {});
    setReady(true);
  }, [signedIn, idKey]);

  useEffect(() => {
    if (!signedIn) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [signedIn, load]);

  const value = useMemo<Ctx>(
    () => ({
      signedIn,
      ready,
      watchlists,
      stateFor: (productId) => states[productId] ?? EMPTY,
      toggleWatch: async (listId, productId, subType) => {
        const inList = (states[productId] ?? EMPTY).inWatchlists.some(
          (w) => w.watchlistId === listId && w.subType === subType,
        );
        // optimistic
        setStates((prev) => {
          const cur = prev[productId] ?? EMPTY;
          return {
            ...prev,
            [productId]: {
              ...cur,
              inWatchlists: inList
                ? cur.inWatchlists.filter((w) => !(w.watchlistId === listId && w.subType === subType))
                : [...cur.inWatchlists, { watchlistId: listId, subType }],
            },
          };
        });
        await fetch(`/api/v1/me/watchlists/${listId}/items`, {
          method: inList ? "DELETE" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, subType }),
        });
        await load();
      },
      setQuantity: async (productId, subType, quantity) => {
        setStates((prev) => {
          const cur = prev[productId] ?? EMPTY;
          const owned = cur.owned.filter((o) => o.subType !== subType);
          if (quantity > 0) owned.push({ subType, quantity });
          return { ...prev, [productId]: { ...cur, owned } };
        });
        await fetch("/api/v1/me/portfolio", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, subType, quantity }),
        });
        await load();
      },
      createWatchlist: async (name) => {
        const res = await fetch("/api/v1/me/watchlists", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          return json.error ?? "Couldn't create the watchlist";
        }
        await load();
        return null;
      },
      requestSignIn: () => {
        window.dispatchEvent(
          new CustomEvent("pokechase:signin", {
            detail: { next: window.location.pathname + window.location.search },
          }),
        );
      },
    }),
    [signedIn, ready, watchlists, states, load],
  );

  return <CardStateContext.Provider value={value}>{children}</CardStateContext.Provider>;
}

export function useCardState(): Ctx | null {
  return useContext(CardStateContext);
}
