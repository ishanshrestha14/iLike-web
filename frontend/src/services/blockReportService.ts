import api from "./api";

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
