"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
} from "lucide-react";

interface Participant {
  id: string;
  joinedAt: string;
  leftAt: string | null;
  user: {
    id: string;
    email: string;
    username: string | null;
    name: string | null;
    banned: boolean;
  };
}

interface Room {
  id: string;
  status: "WAITING" | "ACTIVE" | "ENDED";
  topicTags: string[];
  createdAt: string;
  endedAt: string | null;
  lastMessageAt: string | null;
  participants: Participant[];
  reports: Array<{ id: string; status: string }>;
  _count: {
    participants: number;
    reports: number;
  };
}

export default function RoomsPage() {
  const { admin: _admin } = useAdminAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/admin/manage/rooms?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING":
        return <Badge variant="secondary">Waiting</Badge>;
      case "ACTIVE":
        return (
          <Badge variant="outline" className="border-success-border text-success">
            Active
          </Badge>
        );
      case "ENDED":
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserDisplay = (user: Participant["user"]) => {
    return user.username || user.name || user.email;
  };

  const viewRoomDetails = (room: Room) => {
    setSelectedRoom(room);
    setDetailsOpen(true);
  };

  if (loading && rooms.length === 0) {
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
                <Skeleton key={i} className="h-20 w-full" />
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
        <h1 className="text-2xl font-bold sm:text-3xl">Chat Rooms</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Monitor and manage chat rooms
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            All Rooms
          </CardTitle>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              <SelectItem value="WAITING">Waiting</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ENDED">Ended</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-mono text-xs">
                      {room.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{getStatusBadge(room.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{room._count.participants}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <span>{room._count.reports}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(room.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewRoomDetails(room)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4 lg:hidden">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 font-mono text-xs text-muted-foreground">
                        {room.id.slice(0, 12)}...
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(room.status)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{room._count.participants} users</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span>{room._count.reports} reports</span>
                    </div>
                  </div>

                  <div className="mb-3 text-sm text-muted-foreground">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => viewRoomDetails(room)}
                    className="w-full"
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {rooms.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p>No rooms found</p>
            </div>
          )}

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

      {/* Room Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Room Details</DialogTitle>
            <DialogDescription>
              View participants and room information
            </DialogDescription>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Room ID</div>
                  <div className="font-mono text-sm">{selectedRoom.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getStatusBadge(selectedRoom.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="text-sm">
                    {new Date(selectedRoom.createdAt).toLocaleString()}
                  </div>
                </div>
                {selectedRoom.endedAt && (
                  <div>
                    <div className="text-sm text-muted-foreground">Ended</div>
                    <div className="text-sm">
                      {new Date(selectedRoom.endedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {selectedRoom.topicTags.length > 0 && (
                <div>
                  <div className="mb-2 text-sm text-muted-foreground">Topics</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.topicTags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-3 text-sm font-medium">
                  Participants ({selectedRoom.participants.length})
                </div>
                <div className="space-y-2">
                  {selectedRoom.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {getUserDisplay(participant.user)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {participant.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined:{" "}
                          {new Date(participant.joinedAt).toLocaleString()}
                        </div>
                      </div>
                      {participant.user.banned && (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRoom._count.reports > 0 && (
                <div className="rounded-lg bg-signature-yellow/20 border border-border p-3">
                  <div className="flex items-center gap-2 text-foreground">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      {selectedRoom._count.reports} report(s) filed for this
                      room
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
