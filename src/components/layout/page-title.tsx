"use client";

import { usePathname } from "next/navigation";
import { getPageTitle } from "./nav-items";

export function PageTitle() {
  const pathname = usePathname();
  return <p className="truncate text-sm font-medium">{getPageTitle(pathname)}</p>;
}
