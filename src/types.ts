export type MoveType = 'apartment' | 'office' | 'delivery';
export type TruckAccess = 'easy' | 'medium' | 'difficult' | 'no_parking';
export type CraneNeeded = 'yes' | 'no' | 'dont_know';
export type MoveStatus = 'new' | 'bidding' | 'bid_approved' | 'approved_for_driver' | 'completed' | 'cancelled';
export type PaymentStatus = 'net_30' | 'paid_deposit' | 'paid_full' | 'pending_payment';

export interface ElevatorDetails {
  sofaFits: boolean;
  fridgeFits: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'furniture' | 'appliances' | 'boxes' | 'other';
  quantity: number;
  icon?: string;
}

export interface DriverBid {
  id: string;
  driverName: string;
  driverPhone: string;
  bidAmount: number;
  estimatedDuration: string; // e.g. "4-5 שעות"
  notes?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AIAnalysis {
  estimatedPriceRange: string;
  difficultyScore: number; // 1-10
  recommendations: string[];
  summary: string;
}

export interface DeliveryNote {
  signedBy: string;
  signatureDataUrl: string;
  signedAt: string;
  checklistResults: { itemId: string; name: string; verified: boolean }[];
  missingNotes?: string;
  feedbackRating?: number;
  feedbackText?: string;
  cargoPhotos?: { url: string; label: string }[];
}

export interface MoveRequest {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  companyName?: string;
  originAddress: string;
  destAddress: string;
  moveDate: string;
  moveTime: string;
  moveType: MoveType;
  floor: number;
  hasElevator: boolean;
  elevatorDetails: ElevatorDetails;
  truckAccess: TruckAccess;
  craneNeeded: CraneNeeded;
  items: InventoryItem[];
  notes?: string;
  images: string[]; // Base64 data strings
  createdAt: string;
  status: MoveStatus;
  paymentStatus: PaymentStatus;
  clientApprovedForBilling: boolean; // Security check for release
  isPaymentLocked?: boolean;
  driverBids: DriverBid[];
  finalApprovedBidId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverTruck?: string;
  assignedDriverPlate?: string;
  adminReviewTicketId?: string;
  adminReviewTicketResolved?: boolean;
  notificationsLog?: {
    id: string;
    timestamp: string;
    type: 'whatsapp' | 'email' | 'system';
    recipient: string;
    title: string;
    message: string;
    success: boolean;
  }[];
  aiAnalysis?: AIAnalysis;
  deliveryNote?: DeliveryNote;
}

export interface CRMLead {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  companyName?: string;
  notes?: string;
  createdAt: string;
}

// Available catalog items for the smart quote form
export const CATALOG_ITEMS: Omit<InventoryItem, 'quantity'>[] = [
  // Furniture
  { id: 'sofa_3', name: 'ספה 3 מושבים', category: 'furniture' },
  { id: 'sofa_2', name: 'ספה 2 מושבים', category: 'furniture' },
  { id: 'armchair', name: 'כורסה בודדת', category: 'furniture' },
  { id: 'dining_table', name: 'שולחן אוכל + כיסאות', category: 'furniture' },
  { id: 'double_bed', name: 'מיטה זוגית + מזרן', category: 'furniture' },
  { id: 'single_bed', name: 'מיטת יחיד + מזרן', category: 'furniture' },
  { id: 'wardrobe_big', name: 'ארון בגדים גדול (4+ דלתות)', category: 'furniture' },
  { id: 'wardrobe_small', name: 'ארון בגדים קטן (2 דלתות)', category: 'furniture' },
  { id: 'tv_stand', name: 'מזנון טלוויזיה', category: 'furniture' },
  { id: 'desk', name: 'שולחן כתיבה / עבודה', category: 'furniture' },

  // Appliances
  { id: 'fridge_big', name: 'מקרר גדול', category: 'appliances' },
  { id: 'fridge_small', name: 'מקרר קטן', category: 'appliances' },
  { id: 'washing_machine', name: 'מכונת כביסה', category: 'appliances' },
  { id: 'dryer', name: 'מייבש כביסה', category: 'appliances' },
  { id: 'dishwasher', name: 'מדיח כלים', category: 'appliances' },
  { id: 'oven', name: 'תנור אפייה', category: 'appliances' },
  { id: 'tv', name: 'טלוויזיה (מעל 55 אינץ)', category: 'appliances' },

  // Boxes and Packing
  { id: 'box_standard', name: 'ארגז קרטון סטנדרטי (בגדים/ספרים)', category: 'boxes' },
  { id: 'box_large', name: 'ארגז קרטון גדול (חפצים שבירים)', category: 'boxes' },
  { id: 'bag_huge', name: 'שק ענק / מזוודה', category: 'boxes' },
];
