import { successResponse } from "@/api/_lib/api-response";
import { requireAppUser } from "@/api/_lib/app-user";
import { withApiHandler } from "@/api/_lib/error-handler";
import { listSavedListsForUser } from "@/core/persistence/saved-lists-repo";

export const GET = withApiHandler(async () => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const savedLists = await listSavedListsForUser(auth.userId);

  return successResponse({
    savedLists,
  });
});
