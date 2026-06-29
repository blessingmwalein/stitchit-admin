"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
};

async function listNotifications() {
  return apiClient.get<{ data: Notification[]; unreadCount: number }>("/notifications");
}

async function markAllRead() {
  return apiClient.post("/notifications/mark-all-read");
}

async function markRead(id: string) {
  return apiClient.post(`/notifications/${id}/mark-read`);
}

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 15_000,
  });

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneMut = useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.data ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="flex flex-col">
      <PageHeader title="Notifications" description={unread > 0 ? `${unread} unread` : "All caught up"}>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending}>
            <CheckCheck className="mr-1 h-4 w-4" />Mark all read
          </Button>
        )}
      </PageHeader>

      <div className="flex-1 px-6 pt-4 max-w-2xl space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Bell className="h-10 w-10 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40 transition-colors",
              !n.isRead && "border-primary/30 bg-primary/5"
            )}
            onClick={() => !n.isRead && markOneMut.mutate(n.id)}
          >
            <div className="mt-0.5 shrink-0">
              {!n.isRead ? (
                <span className="flex h-2 w-2 rounded-full bg-primary" />
              ) : (
                <span className="flex h-2 w-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</p>
                {n.entityType && <Badge variant="outline" className="text-xs shrink-0">{n.entityType}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
