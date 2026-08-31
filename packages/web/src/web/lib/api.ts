import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "../../api";
import { obterToken } from "./session";

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  // Sessão por token Bearer — a mesma autenticação servirá o APK do tablet.
  headers: () => {
    const token = obterToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

/** Direct typed client: await client.auth.eu() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.dashboard.resumo.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);
