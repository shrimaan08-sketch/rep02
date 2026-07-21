import {
  ECO, ECR, Part, BOM, Supplier, User, AuditLog, SupplierNotification,
  ApprovalStep, ECOAffectedPart, UserRole, ECOClass, ECRStatus, ECOStatus,
} from "@/types";
import {
  seedUsers, seedParts, seedBoms, seedSuppliers, seedEcrs, seedEcos,
  seedAuditLogs, seedSupplierNotifications, DEMO_PASSWORD,
} from "./seed";

const STORAGE_KEY = "eco_demo_state_v1";

interface DemoState {
  users: (User & { password: string })[];
  parts: Part[];
  boms: BOM[];
  ecrs: ECR[];
  ecos: ECO[];
  suppliers: Supplier[];
  supplierNotifications: SupplierNotification[];
  auditLogs: AuditLog[];
  nextId: number;
  currentUserId: number | null;
}

function freshState(): DemoState {
  return {
    users: structuredClone(seedUsers),
    parts: structuredClone(seedParts),
    boms: structuredClone(seedBoms),
    ecrs: structuredClone(seedEcrs),
    ecos: structuredClone(seedEcos),
    suppliers: structuredClone(seedSuppliers),
    supplierNotifications: structuredClone(seedSupplierNotifications),
    auditLogs: structuredClone(seedAuditLogs),
    nextId: 1000,
    currentUserId: null,
  };
}

let state: DemoState;
function load(): DemoState {
  if (state) return state;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        return state;
      }
    } catch {
      /* fall through to fresh state */
    }
  }
  state = freshState();
  return state;
}
function save() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — demo just won't persist across reloads */
    }
  }
}
export function resetDemoState() {
  state = freshState();
  save();
}

function nextId(): number {
  const s = load();
  s.nextId += 1;
  return s.nextId;
}

function currentUser(): User & { password: string } {
  const s = load();
  const u = s.users.find((u) => u.id === s.currentUserId);
  if (!u) throw new ApiError(401, "Not authenticated.");
  return u;
}

function toUserRead(u: User & { password: string }): User {
  const { password, ...rest } = u;
  return rest;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function recordAudit(action: string, entityType: string, entityId: number | string, after?: Record<string, unknown>) {
  const s = load();
  const actor = s.users.find((u) => u.id === s.currentUserId);
  s.auditLogs.unshift({
    id: nextId(),
    timestamp: new Date().toISOString(),
    actor_id: actor?.id ?? null,
    actor_email: actor?.email ?? "system",
    action,
    entity_type: entityType,
    entity_id: String(entityId),
    after_state: after ?? null,
    before_state: null,
    metadata_json: null,
  });
}

// ---- Approval chain templates (mirrors backend/app/services/approval_service.py) ----
const APPROVAL_TEMPLATES: Record<ECOClass, UserRole[][]> = {
  minor: [["engineer"], ["quality"]],
  major: [["engineer"], ["quality", "manufacturing"], ["procurement"], ["approver"]],
  emergency: [["quality", "engineer"], ["approver"]],
};

const ECR_TRANSITIONS: Record<ECRStatus, ECRStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "cancelled"],
  under_review: ["approved", "rejected", "cancelled"],
  approved: ["converted", "cancelled"],
  rejected: [],
  converted: [],
  cancelled: [],
};

const ECO_TRANSITIONS: Record<ECOStatus, ECOStatus[]> = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: ["in_review", "cancelled"],
  in_review: ["approved", "rejected", "cancelled"],
  approved: ["implemented", "cancelled"],
  implemented: ["closed"],
  rejected: ["draft"],
  closed: [],
  cancelled: [],
};

function nextNumber(prefix: "ECR" | "ECO", existingNumbers: string[]): string {
  const year = new Date().getFullYear();
  const countThisYear = existingNumbers.filter((n) => n.startsWith(`${prefix}-${year}-`)).length;
  return `${prefix}-${year}-${String(countThisYear + 1).padStart(6, "0")}`;
}

function buildApprovalChain(eco: ECO) {
  const template = APPROVAL_TEMPLATES[eco.eco_class];
  const steps: ApprovalStep[] = [];
  template.forEach((roles, seqIdx) => {
    roles.forEach((role) => {
      steps.push({
        id: nextId(),
        eco_id: eco.id,
        sequence: seqIdx + 1,
        required_role: role,
        approver_id: null,
        approver: null,
        status: seqIdx === 0 ? "active" : "pending",
        comments: null,
        signed_at: null,
        signature_hash: null,
      });
    });
  });
  eco.approval_chain = steps;
}

