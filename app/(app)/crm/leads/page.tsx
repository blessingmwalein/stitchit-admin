"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api/crm";
import { LEAD_STAGES, type Lead, type LeadStage } from "@/lib/types/crm";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Phone, Mail } from "lucide-react";
import { LeadFormModal } from "@/components/modules/crm/lead-form-modal";

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW_LEAD: "New",
  CONTACTED: "Contacted",
  DESIGN_DISCUSSION: "Design",
  QUOTATION_SENT: "Quote Sent",
  NEGOTIATION: "Negotiating",
  DEPOSIT_RECEIVED: "Deposit",
  PRODUCTION: "In Production",
  DELIVERED: "Delivered",
  LOST: "Lost",
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = React.useState(false);
  const { data: kanban = {}, isLoading } = useQuery({
    queryKey: ["leads-kanban"],
    queryFn: () => leadsApi.byStage(),
    refetchInterval: 30_000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      leadsApi.move(id, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast.success("Lead moved");
    },
    onError: () => toast.error("Failed to move lead"),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Leads" />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Leads" description="CRM pipeline">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New lead
        </Button>
      </PageHeader>

      <LeadFormModal open={showCreate} onOpenChange={setShowCreate} />

      <ScrollArea className="flex-1 p-4">
        <div className="flex gap-3 pb-4" style={{ minWidth: `${LEAD_STAGES.length * 240}px` }}>
          {LEAD_STAGES.map((stage) => {
            const leads: Lead[] = kanban[stage] ?? [];
            return (
              <div key={stage} className="w-56 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {STAGE_LABELS[stage]}
                  </span>
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full text-xs">
                    {leads.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onMove={(s) => moveMutation.mutate({ id: lead.id, stage: s })} />
                  ))}
                  {leads.length === 0 && (
                    <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (stage: string) => void }) {
  const router = useRouter();
  return (
    <Card
      className="cursor-pointer shadow-none transition-shadow hover:shadow-sm"
      onClick={() => router.push(`/crm/leads/${lead.id}`)}
    >
      <CardHeader className="p-3 pb-2">
        <p className="text-sm font-medium leading-none">{lead.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{lead.leadNumber}</p>
      </CardHeader>
      <CardContent className="space-y-1 p-3 pt-0">
        {lead.estimatedValue && (
          <p className="text-xs font-medium text-green-700">
            ${Number(lead.estimatedValue).toFixed(0)}
          </p>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {lead.phone && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {lead.phone}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
