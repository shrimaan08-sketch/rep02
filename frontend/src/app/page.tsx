"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ACCESS_TOKEN_COOKIE } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get(ACCESS_TOKEN_COOKIE);
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
