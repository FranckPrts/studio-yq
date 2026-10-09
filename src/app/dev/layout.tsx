import { notFound } from "next/navigation";

/**
 * Everything under `/dev` is a workbench, not a product surface, so production
 * does not serve it at all. `/dev/primitives` touches no database and has no
 * sign-in; `/dev/sketch` is admin-gated, but an admin's bench still has no
 * business on the public domain. Both stay one `npm run dev` away.
 */
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
