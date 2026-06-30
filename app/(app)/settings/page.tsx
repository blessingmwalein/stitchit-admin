"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { companyApi, numberingApi, settingsApi, usersApi, rolesApi } from "@/lib/api/settings";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ColumnDef } from "@tanstack/react-table";
import type { Role, NumberingSetting, StaffUser } from "@/lib/types/settings";

// -- Company Tab --
const companySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
  website: z.string().optional(),
});
type CompanyForm = z.infer<typeof companySchema>;

function CompanyTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["company"], queryFn: companyApi.get });
  const mut = useMutation({
    mutationFn: companyApi.update,
    onSuccess: () => { toast.success("Company saved"); qc.invalidateQueries({ queryKey: ["company"] }); },
    onError: () => toast.error("Save failed"),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });
  React.useEffect(() => { if (data) reset(data); }, [data, reset]);

  return (
    <Card>
      <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="grid grid-cols-2 gap-4 max-w-lg">
          {([["name","Company name"],["phone","Phone"],["email","Email"],["address","Address"],["city","City"],["country","Country"],["vatNumber","VAT Number"],["website","Website"]] as [keyof CompanyForm, string][]).map(([field, label]) => (
            <div key={field} className="flex flex-col gap-1">
              <Label className="text-xs">{label}</Label>
              <Input {...register(field)} className="h-8 text-sm" />
              {errors[field] && <p className="text-xs text-red-600">{errors[field]?.message}</p>}
            </div>
          ))}
          <div className="col-span-2">
            <Button type="submit" size="sm" disabled={mut.isPending}>Save changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// -- Users Tab --
const userCols: ColumnDef<StaffUser>[] = [
  { header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.firstName} {row.original.lastName}</span> },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "roleName", header: "Role", cell: ({ row }) => row.original.roleName ?? "—" },
  { accessorKey: "isActive", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.isActive ? "ACTIVE" : "INACTIVE"} /> },
];

function UsersTab() {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list({ pageSize: 100 }) });
  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm">Invite user</Button>
      </div>
      <DataTable columns={userCols as any} data={data?.data ?? []} total={data?.meta?.total} loading={isLoading} />
    </div>
  );
}

// -- Roles Tab --
function RolesTab() {
  const { data: rolesData, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => rolesApi.list() });
  const roles: Role[] = Array.isArray(rolesData) ? rolesData : (rolesData as any)?.data ?? [];
  return (
    <div className="grid gap-3 max-w-lg">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : roles.map((role: Role) => (
        <Card key={role.id}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{role.name}</p>
                {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{(role as any).permissionCount ?? role.permissions?.length ?? 0} permissions</p>
              </div>
              {!(role as any).isSystem && <Button variant="outline" size="sm">Edit</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" className="w-fit">New role</Button>
    </div>
  );
}

// -- Numbering Tab --
function NumberingTab() {
  const qc = useQueryClient();
  const { data: sequences = [], isLoading } = useQuery({ queryKey: ["numbering"], queryFn: numberingApi.list });

  const updateMut = useMutation({
    mutationFn: ({ docType, nextNumber }: { docType: string; nextNumber: number }) => numberingApi.reset(docType, nextNumber),
    onSuccess: () => { toast.success("Sequence updated"); qc.invalidateQueries({ queryKey: ["numbering"] }); },
  });

  return (
    <div className="max-w-lg">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 text-left font-medium pr-4">Document type</th>
              <th className="py-2 text-left font-medium pr-4">Prefix</th>
              <th className="py-2 text-left font-medium pr-4">Padding</th>
              <th className="py-2 text-left font-medium pr-4">Next number</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sequences.map((seq: NumberingSetting) => (
              <NumberingRow key={seq.id} seq={seq} onSave={(next) => updateMut.mutate({ docType: seq.entity, nextNumber: next })} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function NumberingRow({ seq, onSave }: { seq: NumberingSetting; onSave: (n: number) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(seq.nextNumber);
  return (
    <tr className="border-b">
      <td className="py-2 pr-4 font-medium capitalize">{seq.entity.replace(/_/g, " ").toLowerCase()}</td>
      <td className="py-2 pr-4 font-mono text-xs">{seq.prefix}</td>
      <td className="py-2 pr-4">{seq.padding}</td>
      <td className="py-2 pr-4">
        {editing
          ? <Input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} className="h-7 w-24 text-sm" />
          : <span className="tabular-nums">{seq.nextNumber}</span>
        }
      </td>
      <td className="py-2 text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { onSave(val); setEditing(false); }}>Save</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </td>
    </tr>
  );
}

// -- Pricing Tab --
function PricingTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", "pricing"], queryFn: () => settingsApi.pricing() });
  const mut = useMutation({
    mutationFn: settingsApi.updatePricing,
    onSuccess: () => { toast.success("Pricing saved"); qc.invalidateQueries({ queryKey: ["settings", "pricing"] }); },
  });
  const { register, handleSubmit, reset } = useForm<Record<string, number>>();
  React.useEffect(() => { if (data) reset(data); }, [data, reset]);

  return (
    <Card>
      <CardHeader><CardTitle>Pricing Parameters</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="grid grid-cols-2 gap-4 max-w-md">
          {data && Object.keys(data).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
              <Input type="number" step="any" {...register(key, { valueAsNumber: true })} className="h-8 text-sm" />
            </div>
          ))}
          <div className="col-span-2">
            <Button type="submit" size="sm" disabled={mut.isPending}>Save pricing</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" />
      <div className="flex-1 px-6 pt-4 overflow-auto">
        <Tabs defaultValue="company">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="numbering">Numbering</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
          <TabsContent value="company" className="mt-4"><CompanyTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="roles" className="mt-4"><RolesTab /></TabsContent>
          <TabsContent value="numbering" className="mt-4"><NumberingTab /></TabsContent>
          <TabsContent value="pricing" className="mt-4"><PricingTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
