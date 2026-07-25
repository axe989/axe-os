"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderFinanceEditorProps = {
  orderId: string;
  purchased: boolean;
  supplier: string | null;
  purchasePrice: number | string | null;
  logisticsCost: number | string | null;
  advertisingCost: number | string | null;
};

type UpdateResult = {
  success: boolean;
  error?: string;
};

function fieldValue(value: number | string | null) {
  return value === null || value === undefined ? "" : String(value);
}

export default function OrderFinanceEditor({
  orderId,
  purchased: initialPurchased,
  supplier: initialSupplier,
  purchasePrice: initialPurchasePrice,
  logisticsCost: initialLogisticsCost,
  advertisingCost: initialAdvertisingCost,
}: OrderFinanceEditorProps) {
  const router = useRouter();

  const [purchased, setPurchased] = useState(initialPurchased);
  const [supplier, setSupplier] = useState(initialSupplier ?? "");
  const [purchasePrice, setPurchasePrice] = useState(
    fieldValue(initialPurchasePrice),
  );
  const [logisticsCost, setLogisticsCost] = useState(
    fieldValue(initialLogisticsCost),
  );
  const [advertisingCost, setAdvertisingCost] = useState(
    fieldValue(initialAdvertisingCost),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          purchased,
          supplier,
          purchase_price:
            purchasePrice === "" ? 0 : Number(purchasePrice),
          logistics_cost:
            logisticsCost === "" ? 0 : Number(logisticsCost),
          advertising_cost:
            advertisingCost === "" ? 0 : Number(advertisingCost),
        }),
      });

      const result = (await response.json()) as UpdateResult;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Ошибка сохранения");
      }

      setMessage("Сохранено");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка сохранения",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="finance-editor">
      <label className="purchase-check">
        <input
          type="checkbox"
          checked={purchased}
          onChange={(event) => setPurchased(event.target.checked)}
        />
        <span>{purchased ? "Закуплен" : "Не закуплен"}</span>
      </label>

      <input
        className="order-input supplier-input"
        type="text"
        value={supplier}
        onChange={(event) => setSupplier(event.target.value)}
        placeholder="Поставщик"
      />

      <div className="finance-fields">
        <label>
          <span>Закупка</span>
          <input
            className="order-input"
            type="number"
            min="0"
            step="1"
            value={purchasePrice}
            onChange={(event) => setPurchasePrice(event.target.value)}
            placeholder="0"
          />
        </label>

        <label>
          <span>Логистика</span>
          <input
            className="order-input"
            type="number"
            min="0"
            step="1"
            value={logisticsCost}
            onChange={(event) => setLogisticsCost(event.target.value)}
            placeholder="0"
          />
        </label>

        <label>
          <span>Реклама</span>
          <input
            className="order-input"
            type="number"
            min="0"
            step="1"
            value={advertisingCost}
            onChange={(event) => setAdvertisingCost(event.target.value)}
            placeholder="0"
          />
        </label>
      </div>

      <div className="finance-actions">
        <button
          type="button"
          className="save-order-button"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>

        {message ? (
          <span
            className={
              message === "Сохранено"
                ? "save-message success"
                : "save-message error"
            }
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
