import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { toast } from "react-toastify";
import {
  getAdminReports,
  updateReport,
  type AdminReport,
  type ReportStatus,
} from "@/services/adminService";

const statusClasses: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

const statusLabel: Record<ReportStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const reasonLabel: Record<string, string> = {
  inappropriate: "Inappropriate Content",
  spam: "Spam",
  harassment: "Harassment",
  fake_profile: "Fake Profile",
  other: "Other",
};

const getStatusBadge = (status: ReportStatus) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || "bg-gray-100 text-gray-800"}`}>
    {statusLabel[status] ?? status}
  </span>
);

const Reports = () => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminReports({
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 50,
      });
      setReports(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Sync admin note when a report is selected
  useEffect(() => {
    setAdminNote(selectedReport?.adminNote ?? "");
  }, [selectedReport?.id]);

  const handleStatusChange = async (status: ReportStatus) => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const updated = await updateReport(selectedReport.id, { status, adminNote });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedReport(updated);
      toast.success(`Report marked as ${statusLabel[status].toLowerCase()}`);
    } catch {
      toast.error("Failed to update report");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const updated = await updateReport(selectedReport.id, { adminNote });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedReport(updated);
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout title="Reports Management" subtitle="Review and manage user reports">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Reports List */}
        <div className={`${selectedReport ? "lg:w-1/2" : "w-full"}`}>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Reports
                  {!loading && (
                    <span className="ml-2 text-sm font-normal text-gray-500">({total})</span>
                  )}
                </h3>
                <select
                  className="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 rounded-lg border"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setSelectedReport(null);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No reports found</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <li
                    key={report.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedReport?.id === report.id ? "bg-gray-50" : ""}`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-pink-600 truncate">
                          {report.reported?.name ?? "Deleted user"} — {reasonLabel[report.reason] ?? report.reason}
                        </p>
                        <div className="ml-2 flex-shrink-0">
                          {getStatusBadge(report.status)}
                        </div>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <p className="text-sm text-gray-500">
                          Reported by: {report.reporter?.name ?? "Deleted user"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Report Detail */}
        {selectedReport ? (
          <div className="lg:w-1/2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Report Details</h3>
                <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-4 py-5 sm:p-6 space-y-5">
                {/* Reported user */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reported User</h4>
                  <p className="text-sm font-medium text-gray-900">{selectedReport.reported?.name ?? "—"}</p>
                  <p className="text-sm text-gray-500">{selectedReport.reported?.email ?? "—"}</p>
                </div>

                {/* Reporter */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reported By</h4>
                  <p className="text-sm font-medium text-gray-900">{selectedReport.reporter?.name ?? "—"}</p>
                  <p className="text-sm text-gray-500">{selectedReport.reporter?.email ?? "—"}</p>
                </div>

                {/* Reason */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reason</h4>
                  <p className="text-sm text-gray-900">{reasonLabel[selectedReport.reason] ?? selectedReport.reason}</p>
                </div>

                {/* Description */}
                {selectedReport.description && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</h4>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{selectedReport.description}</p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Current Status</h4>
                  {getStatusBadge(selectedReport.status)}
                  {selectedReport.resolvedBy && (
                    <p className="text-xs text-gray-500 mt-1">
                      By {selectedReport.resolvedBy.name} on {new Date(selectedReport.resolvedAt!).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Admin Note */}
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Admin Note</h4>
                  <textarea
                    rows={3}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                    placeholder="Add a note about this report..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                  <button
                    onClick={handleSaveNote}
                    disabled={actionLoading || adminNote === selectedReport.adminNote}
                    className="mt-1 text-xs text-pink-600 hover:text-pink-700 disabled:opacity-40"
                  >
                    Save note
                  </button>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                  {selectedReport.status !== "reviewed" && (
                    <button
                      onClick={() => handleStatusChange("reviewed")}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50"
                    >
                      Mark Reviewed
                    </button>
                  )}
                  {selectedReport.status !== "dismissed" && (
                    <button
                      onClick={() => handleStatusChange("dismissed")}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  )}
                  {selectedReport.status !== "resolved" && (
                    <button
                      onClick={() => handleStatusChange("resolved")}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
            <div className="text-center p-6">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No report selected</h3>
              <p className="mt-1 text-sm text-gray-500">Select a report from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Reports;
