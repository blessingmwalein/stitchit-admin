"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api/crm";
import { LEAD_STAGES } from "@/lib/types/crm";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowLeft, UserCheck } from "lucide-react";

const LEAD_STAGE_ORDER = [...LEAD_STAGES];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => leadsApi.get(id),
  });

  const moveMut = useMutation({
    mutationFn: (stage: string) => leadsApi.move(id, stage),
    onSuccess: () => { toast.success("Stage updated"); qc.invalidateQueries({ queryKey: ["lead", id] }); },
  });

  const convertMut = useMutation({
    mutationFn: () => leadsApi.convert(id),
    onSuccess: (res) => { toast.success("Converted to customer"); router.push(`/crm/customers/${res.customerId}`); },
    onError: () => toast.error("Conversion failed"),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!lead) return <div className="p-6 text-sm text-red-600">Lead not found</div>;

  const currentIdx = LEAD_STAGE_ORDER.indexOf(lead.stage);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader title={lead.name} description={<StatusBadge status={lead.stage} />}>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />Back
        </Button>
        {!lead.customerId && lead.stage !== "LOST" && lead.stage !== "DELIVERED" && (
          <ConfirmDialog
            trigger={<Button size="sm"><UserCheck className="mr-1 h-4 w-4" />Convert to customer</Button>}
            title="Convert lead to customer?"
            description={`This will create a customer record for ${lead.name}.`}
            onConfirm={() => convertMut.mutateAsync()}
          />
        )}
      </PageHeader>

      <div className="px-6">
        <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
          {LEAD_STAGE_ORDER.map((stage, i) => {
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <button
                key={stage}
                onClick={() => !isActive && moveMut.mutate(stage)}
                disabled={moveMut.isPending}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" :
                  isDone ? "bg-muted line-through text-muted-foreground" :
                  "border hover:bg-muted text-muted-foreground"
                }`}
              >
                {stage.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">Stage History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{lead.name}</p></div>
                {lead.email && <div><p className="text-xs text-muted-foreground">Email</p><p>{lead.email}</p></div>}
                {lead.phone && <div><p className="text-xs text-muted-foreground">Phone</p><p>{lead.phone}</p></div>}
                {lead.source && <div><p className="text-xs text-muted-foreground">Source</p><p>{lead.source}</p></div>}
                {lead.assignedToName && <div><p className="text-xs text-muted-foreground">Assigned to</p><p>{lead.assignedToName}</p></div>}
                {lead.whatsappNumber && <div><p className="text-xs text-muted-foreground">WhatsApp</p><p>{lead.whatsappNumber}</p></div>}
                <div><p className="text-xs text-muted-foreground">Created</p><p>{format(new Date(lead.createdAt), "dd MMM yyyy")}</p></div>
                {lead.customerId && (
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <Button variant="link" className="h-auto p-0 text-sm" onClick={() => router.push(`/crm/customers/${lead.customerId}`)}>
                      View customer
                    </Button>
                  </div>
                )}
                {lead.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p>{lead.notes}</p></div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            {((lead as any).stageHistory ?? []).map((h: any) => (
              <div key={h.id} className="flex items-center gap-3 text-sm border-b pb-2">
                <Badge variant="outline" className="text-xs shrink-0">{h.toStage?.replace(/_/g, " ") ?? h.stage?.replace(/_/g, " ")}</Badge>
                <span className="text-muted-foreground text-xs">{format(new Date(h.createdAt), "dd MMM yyyy HH:mm")}</span>
                {h.changedByName && <span className="text-muted-foreground text-xs">by {h.changedByName}</span>}
              </div>
            ))}
            {((lead as any).stageHistory ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No stage history</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
