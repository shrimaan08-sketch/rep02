import useSWR, { SWRConfiguration } from "swr";
import api from "./api";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useApi<T>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, config);
}

export default fetcher;
