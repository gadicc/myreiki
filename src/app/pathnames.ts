import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { ReadonlyURLSearchParams } from "next/navigation";

const pathnames: {
  [key: string]:
    | MessageDescriptor
    | (({
        pathname,
        searchParams,
      }: {
        pathname: string;
        searchParams: ReadonlyURLSearchParams | null;
      }) => MessageDescriptor);
} = {
  "/": ({ searchParams }) => {
    const tab = searchParams?.get("tab");
    if (tab === "1") return msg`Treatments`;
    if (tab === "2") return msg`Clients`;
    return msg`Home`;
  },
  "/clients": msg`Clients`,
  "/treatments": msg`Treatments`,
  "/practices": msg`Practices`,
  "/account": msg`Account`,
  "/about": msg`About`,
  "/admin": msg`Admin`,
};

export default pathnames;