function advanceChain(eco: ECO) {
  const bySeq = new Map<number, ApprovalStep[]>();
  eco.approval_chain.forEach((s) => {
    if (!bySeq.has(s.sequence)) bySeq.set(s.sequence, []);
    bySeq.get(s.sequence)!.push(s);
  });
  const maxSeq = Math.max(...bySeq.keys());
  for (const seq of [...bySeq.keys()].sort((a, b) => a - b)) {
    const steps = bySeq.get(seq)!;
    if (steps.every((s) => s.status === "approved")) {
      if (seq === maxSeq) {
        eco.status = "approved";
      } else {
        const nextSteps = bySeq.get(seq + 1) || [];
        if (nextSteps.some((s) => s.status === "pending")) {
          nextSteps.forEach((s) => { if (s.status === "pending") s.status = "active"; });
        }
      }
    } else {
      break;
    }
  }
}

// ---- BOM impact analysis (mirrors impact_analysis_service.py) ----
function analyzeImpact(eco: ECO) {
  const s = load();
  const directIds = new Set(eco.affected_parts.map((p) => p.part_id));
  const childToParents = new Map<number, Set<number>>();
  const affectedBoms = new Set<number>();
  s.boms.forEach((bom) => {
    bom.items.forEach((item) => {
      if (!childToParents.has(item.child_part_id)) childToParents.set(item.child_part_id, new Set());
      childToParents.get(item.child_part_id)!.add(bom.parent_part_id);
    });
  });

  const visited = new Set(directIds);
  const frontier = [...directIds];
  while (frontier.length) {
    const cur = frontier.pop()!;
    s.boms.forEach((bom) => {
      bom.items.forEach((item) => {
        if (item.child_part_id === cur) {
          affectedBoms.add(bom.id);
          if (!visited.has(bom.parent_part_id)) {
            visited.add(bom.parent_part_id);
            frontier.push(bom.parent_part_id);
          }
        }
      });
    });
  }
  const upstream = [...visited].filter((id) => !directIds.has(id));
  const notes: string[] = [];
  if (directIds.size === 0) notes.push("No parts have been linked to this ECO yet — impact analysis is incomplete.");
  if (upstream.length) notes.push(`${upstream.length} upstream assembly/assemblies consume an affected part and should be re-reviewed before release.`);

  return {
    eco_id: eco.id,
    directly_affected_parts: [...directIds],
    upstream_assemblies: upstream,
    affected_boms: [...affectedBoms],
    total_impacted_part_count: visited.size,
    estimated_total_cost_impact: eco.estimated_cost_impact ?? null,
    notes,
  };
}

function paginate<T>(items: T[], query: URLSearchParams) {
  const page = Number(query.get("page") || 1);
  const pageSize = Number(query.get("page_size") || 25);
  const start = (page - 1) * pageSize;
  return { total: items.length, page, page_size: pageSize, items: items.slice(start, start + pageSize) };
}

// ---------------------------------------------------------------------------
// Route handling
// ---------------------------------------------------------------------------

