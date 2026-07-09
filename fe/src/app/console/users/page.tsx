"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Phone,
  Eye,
  Download,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  isAnonymous: boolean;
  banned: boolean;
  phoneNumber: string | null;
  gender: string | null;
  createdAt: string;
  _count: {
    participants: number;
    reportsMade: number;
    reportsAgainst: number;
  };
}

export default function UsersPage() {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bannedFilter, setBannedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    action: "ban" | "unban" | "delete";
    username: string;
  }>({ open: false, userId: "", action: "ban", username: "" });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canBanUsers =
    admin && (admin.role === "ADMIN" || admin.role === "SUPER_ADMIN");
  const canDeleteUsers = admin && admin.role === "SUPER_ADMIN";

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search) params.append("search", search);
      if (bannedFilter !== "all") params.append("banned", bannedFilter);

      const response = await fetch(`/api/admin/manage/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, bannedFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleExport = async (format: "excel" | "json") => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ export: "true" });
      if (search) params.append("search", search);
      if (bannedFilter !== "all") params.append("banned", bannedFilter);

      const response = await fetch(`/api/admin/manage/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users for export");
      const data = await response.json();
      const exportUsers: User[] = data.users;

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

      if (format === "json") {
        const blob = new Blob([JSON.stringify(exportUsers, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const XLSX = await import("xlsx");
        const rows = exportUsers.map((user) => ({
          ID: user.id,
          Email: user.email,
          Username: user.username || "",
          Name: user.name || "",
          Anonymous: user.isAnonymous,
          Banned: user.banned,
          "Phone Number": user.phoneNumber || "",
          Gender: user.gender || "",
          "Rooms Joined": user._count.participants,
          "Reports Made": user._count.reportsMade,
          "Reports Against": user._count.reportsAgainst,
          "Joined At": new Date(user.createdAt).toISOString(),
        }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
        XLSX.writeFile(workbook, `users-${timestamp}.xlsx`);
      }
    } catch (error) {
      console.error("Failed to export users:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleBanAction = async (
    userId: string,
    action: "ban" | "unban" | "delete",
  ) => {
    try {
      setActionLoading(userId);

      if (action === "delete") {
        const response = await fetch(
          `/api/admin/manage/users/${userId}/delete`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (response.ok) {
          fetchUsers();
        }
      } else {
        const response = await fetch(
          `/api/admin/manage/users/${userId}/${action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: `${action === "ban" ? "Banned" : "Unbanned"} by admin`,
            }),
          },
        );

        if (response.ok) {
          fetchUsers();
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    } finally {
      setActionLoading(null);
      setConfirmDialog({
        open: false,
        userId: "",
        action: "ban",
        username: "",
      });
    }
  };

  const openConfirmDialog = (
    userId: string,
    action: "ban" | "unban" | "delete",
    username: string,
  ) => {
    setConfirmDialog({ open: true, userId, action, username });
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  if (loading && users.length === 0) {
    return (
      <div className="p-4 sm:p-8">
        <Skeleton className="mb-6 h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">User Management</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          View and manage platform users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <Input
                placeholder="Search by email or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select value={bannedFilter} onValueChange={setBannedFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="false">Active Only</SelectItem>
                <SelectItem value="true">Banned Only</SelectItem>
              </SelectContent>
            </Select>

            {canBanUsers && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="shrink-0"
                    disabled={exporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exporting ? "Exporting..." : "Export"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("excel")}>
                    Export as Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Joined</TableHead>
                  {canBanUsers && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.username || user.name || "Anonymous"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.phoneNumber ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{user.phoneNumber}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No phone</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.banned && (
                          <Badge variant="destructive">Banned</Badge>
                        )}
                        {user.isAnonymous && (
                          <Badge variant="outline">Anonymous</Badge>
                        )}
                        {!user.banned && !user.isAnonymous && (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{user._count.participants} rooms</div>
                        <div className="text-muted-foreground">
                          {user._count.reportsAgainst} reports
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canBanUsers && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewUserDetails(user)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user.banned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openConfirmDialog(
                                  user.id,
                                  "unban",
                                  user.username || user.email,
                                )
                              }
                              disabled={actionLoading === user.id}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Unban
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                openConfirmDialog(
                                  user.id,
                                  "ban",
                                  user.username || user.email,
                                )
                              }
                              disabled={actionLoading === user.id}
                            >
                              <Ban className="mr-1 h-3 w-3" />
                              Ban
                            </Button>
                          )}
                          {canDeleteUsers && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                openConfirmDialog(
                                  user.id,
                                  "delete",
                                  user.username || user.email,
                                )
                              }
                              disabled={actionLoading === user.id}
                              title="Delete user permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="space-y-4 lg:hidden">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="mb-3">
                    <div className="font-medium">
                      {user.username || user.name || "Anonymous"}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    {user.phoneNumber && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{user.phoneNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1">
                    {user.banned && <Badge variant="destructive">Banned</Badge>}
                    {user.isAnonymous && (
                      <Badge variant="outline">Anonymous</Badge>
                    )}
                    {!user.banned && !user.isAnonymous && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>

                  <div className="mb-3 text-sm text-muted-foreground">
                    <div>{user._count.participants} rooms joined</div>
                    <div>{user._count.reportsAgainst} reports</div>
                    <div>
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {canBanUsers && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewUserDetails(user)}
                        className="w-full"
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View Details
                      </Button>
                      <div className="flex gap-2">
                        {user.banned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openConfirmDialog(
                                user.id,
                                "unban",
                                user.username || user.email,
                              )
                            }
                            disabled={actionLoading === user.id}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              openConfirmDialog(
                                user.id,
                                "ban",
                                user.username || user.email,
                              )
                            }
                            disabled={actionLoading === user.id}
                            className="flex-1"
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Ban
                          </Button>
                        )}
                        {canDeleteUsers && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              openConfirmDialog(
                                user.id,
                                "delete",
                                user.username || user.email,
                              )
                            }
                            disabled={actionLoading === user.id}
                            title="Delete permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "ban" && "Ban User"}
              {confirmDialog.action === "unban" && "Unban User"}
              {confirmDialog.action === "delete" && "Delete User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "delete" ? (
                <span className="text-destructive font-semibold">
                  Are you sure you want to permanently delete{" "}
                  {confirmDialog.username}? This action cannot be undone and
                  will remove all user data.
                </span>
              ) : (
                <>
                  Are you sure you want to {confirmDialog.action}{" "}
                  {confirmDialog.username}?
                  {confirmDialog.action === "ban" &&
                    " This will prevent them from accessing the platform."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleBanAction(confirmDialog.userId, confirmDialog.action)
              }
              className={
                confirmDialog.action === "ban" ||
                confirmDialog.action === "delete"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : ""
              }
            >
              {confirmDialog.action === "delete"
                ? "Delete Permanently"
                : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Username
                  </label>
                  <p className="mt-1">{selectedUser.username || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="mt-1">{selectedUser.name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone Number
                  </label>
                  <p className="mt-1 flex items-center gap-2">
                    {selectedUser.phoneNumber ? (
                      <>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedUser.phoneNumber}
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Gender
                  </label>
                  <p className="mt-1 capitalize">
                    {selectedUser.gender || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Joined
                  </label>
                  <p className="mt-1">
                    {new Date(selectedUser.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Status</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.banned && (
                    <Badge variant="destructive">Banned</Badge>
                  )}
                  {selectedUser.isAnonymous && (
                    <Badge variant="outline">Anonymous</Badge>
                  )}
                  {!selectedUser.banned && !selectedUser.isAnonymous && (
                    <Badge variant="secondary">Active</Badge>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Activity Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Rooms Joined</p>
                    <p className="text-2xl font-bold text-foreground">
                      {selectedUser._count.participants}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Reports Made</p>
                    <p className="text-2xl font-bold text-foreground">
                      {selectedUser._count.reportsMade}
                    </p>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Reports Against</p>
                    <p className="text-2xl font-bold text-destructive">
                      {selectedUser._count.reportsAgainst}
                    </p>
                  </div>
                </div>
              </div>

              {canBanUsers && (
                <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                  {selectedUser.banned ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailsOpen(false);
                        openConfirmDialog(
                          selectedUser.id,
                          "unban",
                          selectedUser.username || selectedUser.email,
                        );
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Unban User
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDetailsOpen(false);
                        openConfirmDialog(
                          selectedUser.id,
                          "ban",
                          selectedUser.username || selectedUser.email,
                        );
                      }}
                      className="flex-1"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Ban User
                    </Button>
                  )}
                  {canDeleteUsers && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDetailsOpen(false);
                        openConfirmDialog(
                          selectedUser.id,
                          "delete",
                          selectedUser.username || selectedUser.email,
                        );
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
