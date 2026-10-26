import { db } from "@/lib/db";

/**
 * Names the people behind the database setup steps. Any collaborator may
 * connect or provision, so the page says who did rather than implying the
 * owner did. A null id (set before we recorded it) or a deleted account reads
 * as null and the page says nothing.
 */
export async function databaseActors(connection: {
  connectedById: string | null;
  provisionedById: string | null;
} | null): Promise<{ connectedBy: string | null; provisionedBy: string | null }> {
  const ids = [connection?.connectedById, connection?.provisionedById].filter(
    (id): id is string => !!id,
  );
  if (ids.length === 0) return { connectedBy: null, provisionedBy: null };

  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, displayName: true },
  });
  const name = (id: string | null | undefined) => {
    const user = users.find((u) => u.id === id);
    return user ? (user.displayName ?? user.email) : null;
  };
  return {
    connectedBy: name(connection?.connectedById),
    provisionedBy: name(connection?.provisionedById),
  };
}
