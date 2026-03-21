import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { AuthenticationError } from "@/core/errors/error-classes";
import { listSavedListsForUser } from "@/core/persistence/saved-lists-repo";

export const GET = withApiHandler(async () => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const savedLists = await listSavedListsForUser(auth.userId);

  return successResponse({
    savedLists,
  });
});
