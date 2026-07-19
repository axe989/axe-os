export type KaspiOrderState =
  | "NEW"
  | "SIGN_REQUIRED"
  | "PICKUP"
  | "DELIVERY"
  | "KASPI_DELIVERY"
  | "ARCHIVE";

export interface KaspiPerson {
  firstName?: string;
  lastName?: string;
  cellPhone?: string;
}

export interface KaspiOrderAttributes {
  code: string;
  totalPrice: number;
  state: KaspiOrderState;
  status?: string;
  creationDate: number;
  approvedByBankDate?: number;
  plannedDeliveryDate?: number;
  paymentMode?: string;
  deliveryMode?: string;
  deliveryCost?: number;
  deliveryCostForSeller?: number;
  isKaspiDelivery?: boolean;
  signatureRequired?: boolean;
  customer?: KaspiPerson;
  recipient?: KaspiPerson;
}

export interface KaspiOrder {
  type: "orders";
  id: string;
  attributes: KaspiOrderAttributes;
}

export interface KaspiOrdersResponse {
  data: KaspiOrder[];
  included?: unknown[];
  meta?: {
    pageCount?: number;
    totalCount?: number;
  };
}