"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface Client {
  id: string;
  slug: string;
  name: string;
}

interface ClientContextValue {
  clientId: string | null;
  clientSlug: string | null;
  clients: Client[];
  setClient: (slug: string | null) => void;
  isAdmin: boolean;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

interface ClientProviderProps {
  children: ReactNode;
  initialClients?: Client[];
  initialRole?: "admin" | "client";
}

export function ClientProvider({
  children,
  initialClients = [],
  initialRole = "admin",
}: ClientProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients] = useState<Client[]>(initialClients);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = initialRole === "admin";

  // Read client slug from URL search param
  const clientSlugFromUrl = searchParams.get("client");

  // Derive clientId from slug
  const activeClient = clients.find((c) => c.slug === clientSlugFromUrl) ?? null;
  const clientId = activeClient?.id ?? null;
  const clientSlug = activeClient?.slug ?? null;

  useEffect(() => {
    // Simulate initial load completing
    setIsLoading(false);
  }, []);

  const setClient = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (slug) {
        params.set("client", slug);
      } else {
        params.delete("client");
      }

      const queryString = params.toString();
      const currentPath = window.location.pathname;
      router.push(queryString ? `${currentPath}?${queryString}` : currentPath);
    },
    [router, searchParams]
  );

  return (
    <ClientContext.Provider
      value={{
        clientId,
        clientSlug,
        clients,
        setClient,
        isAdmin,
        isLoading,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}
