export type UserRole = 'user' | 'admin' | 'partner' | 'institution';
export type Language = 'en' | 'sw';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  language: Language;
  total_points: number;
  lifetime_points: number;
  current_streak: number;
  longest_streak: number;
  last_disposal_date: string | null;
  partner_id: string | null;
  institution_id: string | null;
  suspended: boolean;
  suspended_reason: string | null;
  role_request_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface WasteCategory {
  id: string;
  name: string;
  name_sw: string | null;
  description: string | null;
  description_sw: string | null;
  icon: string;
  color: string;
  points_per_unit: number;
  co2_saved_per_unit: number;
  is_active: boolean;
  created_at: string;
}

export interface CollectionPartner {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  is_active: boolean;
  total_collections: number;
  created_at: string;
}

export interface Bin {
  id: string;
  qr_code: string;
  location_name: string;
  location_description: string | null;
  latitude: number | null;
  longitude: number | null;
  waste_category_id: string | null;
  partner_id: string | null;
  institution_id: string | null;
  area_type: 'campus' | 'estate' | 'community' | 'commercial' | 'institutional' | null;
  area_name: string | null;
  is_active: boolean;
  total_collections: number;
  last_collection_at: string | null;
  created_at: string;
  waste_categories?: WasteCategory;
  collection_partners?: CollectionPartner;
}

export interface Disposal {
  id: string;
  user_id: string;
  bin_id: string;
  waste_category_id: string;
  points_earned: number;
  is_flagged: boolean;
  flag_reason: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  bins?: Bin;
  waste_categories?: WasteCategory;
  profiles?: Profile;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  disposal_id: string | null;
  type: 'earn' | 'redeem' | 'bonus' | 'adjust' | 'expire';
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  partner_id: string | null;
  points_cost: number;
  category: 'coupon' | 'discount' | 'merchandise' | 'cash' | 'partner';
  stock_count: number;
  redemption_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  collection_partners?: CollectionPartner;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  redemption_code: string;
  status: 'pending' | 'fulfilled' | 'expired' | 'cancelled';
  created_at: string;
  fulfilled_at: string | null;
  rewards?: Reward;
}

export interface Achievement {
  id: string;
  name: string;
  name_sw: string | null;
  description: string | null;
  description_sw: string | null;
  icon: string;
  color: string;
  type: 'streak' | 'quantity' | 'category' | 'community' | 'special';
  threshold: number;
  bonus_points: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievements?: Achievement;
}

export interface Challenge {
  id: string;
  title: string;
  title_sw: string | null;
  description: string | null;
  description_sw: string | null;
  waste_category_id: string | null;
  target_count: number;
  reward_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  participant_count: number;
  created_at: string;
  waste_categories?: WasteCategory;
}

export interface FraudFlag {
  id: string;
  user_id: string;
  disposal_id: string | null;
  flag_type: 'rate_limit' | 'location' | 'pattern' | 'manual';
  severity: 'low' | 'medium' | 'high';
  description: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface CategoryLimit {
  id: string;
  waste_category_id: string | null;
  max_per_day: number;
  max_points_per_day: number;
  is_active: boolean;
}

export interface CollectionRequest {
  id: string;
  bin_id: string;
  partner_id: string;
  requested_by: string | null;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  requested_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  bins?: Bin;
}

export interface RecoveryReport {
  id: string;
  partner_id: string;
  collection_request_id: string | null;
  waste_category_id: string | null;
  quantity: number;
  weight_kg: number | null;
  items_recovered: number;
  items_recycled: number;
  co2_saved_kg: number;
  notes: string | null;
  report_date: string;
  created_at: string;
  facilitation_fee_kes: number;
  fee_status: 'pending' | 'paid';
}

export type InstitutionType = 'university' | 'school' | 'hospital' | 'estate' | 'municipality' | 'commercial' | 'other';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';
export type SubscriptionPlan = 'pilot' | 'starter' | 'pro' | 'enterprise';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  description: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan;
  subscription_started_at: string;
  subscription_renews_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SponsoredCampaign {
  id: string;
  sponsor_name: string;
  sponsor_logo_url: string | null;
  campaign_title: string;
  description: string | null;
  challenge_id: string | null;
  institution_id: string | null;
  reward_pool_points: number;
  funding_amount_kes: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  institution_id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'past_due' | 'cancelled' | 'trial';
  billing_cycle: 'monthly' | 'quarterly' | 'annually';
  amount_kes: number;
  started_at: string;
  renews_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: 'institution' | 'partner';
  institution_id: string | null;
  partner_name: string | null;
  partner_description: string | null;
  partner_contact_email: string | null;
  partner_contact_phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  institutions?: Institution;
}

export type Page =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'dispose'
  | 'rewards'
  | 'leaderboard'
  | 'history'
  | 'profile'
  | 'admin'
  | 'partner'
  | 'institution';
