import { kaspiRequest } from "./client";
import type {
  KaspiOrder,
  KaspiOrdersResponse,
  KaspiOrderState,
} from "./types";

export interface GetKaspiOrdersOptions {
  page?: number;
  pageSize?: number;
  state: KaspiOrderState;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function getKaspiOrders(
  options: GetKaspiOrdersOptions,
): Promise<KaspiOrdersResponse> {
  const {
    page = 0,
    pageSize = 100,
    state,
    dateFrom,
    dateTo,
  } = options;

  const params = new URLSearchParams();

  params.set("page[number]", String(page));
  params.set("page[size]", String(Math.min(pageSize, 100)));
  params.set("filter[orders][state]", state);
  params.set("include[orders]", "user");

  if (dateFrom) {
    params.set(
      "filter[orders][creationDate][$ge]",
      String(dateFrom.getTime()),
    );
  }

  if (dateTo) {
    params.set(
      "filter[orders][creationDate][$le]",
      String(dateTo.getTime()),
    );
  }

  return kaspiRequest<KaspiOrdersResponse>("/orders", params);
}

export async function getAllKaspiOrdersByState(
  state: KaspiOrderState,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<KaspiOrder[]> {
  const firstPage = await getKaspiOrders({
    page: 0,
    pageSize: 100,
    state,
    dateFrom,
    dateTo,
  });

  const orders = [...firstPage.data];
  const pageCount = firstPage.meta?.pageCount ?? 1;

  for (let page = 1; page < pageCount; page += 1) {
    const response = await getKaspiOrders({
      page,
      pageSize: 100,
      state,
      dateFrom,
      dateTo,
    });

    orders.push(...response.data);
  }

  return orders;
}