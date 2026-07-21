export type UserRole =
  | "admin"
  | "engineer"
  | "quality"
  | "manufacturing"
  | "procurement"
  | "approver"
  | "viewer";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string | null;
  title?: string | null;
  is_active: boolean;
  created_at: string;
}

export type PartStatus = "in_design" | "active" | "obsolete" | "pending_change";
export type PartType = "raw_material" | "component" | "subassembly" | "assembly" | "finished_good";

export interface PartRevision {
  id: number;
  part_id: number;
  revision_code: string;
  is_released: boolean;
  change_summary?: string | null;
  specification?: string | null;
  eco_id?: number | null;
  effective_date?: string | null;
  created_at: string;
}

export interface Part {
  id: number;
  part_number: string;
  name: string;
  description?: string | null;
  part_type: PartType;
  status: PartStatus;
  unit_of_measure: string;
  standard_cost?: number | null;
  current_revision_id?: number | null;
  created_at: string;
  updated_at: string;
  revisions?: PartRevision[];
}

export interface BOMItem {
  id: number;
  bom_id: number;
  line_number: number;
  child_part_id: number;
  child_revision_id?: number | null;
  quantity_per: number;
  reference_designator?: string | null;
  find_number?: string | null;
  notes?: string | null;
  child_part?: Part | null;
}

export interface BOM {
  id: number;
  parent_part_id: number;
  parent_revision_id: number;
  name: string;
  notes?: string | null;
  is_active: boolean;
  items: BOMItem[];
  created_at: string;
}

export type ECRStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "converted" | "cancelled";
export type ECRPriority = "low" | "medium" | "high" | "critical";
export type ECRReasonCode =
  | "design_improvement"
  | "cost_reduction"
  | "quality_issue"
  | "supplier_change"
  | "regulatory_compliance"
  | "customer_request"
  | "obsolescence"
  | "safety"
  | "other";

export interface ECR {
  id: number;
  ecr_number: string;
  title: string;
  description: string;
  reason_code: ECRReasonCode;
  priority: ECRPriority;
  status: ECRStatus;
  affected_part_id?: number | null;
  requested_by_id: number;
  requested_by?: User | null;
  justification?: string | null;
  proposed_solution?: string | null;
  estimated_cost_impact?: number | null;
  ai_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export type ECOStatus =
  | "draft"
  | "pending_approval"
  | "in_review"
  | "approved"
  | "rejected"
  | "implemented"
  | "closed"
  | "cancelled";
export type ECOClass = "minor" | "major" | "emergency";
export type ApprovalStepStatus = "pending" | "active" | "approved" | "rejected" | "skipped";

export interface ApprovalStep {
  id: number;
  eco_id: number;
  sequence: number;
  required_role: UserRole;
  approver_id?: number | null;
  approver?: User | null;
  status: ApprovalStepStatus;
  comments?: string | null;
  signed_at?: string | null;
  signature_hash?: string | null;
}

export interface ECOAffectedPart {
  id: number;
  eco_id: number;
  part_id: number;
  from_revision_id?: number | null;
  to_revision_id?: number | null;
  change_description?: string | null;
}

export interface ECO {
  id: number;
  eco_number: string;
  title: string;
  description: string;
  eco_class: ECOClass;
  status: ECOStatus;
  source_ecr_id?: number | null;
  initiated_by_id: number;
  initiated_by?: User | null;
  disposition_notes?: string | null;
  effectivity_date?: string | null;
  estimated_cost_impact?: number | null;
  ai_summary?: string | null;
  qr_code_path?: string | null;
  barcode_path?: string | null;
  affected_parts: ECOAffectedPart[];
  approval_chain: ApprovalStep[];
  created_at: string;
  updated_at: string;
}

/** Matches the backend's ECOSummary schema, returned by GET /ecos (list).
 * Use this type for list/table views; use ECO (with the full detail
 * endpoint GET /ecos/{id}) when you need affected_parts or approval_chain. */
export interface ECOSummary {
  id: number;
  eco_number: string;
  title: string;
  eco_class: ECOClass;
  status: ECOStatus;
  initiated_by_id: number;
  initiated_by?: User | null;
  effectivity_date?: string | null;
  estimated_cost_impact?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ImpactAnalysisResult {
  eco_id: number;
  directly_affected_parts: number[];
  upstream_assemblies: number[];
  affected_boms: number[];
  total_impacted_part_count: number;
  estimated_total_cost_impact?: number | null;
  notes: string[];
}

export interface Supplier {
  id: number;
  name: string;
  contact_email: string;
  contact_name?: string | null;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
}

export type SupplierNotificationStatus = "pending" | "sent" | "acknowledged" | "failed";

export interface SupplierNotification {
  id: number;
  eco_id: number;
  supplier_id: number;
  supplier?: Supplier | null;
  status: SupplierNotificationStatus;
  message?: string | null;
  acknowledgement_notes?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor_id?: number | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  metadata_json?: Record<string, unknown> | null;
}

export interface Paginated<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface DashboardMetrics {
  eco_by_status: Record<string, number>;
  ecr_by_status: Record<string, number>;
  part_by_status: Record<string, number>;
  open_ecos: number;
  average_eco_cycle_time_days: number | null;
}
