export async function createAndSendInviteWithRollback<TInvitation, TResponse>(
  createInvitation: () => Promise<TInvitation>,
  sendInvitation: (invitation: TInvitation) => Promise<void>,
  rollbackInvitation: (invitation: TInvitation) => Promise<void>,
  mapResponse: (invitation: TInvitation) => TResponse,
): Promise<TResponse> {
  const invitation = await createInvitation();

  try {
    await sendInvitation(invitation);
  } catch (error) {
    await rollbackInvitation(invitation);
    throw error;
  }

  return mapResponse(invitation);
}
