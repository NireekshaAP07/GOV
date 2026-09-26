export type Fingerprint = Record<string, string | number | null>;

export interface Material {
  id: number;
  cpse_id?: number;
  cpse_code?: string;
  cpse_name?: string;
  legacy_material_code: string;
  original_description: string;
  normalized_description: string;
  category?: string | null;
  material?: string | null;
  grade?: string | null;
  unit?: string | null;
  fingerprint: Fingerprint;
  similarity?: number;
  mapping?: { confidence: number; status: string } | null;
  national_material?: {
    national_code: string;
    standard_description: string;
    approval_status: string;
  } | null;
}

export interface Match {
  id?: number;
  material_a_id: number;
  material_b_id: number;
  final_score: number;
  semantic_score: number;
  attribute_score: number;
  specification_score: number;
  category_score: number;
  unit_score: number;
  procurement_score: number;
  classification: string;
  explanation: string;
  matching_features: Record<string, unknown>;
  conflicting_features: Record<string, { a: string; b: string }>;
  status?: string;
}

export interface ReviewItem {
  review_id: number;
  match: Match;
  material_a: Material;
  material_b: Material;
  recommendation: string;
  procurement_context?: {
    material_a_records: number;
    material_b_records: number;
  };
}

export interface NationalMaterial {
  id: number;
  national_code: string;
  standard_description: string;
  category?: string;
  material?: string;
  grade?: string;
  technical_attributes: Fingerprint;
  version: number;
  approval_status: string;
  cpse_mappings?: number;
}

export interface DashboardData {
  total_cpse_materials: number;
  total_national_materials: number;
  duplicates_detected: number;
  pending_reviews: number;
  approved_mappings: number;
  unmapped_materials: number;
  mapping_coverage: number;
  materials_by_cpse: Record<string, number>;
  materials_by_category: Record<string, number>;
  duplicate_clusters: number;
  confidence_distribution: {
    strong: number;
    review: number;
    investigate: number;
  };
}
