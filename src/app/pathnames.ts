import { ReadonlyURLSearchParams } from "next/navigation";

const pathnames: {
  [key: string]:
    | string
    | (({
        pathname,
        searchParams,
      }: {
        pathname: string;
        searchParams: ReadonlyURLSearchParams | null;
      }) => string);
} = {
  "/": ({ searchParams }) => {
    const tab = searchParams?.get("tab");
    if (tab === "1") return "Treatments";
    if (tab === "2") return "Clients";
    return "Home";
  },
  "/clients": "Clients",
  "/treatments": "Treatments",
  "/practices": "Practices",
  "/account": "Account",
  "/about": "About",
  "/admin": "Admin",
};

export default pathnames;
