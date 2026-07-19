const KASPI_API_URL = "https://kaspi.kz/shop/api/v2";

export async function kaspiRequest<T>(
  path: string,
  params?: URLSearchParams,
): Promise<T> {
  const token = process.env.KASPI_API_TOKEN;

  if (!token) {
    throw new Error(
      "KASPI_API_TOKEN не найден. Проверь файл .env.local",
    );
  }

  const url = new URL(`${KASPI_API_URL}${path}`);

  if (params) {
    url.search = params.toString();
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "X-Auth-Token": token,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Ошибка Kaspi API ${response.status}: ${responseText}`,
    );
  }

  return response.json() as Promise<T>;
}