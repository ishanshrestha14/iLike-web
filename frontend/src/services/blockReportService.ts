import api from "./api";

export interface BlockedUser {
  userId: string;
  name: string;
  profilePicture: string | null;
  blockedAt: string;
}

export const getBlockedUsers = async (): Promise<BlockedUser[]> => {
  const { data } = await api.get<{ success: boolean; data: BlockedUser[] }>("/users/block");
  return data.data;
};

export const blockUser = async (userId: string): Promise<void> => {
  await api.post(`/users/block/${userId}`);
};

export const unblockUser = async (userId: string): Promise<void> => {
  await api.delete(`/users/block/${userId}`);
};

export type ReportReason =
  | "inappropriate"
  | "spam"
  | "harassment"
  | "fake_profile"
  | "other";

export const reportUser = async (
  userId: string,
  reason: ReportReason,
  description?: string
): Promise<void> => {
  await api.post(`/users/report/${userId}`, { reason, description });
};
