import { ECO, ECR, Part, BOM, Supplier, User, AuditLog, SupplierNotification } from "@/types";

/**
 * Demo-mode seed data. Mirrors backend/app/db/init_db.py's seed dataset as
 * closely as possible so the hosted preview matches what you'd see running
 * the real stack locally. Passwords for every seeded account: ChangeMe123!
 */

export const DEMO_PASSWORD = "ChangeMe123!";

export const seedUsers: (User & { password: string })[] = [
  { id: 1, email: "admin@revion.app", full_name: "Platform Administrator", role: "admin", department: "IT", title: "System Administrator", is_active: true, created_at: "2026-01-01T00:00:00Z", password: DEMO_PASSWORD },
  { id: 2, email: "engineer@revion.app", full_name: "Erin Engineer", role: "engineer", department: "Engineering", title: null, is_active: true, created_at: "2026-01-01T00:00:00Z", password: DEMO_PASSWORD },
  { id: 3, email: "quality@revion.app", full_name: "Quinn Quality", role: "quality", department: "Quality Assurance", title: null, is_active: true, created_at: "2026-01-01T00:00:00Z", password: DEMO_PASSWORD },
  { id: 4, email: "mfg@revion.app", full_name: "Max Manufacturing", role: "manufacturing", department: "Manufacturing", title: null, is_active: true, created_at: "2026-01-01T00:00:00Z", password: DEMO_PASSWORD },
  { id: 5, email: "procurement@revion.app", full_name: "Priya Procurement", role: "procurement", department: "Procurement", title: null, is_active: true, created_at: "2026-01-01T00:00:00Z", password: DEMO_PASSWORD },
  { id: 6, email: "management@revion.app", full_name: "Morgan Manager", role: "approver", department: "Management", title: null, is_active: true, created_at: "2026-01-01T00:00:00Z", password: DEMO_PASSWORD },
];

export const seedParts: Part[] = [
  { id: 101, part_number: "BRK-2001", name: "Motor Mount Bracket", description: "6061-T6 aluminum, 3mm wall, anodized clear.", part_type: "component", status: "active", unit_of_measure: "EA", standard_cost: 4.25, current_revision_id: 201, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    revisions: [{ id: 201, part_id: 101, revision_code: "A", is_released: true, change_summary: "Initial released revision.", specification: "6061-T6 aluminum, 3mm wall, anodized clear.", eco_id: null, effective_date: null, created_at: "2026-01-01T00:00:00Z" }] },
  { id: 102, part_number: "FST-0007", name: "M4x12 Socket Head Screw", description: "Stainless steel A2-70, ISO 4762.", part_type: "raw_material", status: "active", unit_of_measure: "EA", standard_cost: 0.08, current_revision_id: 202, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    revisions: [{ id: 202, part_id: 102, revision_code: "A", is_released: true, change_summary: "Initial released revision.", specification: "Stainless steel A2-70, ISO 4762.", eco_id: null, effective_date: null, created_at: "2026-01-01T00:00:00Z" }] },
  { id: 103, part_number: "MOT-3300", name: "12V DC Gear Motor", description: "12V 100RPM, 6mm D-shaft, JST-XH connector.", part_type: "component", status: "active", unit_of_measure: "EA", standard_cost: 18.50, current_revision_id: 203, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    revisions: [{ id: 203, part_id: 103, revision_code: "A", is_released: true, change_summary: "Initial released revision.", specification: "12V 100RPM, 6mm D-shaft, JST-XH connector.", eco_id: null, effective_date: null, created_at: "2026-01-01T00:00:00Z" }] },
  { id: 104, part_number: "SUB-4400", name: "Drive Subassembly", description: "Motor + bracket + fasteners, torque to 2.5 N·m.", part_type: "subassembly", status: "active", unit_of_measure: "EA", standard_cost: 0, current_revision_id: 204, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    revisions: [{ id: 204, part_id: 104, revision_code: "A", is_released: true, change_summary: "Initial released revision.", specification: "Motor + bracket + fasteners, torque to 2.5 N·m.", eco_id: null, effective_date: null, created_at: "2026-01-01T00:00:00Z" }] },
  { id: 105, part_number: "FIN-5000", name: "Conveyor Drive Unit", description: "Complete drive unit including mounting subassembly.", part_type: "finished_good", status: "active", unit_of_measure: "EA", standard_cost: 0, current_revision_id: 205, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    revisions: [{ id: 205, part_id: 105, revision_code: "A", is_released: true, change_summary: "Initial released revision.", specification: "Complete drive unit including mounting subassembly.", eco_id: null, effective_date: null, created_at: "2026-01-01T00:00:00Z" }] },
];

export const seedBoms: BOM[] = [
  { id: 301, parent_part_id: 104, parent_revision_id: 204, name: "Drive Subassembly BOM", notes: null, is_active: true, created_at: "2026-01-01T00:00:00Z", items: [
    { id: 401, bom_id: 301, line_number: 1, child_part_id: 101, child_revision_id: 201, quantity_per: 1, reference_designator: null, find_number: "10", notes: null, child_part: null },
    { id: 402, bom_id: 301, line_number: 2, child_part_id: 103, child_revision_id: 203, quantity_per: 1, reference_designator: null, find_number: "20", notes: null, child_part: null },
    { id: 403, bom_id: 301, line_number: 3, child_part_id: 102, child_revision_id: 202, quantity_per: 4, reference_designator: null, find_number: "30", notes: null, child_part: null },
  ] },
  { id: 302, parent_part_id: 105, parent_revision_id: 205, name: "Conveyor Drive Unit BOM", notes: null, is_active: true, created_at: "2026-01-01T00:00:00Z", items: [
    { id: 404, bom_id: 302, line_number: 1, child_part_id: 104, child_revision_id: 204, quantity_per: 1, reference_designator: null, find_number: "10", notes: null, child_part: null },
  ] },
];

// Resolve child_part references now that seedParts is defined above.
seedBoms.forEach((bom) => {
  bom.items.forEach((item) => {
    item.child_part = seedParts.find((p) => p.id === item.child_part_id) || null;
  });
});

export const seedSuppliers: Supplier[] = [
  { id: 501, name: "Precision Components Inc.", contact_email: "sales@precisioncomponents.example", contact_name: "Dana Ortiz", phone: "+1-555-0142", notes: "Primary supplier for machined brackets and fasteners.", created_at: "2026-01-01T00:00:00Z" },
];

export const seedEcrs: ECR[] = [];
export const seedEcos: ECO[] = [];
export const seedAuditLogs: AuditLog[] = [];
export const seedSupplierNotifications: SupplierNotification[] = [];
