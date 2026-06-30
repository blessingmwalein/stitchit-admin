"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { companyApi, numberingApi, settingsApi, usersApi, rolesApi } from "@/lib/api/settings";
import { uploadDesignImage } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role, NumberingSetting, StaffUser } from "@/lib/types/settings";
import { cn } from "@/lib/utils";
import {
  Loader2, Upload, Pencil, Building2, MapPin, Mail, Phone, Globe,
  MessageSquare, Plus, MoreVertical, Shield, UserPlus, Hash,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(first = "", last = "") {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

function avatarColor(name: string) {
  const palette = [
    "bg-rose-100 text-rose-700", "bg-orange-100 text-orange-700",
    "bg-amber-100 text-amber-700", "bg-teal-100 text-teal-700",
    "bg-sky-100 text-sky-700",    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",  "bg-emerald-100 text-emerald-700",
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % palette.length;
  return palette[Math.abs(h)];
}

function InfoPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

// ── Image Upload & Color Field ────────────────────────────────────────────────

function ImageUpload({
  label, hint, url, uploading, onChange,
}: {
  label: string; hint?: string; url: string; uploading: boolean;
  onChange: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        {url ? (
          <img src={url} alt={label} className="h-14 w-24 rounded-lg border object-contain bg-muted/50 p-1.5" />
        ) : (
          <div className="h-14 w-24 rounded-lg border-2 border-dashed bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wide">
            None
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border bg-background hover:bg-muted transition-colors font-medium">
              {uploading
                ? <><Loader2 className="h-3 w-3 animate-spin" />Uploading…</>
                : <><Upload className="h-3 w-3" />Upload</>}
            </span>
            <input type="file" accept="image/*" className="sr-only" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
          </label>
          {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded-lg border cursor-pointer p-0.5 bg-background" />
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 text-sm font-mono w-28" placeholder="#f97316" maxLength={7} />
        <div className="h-9 w-9 rounded-lg border" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

// ── Company Tab ───────────────────────────────────────────────────────────────

const companySchema = z.object({
  name:               z.string().min(1, "Required"),
  legalName:          z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId:              z.string().optional(),
  phone:              z.string().optional(),
  whatsapp:           z.string().optional(),
  email:              z.string().email("Invalid email").optional().or(z.literal("")),
  website:            z.string().optional(),
  address:            z.string().optional(),
  city:               z.string().optional(),
  country:            z.string().optional(),
  footerText:         z.string().optional(),
});
type CompanyForm = z.infer<typeof companySchema>;

function CompanyTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["company"], queryFn: companyApi.get });
  const savedSettings = (data?.settings as any) ?? {};
  const [mode, setMode] = React.useState<"view" | "edit">("view");

  const [logoUrl,          setLogoUrl]          = React.useState("");
  const [signatureUrl,     setSignatureUrl]      = React.useState("");
  const [primaryColor,     setPrimaryColor]      = React.useState("#f97316");
  const [secondaryColor,   setSecondaryColor]    = React.useState("#ea580c");
  const [uploadingLogo,    setUploadingLogo]     = React.useState(false);
  const [uploadingSig,     setUploadingSig]      = React.useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
  });

  React.useEffect(() => {
    if (!data) return;
    const s = (data.settings as any) ?? {};
    reset({
      name:               data.name ?? "",
      legalName:          (data as any).legalName ?? "",
      registrationNumber: s.registrationNumber ?? "",
      taxId:              (data as any).taxId ?? "",
      phone:              (data as any).phone ?? "",
      whatsapp:           (data as any).whatsapp ?? "",
      email:              (data as any).email ?? "",
      website:            (data as any).website ?? "",
      address:            (data as any).address ?? "",
      city:               (data as any).city ?? "",
      country:            (data as any).country ?? "Zimbabwe",
      footerText:         s.footerText ?? "",
    });
    setPrimaryColor(s.primaryColor ?? "#f97316");
    setSecondaryColor(s.secondaryColor ?? "#ea580c");
    setLogoUrl(s.logoUrl ?? "");
    setSignatureUrl(s.signatureUrl ?? "");
  }, [data, reset]);

  const mut = useMutation({
    mutationFn: (fd: CompanyForm) => {
      const { registrationNumber, footerText, ...main } = fd;
      return companyApi.update({
        ...main,
        settings: {
          ...savedSettings,
          registrationNumber: registrationNumber || undefined,
          primaryColor, secondaryColor,
          footerText: footerText || undefined,
          logoUrl:       logoUrl       || savedSettings.logoUrl       || undefined,
          signatureUrl:  signatureUrl  || savedSettings.signatureUrl  || undefined,
        },
      } as any);
    },
    onSuccess: () => {
      toast.success("Company profile saved");
      qc.invalidateQueries({ queryKey: ["company"] });
      setMode("view");
    },
    onError: () => toast.error("Save failed"),
  });

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try { const u = await uploadDesignImage(file, "company/logos"); setLogoUrl(u); toast.success("Logo uploaded"); }
    catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setUploadingLogo(false); }
  }
  async function handleSigUpload(file: File) {
    setUploadingSig(true);
    try { const u = await uploadDesignImage(file, "company/signatures"); setSignatureUrl(u); toast.success("Signature uploaded"); }
    catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setUploadingSig(false); }
  }

  // ── VIEW ──
  if (mode === "view") {
    const d = data as any;
    const location = [d?.city, d?.country].filter(Boolean).join(", ");
    return (
      <div className="max-w-2xl space-y-4">
        {/* Profile slab */}
        <Card className="overflow-hidden">
          <div
            className="h-28"
            style={{ background: `linear-gradient(135deg, ${primaryColor}35 0%, ${secondaryColor}25 100%)` }}
          />
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Logo */}
              <div className="h-20 w-20 rounded-2xl border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                  : <Building2 className="h-8 w-8 text-muted-foreground" />}
              </div>
              <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit profile
              </Button>
            </div>

            <h2 className="text-xl font-bold leading-tight">{d?.name || "—"}</h2>
            {d?.legalName && <p className="text-sm text-muted-foreground mt-0.5">{d.legalName}</p>}

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {location    && <InfoPill icon={MapPin}         label={location} />}
              {d?.email    && <InfoPill icon={Mail}           label={d.email} />}
              {d?.phone    && <InfoPill icon={Phone}          label={d.phone} />}
              {d?.whatsapp && <InfoPill icon={MessageSquare}  label={d.whatsapp} />}
              {d?.website  && <InfoPill icon={Globe}          label={d.website} />}
            </div>

            {(d?.taxId || savedSettings.registrationNumber) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {d?.taxId                    && <Badge variant="outline" className="text-xs font-mono">ZIMRA {d.taxId}</Badge>}
                {savedSettings.registrationNumber && <Badge variant="outline" className="text-xs font-mono">Reg {savedSettings.registrationNumber}</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm">Address</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 text-sm text-muted-foreground space-y-0.5">
              {(data as any)?.address
                ? <><p>{(data as any).address}</p>{location && <p>{location}</p>}</>
                : <p className="italic">Not set</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm">Branding</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {[
                { label: "Primary",   color: primaryColor },
                { label: "Secondary", color: secondaryColor },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded border shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-mono text-muted-foreground">{color}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
              {logoUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <img src={logoUrl} alt="Logo" className="h-5 object-contain" />
                  <span className="text-xs text-muted-foreground">Logo</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {savedSettings.footerText && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm">Document Footer</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-sm text-muted-foreground italic">&ldquo;{savedSettings.footerText}&rdquo;</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── EDIT ──
  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="max-w-2xl space-y-4">
      {/* Editing banner */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-50 border border-orange-200">
        <span className="text-sm font-medium text-orange-700 flex items-center gap-2">
          <Pencil className="h-3.5 w-3.5" />Editing company profile
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" type="button" onClick={() => setMode("view")} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button size="sm" type="submit" style={{ backgroundColor: "#f97316" }} disabled={mut.isPending || isSubmitting}>
            {mut.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
              : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Company Name *</Label>
              <Input {...register("name")} className="h-9" />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Legal Name</Label>
              <Input {...register("legalName")} className="h-9" placeholder="Full legal entity" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Registration Number</Label>
              <Input {...register("registrationNumber")} className="h-9" placeholder="REG-12345" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Tax / ZIMRA Number</Label>
              <Input {...register("taxId")} className="h-9" placeholder="20000001" />
            </div>
          </div>
          <Separator />
          <ImageUpload label="Company Logo" hint="PNG or SVG · transparent background recommended"
            url={logoUrl} uploading={uploadingLogo} onChange={handleLogoUpload} />
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm">Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-2 gap-3">
          {([
            ["phone",    "Phone Number",    "+263 77 959 677"],
            ["whatsapp", "WhatsApp Number", "+263 77 ..."],
            ["email",    "Email Address",   ""],
            ["website",  "Website",         "https://stitchit.co.zw"],
          ] as const).map(([name, label, placeholder]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">{label}</Label>
              <Input {...register(name)} className="h-9" placeholder={placeholder} />
              {errors[name] && <p className="text-xs text-red-600">{errors[name]?.message}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm">Address</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Street Address</Label>
            <Input {...register("address")} className="h-9" placeholder="15 Samora Machel Ave" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">City</Label>
            <Input {...register("city")} className="h-9" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Country</Label>
            <Input {...register("country")} className="h-9" />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm">Branding</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Primary Color"   value={primaryColor}   onChange={setPrimaryColor} />
            <ColorField label="Secondary Color" value={secondaryColor} onChange={setSecondaryColor} />
          </div>
          {/* Banner preview */}
          <div
            className="h-14 rounded-xl flex items-center px-4"
            style={{ background: `linear-gradient(135deg, ${primaryColor}35, ${secondaryColor}25)` }}
          >
            <span className="text-xs text-foreground/50">Banner preview</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Footer Text</Label>
            <Textarea {...register("footerText")} rows={2} className="resize-none text-sm"
              placeholder="Thank you for choosing Stitch't. We appreciate your business!" />
          </div>
          <Separator />
          <ImageUpload label="Signature Image" hint="PNG · transparent · shown on invoices"
            url={signatureUrl} uploading={uploadingSig} onChange={handleSigUpload} />
        </CardContent>
      </Card>
    </form>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = React.useState(false);
  const [inviteEmail,     setInviteEmail]     = React.useState("");
  const [inviteFirstName, setInviteFirstName] = React.useState("");
  const [inviteLastName,  setInviteLastName]  = React.useState("");
  const [inviteRoleId,    setInviteRoleId]    = React.useState("");

  const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: () => rolesApi.list() });
  const roles: Role[] = Array.isArray(rolesData) ? rolesData : (rolesData as any)?.data ?? [];

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const users: StaffUser[] = (data?.data as StaffUser[]) ?? [];

  const inviteMut = useMutation({
    mutationFn: () => usersApi.create({
      email: inviteEmail, firstName: inviteFirstName, lastName: inviteLastName,
      roleId: inviteRoleId || undefined, password: "TempPass@123",
    }),
    onSuccess: () => {
      toast.success(`Invite sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail(""); setInviteFirstName(""); setInviteLastName(""); setInviteRoleId("");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to invite user"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["users"] }); },
  });

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Staff Members</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {users.length} member{users.length !== 1 ? "s" : ""} · staff portal access
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowInvite((v) => !v)}
          variant={showInvite ? "outline" : "default"}
          style={showInvite ? undefined : { backgroundColor: "#f97316" }}
        >
          {showInvite ? "Cancel" : <><UserPlus className="h-3.5 w-3.5 mr-1.5" />Invite user</>}
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <Card className="border-orange-200 bg-orange-50/40">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm text-orange-700">Invite a team member</CardTitle>
            <CardDescription className="text-xs text-orange-600/80">
              They&apos;ll receive credentials to access the staff portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">First Name</Label>
                <Input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} className="h-9" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Last Name</Label>
                <Input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9" placeholder="staff@stitchit.co.zw" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Role</Label>
              <select value={inviteRoleId} onChange={(e) => setInviteRoleId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select role…</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <Button
              size="sm" type="button" className="w-full" style={{ backgroundColor: "#f97316" }}
              disabled={!inviteEmail || !inviteFirstName || !inviteLastName || inviteMut.isPending}
              onClick={() => inviteMut.mutate()}
            >
              {inviteMut.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</>
                : "Send invite"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* User cards */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />Loading…
        </div>
      ) : users.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-sm text-muted-foreground">No staff members yet. Invite your first team member.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const name = `${user.firstName} ${user.lastName}`;
            return (
              <Card key={user.id}>
                <CardContent className="flex items-center gap-4 px-5 py-4">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0", avatarColor(name))}>
                    {initials(user.firstName, user.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-none">{name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
                  </div>
                  {user.roleName && (
                    <Badge variant="secondary" className="text-xs shrink-0">{user.roleName}</Badge>
                  )}
                  <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleMut.mutate(user.id)}>
                        {user.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────

const ROLE_ACCENT = [
  "border-l-violet-500", "border-l-sky-500",   "border-l-emerald-500",
  "border-l-orange-500", "border-l-rose-500",   "border-l-teal-500",
  "border-l-amber-500",  "border-l-indigo-500", "border-l-pink-500",
];

function RolesTab() {
  const { data: rolesData, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => rolesApi.list() });
  const roles: Role[] = Array.isArray(rolesData) ? rolesData : (rolesData as any)?.data ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Roles &amp; Permissions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Control what each role can access in the system</p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1.5" />New role
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role, i) => {
            const permCount = (role as any).permissionCount ?? role.permissions?.length ?? 0;
            const isSystem  = (role as any).isSystem;
            return (
              <Card key={role.id} className={cn("border-l-4 overflow-hidden", ROLE_ACCENT[i % ROLE_ACCENT.length])}>
                <CardContent className="px-5 py-4 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{role.name}</p>
                      {isSystem && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">System</Badge>}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{role.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{permCount}</p>
                    <p className="text-[10px] text-muted-foreground">permissions</p>
                  </div>
                  {!isSystem && (
                    <Button variant="ghost" size="sm" className="shrink-0 text-xs h-7">
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Numbering Tab ─────────────────────────────────────────────────────────────

function NumberingTab() {
  const qc = useQueryClient();
  const { data: sequences = [], isLoading } = useQuery({ queryKey: ["numbering"], queryFn: numberingApi.list });
  const updateMut = useMutation({
    mutationFn: ({ docType, payload }: { docType: string; payload: { prefix?: string; padLength?: number } }) =>
      numberingApi.update(docType, payload),
    onSuccess: () => { toast.success("Sequence updated"); qc.invalidateQueries({ queryKey: ["numbering"] }); },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Document Numbering</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Configure the prefix and padding for each document type</p>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {(sequences as NumberingSetting[]).map((seq) => (
            <NumberingRow key={seq.id} seq={seq}
              onSave={(prefix, padLength) =>
                updateMut.mutate({ docType: seq.entity ?? (seq as any).docType, payload: { prefix, padLength } })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NumberingRow({ seq, onSave }: {
  seq: NumberingSetting;
  onSave: (prefix: string, padLength: number) => void;
}) {
  const [editing,   setEditing]   = React.useState(false);
  const [prefix,    setPrefix]    = React.useState(seq.prefix ?? "");
  const [padLength, setPadLength] = React.useState(seq.padding ?? 5);
  const label   = (seq.entity ?? (seq as any).docType ?? "").replace(/_/g, " ").toLowerCase();
  const example = `${prefix}2026-${"0".repeat(Math.max(0, padLength - 1))}1`;

  return (
    <Card>
      <CardContent className="px-5 py-3 flex items-center gap-4">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{label}</p>
          {!editing && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{example}</p>
          )}
          {editing && (
            <div className="flex items-end gap-3 mt-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px]">Prefix</Label>
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="h-7 w-20 text-xs font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px]">Pad length</Label>
                <Input type="number" value={padLength} onChange={(e) => setPadLength(Number(e.target.value))}
                  className="h-7 w-16 text-xs" min={1} max={10} />
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 flex gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" className="text-xs h-7" onClick={() => { onSave(prefix, padLength); setEditing(false); }}>Save</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Pricing Tab ───────────────────────────────────────────────────────────────

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
    <div className="max-w-2xl space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Pricing Parameters</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Factors used to auto-calculate rug quotation prices</p>
      </div>
      <Card>
        <CardContent className="px-5 py-5">
          <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {data && Object.keys(data).map((key) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                  <Input type="number" step="any" {...register(key, { valueAsNumber: true })} className="h-9" />
                </div>
              ))}
            </div>
            <Button type="submit" size="sm" disabled={mut.isPending} style={{ backgroundColor: "#f97316" }}>
              {mut.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : "Save pricing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TAB_TRIGGER_CLS =
  "rounded-none h-auto px-4 pb-3 pt-0.5 border-0 border-b-2 border-b-transparent " +
  "data-[state=active]:border-b-orange-500 data-[state=active]:text-orange-600 " +
  "data-[state=active]:bg-transparent data-[state=active]:shadow-none " +
  "dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-orange-500 " +
  "text-muted-foreground hover:text-foreground transition-colors flex-none";

export default function SettingsPage() {
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: companyApi.get });
  const d = company as any;
  const s = (d?.settings as any) ?? {};
  const primaryColor   = s.primaryColor   ?? "#f97316";
  const secondaryColor = s.secondaryColor ?? "#ea580c";
  const logoUrl        = s.logoUrl        ?? "";
  const location       = [d?.city, d?.country].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 shrink-0 border-b bg-card px-6 py-3 flex items-center">
        <h1 className="text-sm font-semibold">Settings</h1>
      </div>

      {/* Split body */}
      <div className="flex flex-1">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r bg-card sticky top-[49px] self-start max-h-[calc(100vh-49px)] overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Company profile card */}
            <div className="rounded-xl overflow-hidden border">
              <div
                className="h-14"
                style={{ background: `linear-gradient(135deg, ${primaryColor}35 0%, ${secondaryColor}25 100%)` }}
              />
              <div className="px-4 pb-4">
                <div className="-mt-5 mb-3">
                  <div className="h-10 w-10 rounded-xl border-2 border-background bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                    {logoUrl
                      ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                      : <Building2 className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <p className="font-semibold text-sm leading-tight">{d?.name || "—"}</p>
                {d?.legalName && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{d.legalName}</p>
                )}
                {location && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />{location}
                  </p>
                )}
                {(d?.taxId || s.registrationNumber) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d?.taxId && (
                      <Badge variant="outline" className="text-[10px] px-1.5 font-mono">ZIMRA {d.taxId}</Badge>
                    )}
                    {s.registrationNumber && (
                      <Badge variant="outline" className="text-[10px] px-1.5 font-mono">Reg {s.registrationNumber}</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Contact</p>
              {d?.phone    && <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5"><Phone         className="h-3.5 w-3.5 shrink-0" />{d.phone}</div>}
              {d?.whatsapp && <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5"><MessageSquare className="h-3.5 w-3.5 shrink-0" />{d.whatsapp}</div>}
              {d?.email    && <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5"><Mail          className="h-3.5 w-3.5 shrink-0" />{d.email}</div>}
              {d?.website  && <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5"><Globe         className="h-3.5 w-3.5 shrink-0" />{d.website}</div>}
              {!d?.phone && !d?.whatsapp && !d?.email && !d?.website && (
                <p className="text-xs text-muted-foreground italic">No contact info yet</p>
              )}
            </div>

            <Separator />

            {/* Branding */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Branding</p>
              {[
                { label: "Primary",   color: primaryColor },
                { label: "Secondary", color: secondaryColor },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-mono text-muted-foreground">{color}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── RIGHT MAIN ───────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Tabs defaultValue="company" className="flex flex-col flex-1">

            {/* Sticky tabs header */}
            <div className="sticky top-[49px] z-10 bg-card border-b px-6 pt-4 shrink-0">
              <TabsList className="h-auto bg-transparent rounded-none p-0 w-full justify-start gap-0">
                <TabsTrigger value="company"   className={TAB_TRIGGER_CLS}>Company</TabsTrigger>
                <TabsTrigger value="users"     className={TAB_TRIGGER_CLS}>Users</TabsTrigger>
                <TabsTrigger value="roles"     className={TAB_TRIGGER_CLS}>Roles</TabsTrigger>
                <TabsTrigger value="numbering" className={TAB_TRIGGER_CLS}>Numbering</TabsTrigger>
                <TabsTrigger value="pricing"   className={TAB_TRIGGER_CLS}>Pricing</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab content */}
            <div className="flex-1 pb-8">
              <TabsContent value="company"   className="m-0 p-6 outline-none"><CompanyTab /></TabsContent>
              <TabsContent value="users"     className="m-0 p-6 outline-none"><UsersTab /></TabsContent>
              <TabsContent value="roles"     className="m-0 p-6 outline-none"><RolesTab /></TabsContent>
              <TabsContent value="numbering" className="m-0 p-6 outline-none"><NumberingTab /></TabsContent>
              <TabsContent value="pricing"   className="m-0 p-6 outline-none"><PricingTab /></TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
