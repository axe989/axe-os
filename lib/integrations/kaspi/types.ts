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

export interface KaspiDeliveryInfo {
  express?: boolean;
  waybill?: string;
  waybillNumber?: string;
  firstMileCourier?: string | null;
  returnedToWarehouse?: boolean;
  /**
   * Actual epoch-ms timestamp the parcel was handed to the courier.
   * null/absent until it really happens - do not confuse with
   * courierTransmissionPlanningDate, which is only a schedule.
   */
  courierTransmissionDate?: number | null;
  courierTransmissionPlanningDate?: number | null;
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
  assembled?: boolean;
  kaspiDelivery?: KaspiDeliveryInfo;
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

export interface KaspiOrderEntryAttributes {
  quantity: number;
  totalPrice: number;
  basePrice?: number;
}

export interface KaspiOrderEntry {
  type: "orderentries";
  id: string;
  attributes: KaspiOrderEntryAttributes;
  relationships?: {
    product?: {
      data?: {
        type: string;
        id: string;
      };
    };
  };
}

export interface KaspiOrderEntriesResponse {
  data: KaspiOrderEntry[];
  included?: unknown[];
}

export interface KaspiMasterProductAttributes {
  code?: string;
  name: string;
  category?: string;
}

export interface KaspiMasterProductResponse {
  data: {
    type: "masterproducts";
    id: string;
    attributes: KaspiMasterProductAttributes;
  };
}