export async function handleDemoRequest(method: string, path: string, query: URLSearchParams, body: any): Promise<any> {
  const s = load();
  method = method.toUpperCase();

  // --- Auth ---
  if (method === "POST" && path === "/auth/login") {
    const user = s.users.find((u) => u.email.toLowerCase() === (body.email || "").toLowerCase());
    if (!user || user.password !== body.password) throw new ApiError(401, "Incorrect email or password.");
    s.currentUserId = user.id;
    save();
    return { access_token: "demo-token", refresh_token: "demo-refresh", token_type: "bearer", user: toUserRead(user) };
  }
  if (method === "GET" && path === "/auth/me") {
    return toUserRead(currentUser());
  }

  // --- Dashboard ---
  if (method === "GET" && path === "/dashboard/metrics") {
    const byStatus = (items: { status: string }[]) =>
      items.reduce((acc, i) => ({ ...acc, [i.status]: (acc[i.status] || 0) + 1 }), {} as Record<string, number>);
    return {
      eco_by_status: byStatus(s.ecos),
      ecr_by_status: byStatus(s.ecrs),
      part_by_status: byStatus(s.parts),
      open_ecos: s.ecos.filter((e) => ["pending_approval", "in_review", "approved"].includes(e.status)).length,
      average_eco_cycle_time_days: null,
    };
  }

  // --- Search ---
  if (method === "GET" && path === "/search") {
    const q = (query.get("q") || "").toLowerCase();
    return {
      parts: s.parts.filter((p) => p.part_number.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
        .slice(0, 10).map((p) => ({ id: p.id, part_number: p.part_number, name: p.name, status: p.status })),
      ecrs: s.ecrs.filter((e) => e.ecr_number.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
        .slice(0, 10).map((e) => ({ id: e.id, ecr_number: e.ecr_number, title: e.title, status: e.status })),
      ecos: s.ecos.filter((e) => e.eco_number.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
        .slice(0, 10).map((e) => ({ id: e.id, eco_number: e.eco_number, title: e.title, status: e.status })),
    };
  }

  // --- Parts ---
  if (method === "GET" && path === "/parts") {
    let items = [...s.parts];
    const search = query.get("search");
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((p) => p.part_number.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    }
    return paginate(items, query);
  }
  if (method === "POST" && path === "/parts") {
    const id = nextId();
    const revId = nextId();
    const part: Part = {
      id, part_number: body.part_number, name: body.name, description: body.description ?? null,
      part_type: body.part_type || "component", status: "in_design", unit_of_measure: body.unit_of_measure || "EA",
      standard_cost: body.standard_cost ?? null, current_revision_id: revId,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      revisions: [{ id: revId, part_id: id, revision_code: "A", is_released: false, change_summary: "Initial part creation.", specification: body.initial_specification ?? null, eco_id: null, effective_date: null, created_at: new Date().toISOString() }],
    };
    s.parts.push(part);
    recordAudit("part.created", "Part", id, { part_number: part.part_number });
    save();
    return part;
  }
  const partMatch = path.match(/^\/parts\/(\d+)$/);
  if (method === "GET" && partMatch) {
    const part = s.parts.find((p) => p.id === Number(partMatch[1]));
    if (!part) throw new ApiError(404, "Part not found.");
    return part;
  }
  const partBomsMatch = path.match(/^\/parts\/(\d+)\/boms$/);
  if (method === "GET" && partBomsMatch) {
    return s.boms.filter((b) => b.parent_part_id === Number(partBomsMatch[1]));
  }

  // --- Suppliers ---
  if (method === "GET" && path === "/suppliers") return s.suppliers;
  if (method === "POST" && path === "/suppliers") {
    const supplier: Supplier = { id: nextId(), name: body.name, contact_email: body.contact_email, contact_name: body.contact_name ?? null, phone: body.phone ?? null, notes: body.notes ?? null, created_at: new Date().toISOString() };
    s.suppliers.push(supplier);
    recordAudit("supplier.created", "Supplier", supplier.id, { name: supplier.name });
    save();
    return supplier;
  }
  if (method === "POST" && path === "/supplier-notifications") {
    const supplier = s.suppliers.find((sup) => sup.id === body.supplier_id);
    const notification: SupplierNotification = {
      id: nextId(), eco_id: body.eco_id, supplier_id: body.supplier_id, supplier: supplier ?? null,
      status: "sent", message: body.message ?? null, acknowledgement_notes: null, created_at: new Date().toISOString(),
    };
    s.supplierNotifications.push(notification);
    recordAudit("supplier.notified", "SupplierNotification", notification.id, { eco_id: body.eco_id, supplier_id: body.supplier_id });
    save();
    return notification;
  }
  const ecoSupplierNotifMatch = path.match(/^\/ecos\/(\d+)\/supplier-notifications$/);
  if (method === "GET" && ecoSupplierNotifMatch) {
    return s.supplierNotifications.filter((n) => n.eco_id === Number(ecoSupplierNotifMatch[1]));
  }

  // --- ECRs ---
  if (method === "GET" && path === "/ecrs") {
    let items = [...s.ecrs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const status = query.get("status");
    const search = query.get("search");
    if (status) items = items.filter((e) => e.status === status);
    if (search) { const q = search.toLowerCase(); items = items.filter((e) => e.title.toLowerCase().includes(q) || e.ecr_number.toLowerCase().includes(q)); }
    return paginate(items, query);
  }
  if (method === "POST" && path === "/ecrs") {
    const user = currentUser();
    const ecr: ECR = {
      id: nextId(), ecr_number: nextNumber("ECR", s.ecrs.map((e) => e.ecr_number)), title: body.title, description: body.description,
      reason_code: body.reason_code, priority: body.priority || "medium", status: "draft",
      affected_part_id: body.affected_part_id ?? null, requested_by_id: user.id, requested_by: toUserRead(user),
      justification: body.justification ?? null, proposed_solution: body.proposed_solution ?? null,
      estimated_cost_impact: body.estimated_cost_impact ?? null,
      ai_summary: "This is a live demo preview, so AI summaries aren't generated here — in the real deployment, this field is populated by a live Anthropic API call.",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    s.ecrs.push(ecr);
    recordAudit("ecr.created", "ECR", ecr.id, { ecr_number: ecr.ecr_number });
    save();
    return ecr;
  }
  const ecrMatch = path.match(/^\/ecrs\/(\d+)$/);
  if (method === "GET" && ecrMatch) {
    const ecr = s.ecrs.find((e) => e.id === Number(ecrMatch[1]));
    if (!ecr) throw new ApiError(404, "ECR not found.");
    return ecr;
  }
  const ecrStatusMatch = path.match(/^\/ecrs\/(\d+)\/status$/);
  if (method === "POST" && ecrStatusMatch) {
    const ecr = s.ecrs.find((e) => e.id === Number(ecrStatusMatch[1]));
    if (!ecr) throw new ApiError(404, "ECR not found.");
    const allowed = ECR_TRANSITIONS[ecr.status];
    if (!allowed.includes(body.status)) throw new ApiError(400, `Cannot move ECR from '${ecr.status}' to '${body.status}'.`);
    ecr.status = body.status;
    ecr.updated_at = new Date().toISOString();
    recordAudit("ecr.status_changed", "ECR", ecr.id, { status: ecr.status });
    save();
    return ecr;
  }

  // --- ECOs ---
  if (method === "GET" && path === "/ecos") {
    let items = [...s.ecos].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const status = query.get("status");
    const search = query.get("search");
    if (status) items = items.filter((e) => e.status === status);
    if (search) { const q = search.toLowerCase(); items = items.filter((e) => e.title.toLowerCase().includes(q) || e.eco_number.toLowerCase().includes(q)); }
    return paginate(items, query);
  }
  if (method === "POST" && path === "/ecos") {
    const user = currentUser();
    const affectedParts: ECOAffectedPart[] = (body.affected_parts || []).map((ap: any) => ({
      id: nextId(), eco_id: 0, part_id: ap.part_id, from_revision_id: ap.from_revision_id ?? null,
      to_revision_id: ap.to_revision_id ?? null, change_description: ap.change_description ?? null,
    }));
    const eco: ECO = {
      id: nextId(), eco_number: nextNumber("ECO", s.ecos.map((e) => e.eco_number)), title: body.title, description: body.description,
      eco_class: body.eco_class || "major", status: "draft", source_ecr_id: body.source_ecr_id ?? null,
      initiated_by_id: user.id, initiated_by: toUserRead(user), disposition_notes: body.disposition_notes ?? null,
      effectivity_date: body.effectivity_date ?? null, estimated_cost_impact: body.estimated_cost_impact ?? null,
      ai_summary: "This is a live demo preview, so AI summaries aren't generated here — in the real deployment, this field is populated by a live Anthropic API call.",
      qr_code_path: null, barcode_path: null, affected_parts: affectedParts, approval_chain: [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    eco.affected_parts.forEach((ap) => { ap.eco_id = eco.id; });
    eco.affected_parts.forEach((ap) => {
      const part = s.parts.find((p) => p.id === ap.part_id);
      if (part) part.status = "pending_change";
    });
    if (body.source_ecr_id) {
      const ecr = s.ecrs.find((e) => e.id === body.source_ecr_id);
      if (ecr && ecr.status === "approved") ecr.status = "converted";
    }
    s.ecos.push(eco);
    recordAudit("eco.created", "ECO", eco.id, { eco_number: eco.eco_number });
    save();
    return eco;
  }
  const ecoMatch = path.match(/^\/ecos\/(\d+)$/);
  if (method === "GET" && ecoMatch) {
    const eco = s.ecos.find((e) => e.id === Number(ecoMatch[1]));
    if (!eco) throw new ApiError(404, "ECO not found.");
    return eco;
  }
  const ecoImpactMatch = path.match(/^\/ecos\/(\d+)\/impact-analysis$/);
  if (method === "GET" && ecoImpactMatch) {
    const eco = s.ecos.find((e) => e.id === Number(ecoImpactMatch[1]));
    if (!eco) throw new ApiError(404, "ECO not found.");
    return analyzeImpact(eco);
  }
  const ecoSubmitMatch = path.match(/^\/ecos\/(\d+)\/submit$/);
  if (method === "POST" && ecoSubmitMatch) {
    const eco = s.ecos.find((e) => e.id === Number(ecoSubmitMatch[1]));
    if (!eco) throw new ApiError(404, "ECO not found.");
    if (!ECO_TRANSITIONS[eco.status].includes("pending_approval")) throw new ApiError(400, `Cannot submit ECO from status '${eco.status}'.`);
    eco.status = "in_review";
    buildApprovalChain(eco);
    eco.updated_at = new Date().toISOString();
    recordAudit("eco.submitted_for_approval", "ECO", eco.id, {});
    save();
    return eco;
  }
  const ecoImplementMatch = path.match(/^\/ecos\/(\d+)\/implement$/);
  if (method === "POST" && ecoImplementMatch) {
    const eco = s.ecos.find((e) => e.id === Number(ecoImplementMatch[1]));
    if (!eco) throw new ApiError(404, "ECO not found.");
    if (eco.status !== "approved") throw new ApiError(400, "Only approved ECOs can be marked implemented.");
    eco.status = "implemented";
    eco.affected_parts.forEach((ap) => {
      const part = s.parts.find((p) => p.id === ap.part_id);
      if (part) part.status = "active";
    });
    eco.updated_at = new Date().toISOString();
    recordAudit("eco.implemented", "ECO", eco.id, {});
    save();
    return eco;
  }
  const ecoCloseMatch = path.match(/^\/ecos\/(\d+)\/close$/);
  if (method === "POST" && ecoCloseMatch) {
    const eco = s.ecos.find((e) => e.id === Number(ecoCloseMatch[1]));
    if (!eco) throw new ApiError(404, "ECO not found.");
    if (eco.status !== "implemented") throw new ApiError(400, "Only implemented ECOs can be closed.");
    eco.status = "closed";
    eco.updated_at = new Date().toISOString();
    recordAudit("eco.closed", "ECO", eco.id, {});
    save();
    return eco;
  }
  const ecoCancelMatch = path.match(/^\/ecos\/(\d+)\/cancel$/);
  if (method === "POST" && ecoCancelMatch) {
    const eco = s.ecos.find((e) => e.id === Number(ecoCancelMatch[1]));
    if (!eco) throw new ApiError(404, "ECO not found.");
    if (!ECO_TRANSITIONS[eco.status].includes("cancelled")) throw new ApiError(400, `Cannot cancel ECO from status '${eco.status}'.`);
    eco.status = "cancelled";
    eco.updated_at = new Date().toISOString();
    recordAudit("eco.cancelled", "ECO", eco.id, {});
    save();
    return eco;
  }
  const ecoApprovalMatch = path.match(/^\/ecos\/(\d+)\/approvals\/(\d+)\/decision$/);
  if (method === "POST" && ecoApprovalMatch) {
    const eco = s.ecos.find((e) => e.id === Number(ecoApprovalMatch[1]));
    if (!eco) throw new ApiError(404, "ECO not found.");
    const step = eco.approval_chain.find((st) => st.id === Number(ecoApprovalMatch[2]));
    if (!step) throw new ApiError(404, "Approval step not found.");
    const user = currentUser();
    if (step.status !== "active") throw new ApiError(400, "This approval step is not currently active.");
    if (user.role !== step.required_role && user.role !== "admin") throw new ApiError(403, `This step requires role '${step.required_role}'.`);
    if (body.signature_pin !== user.password) throw new ApiError(401, "Signature authentication failed. Re-enter your password.");

    step.approver_id = user.id;
    step.approver = toUserRead(user);
    step.comments = body.comments ?? null;
    step.signed_at = new Date().toISOString();
    step.signature_hash = `demo-${Math.random().toString(16).slice(2)}`;
    step.status = body.approve ? "approved" : "rejected";
    recordAudit("eco.approval_step_signed", "ApprovalStep", step.id, { status: step.status });

    if (!body.approve) {
      eco.status = "rejected";
    } else {
      advanceChain(eco);
    }
    eco.updated_at = new Date().toISOString();
    save();
    return eco;
  }

  // --- Audit log ---
  if (method === "GET" && path === "/audit-logs") {
    return paginate(s.auditLogs, query);
  }

  throw new ApiError(404, `Demo mode: no mock route for ${method} ${path}`);
}

export { ApiError as DemoApiError };
