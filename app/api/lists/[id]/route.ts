import { successResponse } from "@/api/_lib/api-response";
import { requireAppUser } from "@/api/_lib/app-user";
import { withApiHandler } from "@/api/_lib/error-handler";
import { NotFoundError } from "@/core/errors/error-classes";
import { getSavedListById } from "@/core/persistence/saved-lists-repo";

export const GET = withApiHandler(async (
  _request: Request,
  context: { params: { id: string } }
) => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const savedList = await getSavedListById(auth.userId, context.params.id);

  if (!savedList) {
    throw new NotFoundError("Saved list");
  }

  return successResponse({
    savedList,
  });
});
